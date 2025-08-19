// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {SelfVerificationRoot} from "@selfxyz/contracts/contracts/abstract/SelfVerificationRoot.sol";
import {ISelfVerificationRoot} from "@selfxyz/contracts/contracts/interfaces/ISelfVerificationRoot.sol";
import {IIdentityVerificationHubV2} from "@selfxyz/contracts/contracts/interfaces/IIdentityVerificationHubV2.sol";
import {SelfStructs} from "@selfxyz/contracts/contracts/libraries/SelfStructs.sol";
import {AttestationId} from "@selfxyz/contracts/contracts/constants/AttestationId.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "./LoanAgreement.sol";
import "./CollateralVault.sol";
import "./CreditScore.sol";
import "./PriceOracle.sol";
import "./MentoIntegration.sol";

contract CeloLend is SelfVerificationRoot, Ownable, ReentrancyGuard {
    // Configuration ID for Self Protocol verification
    bytes32 public configId;

    // Platform contracts
    CollateralVault public collateralVault;
    CreditScore public creditScore;
    PriceOracle public priceOracle;
    MentoIntegration public mentoIntegration;

    // Platform settings
    uint256 public platformFeeRate = 100; // 1% (basis points) - reduced for competitiveness
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public minLoanAmount = 10 * 1e18; // 10 CELO minimum
    uint256 public maxLoanAmount = 10000 * 1e18; // 10,000 CELO maximum
    uint256 public minCollateralRatio = 15000; // 150% minimum collateral ratio

    // Fee collection
    address public feeCollector;
    uint256 public totalFeesCollected;

    // Supported tokens
    mapping(address => bool) public supportedTokens;
    address[] public supportedTokensList;

    // Loan tracking
    uint256 public nextLoanId = 1;
    mapping(uint256 => address) public loanContracts; // loanId => LoanAgreement address
    mapping(address => uint256[]) public userLoans; // user => loan IDs array
    mapping(address => uint256[]) public lenderLoans; // lender => loan IDs array

    // Loan requests (before funding)
    struct LoanRequest {
        uint256 id;
        address borrower;
        uint256 amount;
        address tokenAddress;
        uint256 interestRate; // Annual rate in basis points (e.g., 1000 = 10%)
        uint256 duration; // Duration in seconds
        uint256 collateralAmount;
        address collateralToken;
        bool isActive;
        bool isFunded;
        uint256 createdAt;
    }

    mapping(uint256 => LoanRequest) public loanRequests;
    uint256[] public activeLoanRequests;

    // Verification tracking
    mapping(address => bytes32) public userIdentifiers; // wallet => Self identifier
    mapping(bytes32 => address) public identifierToWallet; // Self identifier => wallet

    // Events
    event UserVerified(
        address indexed user,
        bytes32 userIdentifier,
        string nationality
    );
    event LoanRequestCreated(
        uint256 indexed loanId,
        address indexed borrower,
        uint256 amount
    );
    event LoanFunded(
        uint256 indexed loanId,
        address indexed lender,
        address loanContract
    );
    event LoanRequestCancelled(uint256 indexed loanId);
    event PlatformFeeUpdated(uint256 newFeeRate);
    event TokenSupported(address indexed token, bool supported);

    constructor(
        address _identityVerificationHubV2,
        uint256 _scope,
        bytes32 _configId,
        address payable _collateralVault,
        address _creditScore,
        address _priceOracle,
        address _mentoIntegration
    )
        SelfVerificationRoot(_identityVerificationHubV2, _scope)
        Ownable(msg.sender)
    {
        configId = _configId;
        collateralVault = CollateralVault(_collateralVault);
        creditScore = CreditScore(_creditScore);
        priceOracle = PriceOracle(_priceOracle);
        mentoIntegration = MentoIntegration(_mentoIntegration);
        feeCollector = msg.sender; // Owner initially collects fees

        // Auto-configure Mento stablecoins as supported tokens
        _initializeMentoTokens();
    }

    // Required: Override to provide configId for verification
    function getConfigId(
        bytes32 destinationChainId,
        bytes32 userIdentifier,
        bytes memory userDefinedData
    ) public view override returns (bytes32) {
        return configId;
    }

    // Override to handle successful Self Protocol verification
    function customVerificationHook(
        ISelfVerificationRoot.GenericDiscloseOutputV2 memory output,
        bytes memory userData
    ) internal virtual override {
        address userWallet = msg.sender;
        bytes32 userIdentifier = bytes32(output.userIdentifier);

        // Check if user is already verified
        require(
            userIdentifiers[userWallet] == bytes32(0),
            "Wallet already verified"
        );

        // Check if this user identifier is already mapped to another wallet
        require(
            identifierToWallet[userIdentifier] == address(0),
            "User identifier already mapped to another wallet"
        );

        // Store the mapping between wallet and Self identifier
        userIdentifiers[userWallet] = userIdentifier;
        identifierToWallet[userIdentifier] = userWallet;

        // Initialize credit score for new verified users (only if not already initialized)
        try creditScore.initializeUser(userWallet) {
            // Successfully initialized
        } catch Error(string memory reason) {
            if (
                keccak256(bytes(reason)) !=
                keccak256(bytes("User already initialized"))
            ) {
                revert(reason);
            }
            // User already initialized, that's fine
        }

        emit UserVerified(userWallet, userIdentifier, output.nationality);
    }

    modifier onlyVerifiedUser() {
        require(
            isUserVerified(msg.sender),
            "User not verified with Self Protocol"
        );
        _;
    }

    // Create loan request
    function createLoanRequest(
        uint256 amount,
        address tokenAddress,
        uint256 interestRate,
        uint256 duration,
        uint256 collateralAmount,
        address collateralToken
    ) external payable onlyVerifiedUser nonReentrant {
        require(
            amount >= minLoanAmount && amount <= maxLoanAmount,
            "Invalid loan amount"
        );
        require(supportedTokens[tokenAddress], "Token not supported");
        require(
            supportedTokens[collateralToken],
            "Collateral token not supported"
        );
        require(duration > 0, "Invalid duration");
        require(collateralAmount > 0, "Collateral required");

        // Validate collateral ratio using price oracle
        require(
            priceOracle.isCollateralSufficient(
                collateralToken,
                collateralAmount,
                tokenAddress,
                amount,
                minCollateralRatio
            ),
            "Insufficient collateral ratio"
        );

        uint256 loanId = nextLoanId++;

        // Transfer collateral to vault
        if (collateralToken == address(0)) {
            // Native token (CELO) - check msg.value
            require(
                msg.value == collateralAmount,
                "Incorrect native token amount"
            );
            // Transfer native token to vault
            (bool success, ) = address(collateralVault).call{value: msg.value}(
                ""
            );
            require(success, "Native token transfer failed");
        } else {
            // ERC20 token
            IERC20(collateralToken).transferFrom(
                msg.sender,
                payable(address(collateralVault)),
                collateralAmount
            );
        }
        collateralVault.lockCollateral(
            msg.sender,
            collateralToken,
            collateralAmount,
            loanId
        );

        // Create loan request
        loanRequests[loanId] = LoanRequest({
            id: loanId,
            borrower: msg.sender,
            amount: amount,
            tokenAddress: tokenAddress,
            interestRate: interestRate,
            duration: duration,
            collateralAmount: collateralAmount,
            collateralToken: collateralToken,
            isActive: true,
            isFunded: false,
            createdAt: block.timestamp
        });

        activeLoanRequests.push(loanId);
        userLoans[msg.sender].push(loanId);

        emit LoanRequestCreated(loanId, msg.sender, amount);
    }

    // Fund a loan request (lender action)
    function fundLoan(
        uint256 loanId
    ) external payable onlyVerifiedUser nonReentrant {
        LoanRequest storage request = loanRequests[loanId];
        require(
            request.isActive && !request.isFunded,
            "Loan request not available"
        );
        require(request.borrower != msg.sender, "Cannot fund own loan");

        // Calculate platform fee
        uint256 platformFee = (request.amount * platformFeeRate) / BASIS_POINTS;
        uint256 netAmount = request.amount - platformFee;

        // Transfer loan amount + fee from lender
        if (request.tokenAddress == address(0)) {
            // Native token loan
            require(
                msg.value == request.amount,
                "Incorrect native token amount"
            );
        } else {
            // ERC20 token loan
            IERC20(request.tokenAddress).transferFrom(
                msg.sender,
                address(this),
                request.amount
            );
        }

        // Collect platform fee
        if (platformFee > 0) {
            if (request.tokenAddress == address(0)) {
                // Native token fee
                (bool success, ) = feeCollector.call{value: platformFee}("");
                require(success, "Native token fee transfer failed");
            } else {
                // ERC20 token fee
                IERC20(request.tokenAddress).transfer(
                    feeCollector,
                    platformFee
                );
            }
            totalFeesCollected += platformFee;
        }

        // Create loan agreement contract
        LoanAgreement loanContract = new LoanAgreement(
            request.borrower,
            msg.sender,
            netAmount, // Net amount after fees
            request.tokenAddress,
            request.interestRate,
            request.duration,
            request.collateralAmount,
            request.collateralToken,
            payable(address(collateralVault)),
            address(creditScore),
            address(priceOracle)
        );

        // Store loan contract
        loanContracts[loanId] = address(loanContract);
        lenderLoans[msg.sender].push(loanId);

        // Transfer net funds to loan contract
        if (request.tokenAddress == address(0)) {
            // Native token transfer to loan contract
            (bool success, ) = address(loanContract).call{value: netAmount}("");
            require(success, "Native token transfer to loan failed");
        } else {
            // ERC20 token transfer
            IERC20(request.tokenAddress).transfer(
                address(loanContract),
                netAmount
            );
        }

        // Update request status
        request.isFunded = true;
        request.isActive = false;

        // Remove from active requests
        _removeFromActiveLoanRequests(loanId);

        emit LoanFunded(loanId, msg.sender, address(loanContract));
    }

    // Cancel loan request
    function cancelLoanRequest(uint256 loanId) external nonReentrant {
        LoanRequest storage request = loanRequests[loanId];
        require(request.borrower == msg.sender, "Not your loan request");
        require(
            request.isActive && !request.isFunded,
            "Cannot cancel this loan"
        );

        // Release collateral
        collateralVault.releaseCollateral(
            msg.sender,
            request.collateralToken,
            request.collateralAmount,
            loanId
        );

        // Update request status
        request.isActive = false;

        // Remove from active requests
        _removeFromActiveLoanRequests(loanId);

        emit LoanRequestCancelled(loanId);
    }

    // GETTER FUNCTIONS FOR FRONTEND

    function isUserVerified(address user) public view returns (bool) {
        return userIdentifiers[user] != bytes32(0);
    }

    function getUserIdentifier(address user) external view returns (bytes32) {
        return userIdentifiers[user];
    }

    function getWalletFromIdentifier(
        bytes32 identifier
    ) external view returns (address) {
        return identifierToWallet[identifier];
    }

    function getLoanRequest(
        uint256 loanId
    ) external view returns (LoanRequest memory) {
        return loanRequests[loanId];
    }

    function getActiveLoanRequests() external view returns (uint256[] memory) {
        return activeLoanRequests;
    }

    function getActiveLoanRequestsWithDetails()
        external
        view
        returns (LoanRequest[] memory)
    {
        LoanRequest[] memory requests = new LoanRequest[](
            activeLoanRequests.length
        );
        for (uint i = 0; i < activeLoanRequests.length; i++) {
            requests[i] = loanRequests[activeLoanRequests[i]];
        }
        return requests;
    }

    function getUserLoans(
        address user
    ) external view returns (uint256[] memory) {
        return userLoans[user];
    }

    function getLenderLoans(
        address lender
    ) external view returns (uint256[] memory) {
        return lenderLoans[lender];
    }

    function getUserLoansWithDetails(
        address user
    ) external view returns (LoanRequest[] memory) {
        uint256[] memory loanIds = userLoans[user];
        LoanRequest[] memory loans = new LoanRequest[](loanIds.length);
        for (uint i = 0; i < loanIds.length; i++) {
            loans[i] = loanRequests[loanIds[i]];
        }
        return loans;
    }

    function getLoanContract(uint256 loanId) external view returns (address) {
        return loanContracts[loanId];
    }

    function getSupportedTokens() external view returns (address[] memory) {
        return supportedTokensList;
    }

    function getPlatformStats()
        external
        view
        returns (
            uint256 totalLoans,
            uint256 activeRequests,
            uint256 totalVerifiedUsers,
            uint256 platformFee,
            uint256 feesCollected,
            address feeCollectorAddress
        )
    {
        totalLoans = nextLoanId - 1;
        activeRequests = activeLoanRequests.length;
        totalVerifiedUsers = _getTotalVerifiedUsers();
        platformFee = platformFeeRate;
        feesCollected = totalFeesCollected;
        feeCollectorAddress = feeCollector;
    }

    // ADMIN FUNCTIONS

    function setConfigId(bytes32 _configId) external onlyOwner {
        configId = _configId;
    }

    function setScope(uint256 _scope) external onlyOwner {
        _setScope(_scope);
    }

    function setPlatformFeeRate(uint256 _feeRate) external onlyOwner {
        require(_feeRate <= 1000, "Fee too high"); // Max 10%
        platformFeeRate = _feeRate;
        emit PlatformFeeUpdated(_feeRate);
    }

    function setSupportedToken(
        address token,
        bool supported
    ) external onlyOwner {
        if (supported && !supportedTokens[token]) {
            supportedTokensList.push(token);
        } else if (!supported && supportedTokens[token]) {
            _removeFromSupportedTokensList(token);
        }
        supportedTokens[token] = supported;
        emit TokenSupported(token, supported);
    }

    function setLoanLimits(
        uint256 _minAmount,
        uint256 _maxAmount
    ) external onlyOwner {
        require(_minAmount < _maxAmount, "Invalid limits");
        minLoanAmount = _minAmount;
        maxLoanAmount = _maxAmount;
    }

    function setFeeCollector(address _feeCollector) external onlyOwner {
        require(_feeCollector != address(0), "Invalid fee collector");
        feeCollector = _feeCollector;
    }

    function setMinCollateralRatio(uint256 _minRatio) external onlyOwner {
        require(_minRatio >= 10000, "Ratio must be at least 100%"); // Minimum 100%
        require(_minRatio <= 30000, "Ratio too high"); // Maximum 300%
        minCollateralRatio = _minRatio;
    }

    function setPriceOracle(address _priceOracle) external onlyOwner {
        require(_priceOracle != address(0), "Invalid oracle address");
        priceOracle = PriceOracle(_priceOracle);
    }

    function setMentoIntegration(address _mentoIntegration) external onlyOwner {
        require(
            _mentoIntegration != address(0),
            "Invalid MentoIntegration address"
        );
        mentoIntegration = MentoIntegration(_mentoIntegration);

        // Re-initialize Mento tokens with new integration
        _initializeMentoTokens();
    }

    /**
     * @dev Initialize Mento stablecoins as supported tokens
     */
    function _initializeMentoTokens() internal {
        if (address(mentoIntegration) != address(0)) {
            (
                address[] memory tokens,
                string[] memory symbols,

            ) = mentoIntegration.getSupportedStablecoins();

            for (uint i = 0; i < tokens.length; i++) {
                if (!supportedTokens[tokens[i]]) {
                    supportedTokensList.push(tokens[i]);
                    supportedTokens[tokens[i]] = true;
                    emit TokenSupported(tokens[i], true);
                }
            }
        }
    }

    /**
     * @dev Check if a token is a Mento stablecoin
     */
    function isMentoStablecoin(address token) external view returns (bool) {
        if (address(mentoIntegration) == address(0)) {
            return false;
        }
        return mentoIntegration.isStablecoin(token);
    }

    /**
     * @dev Get market data for off-chain interest rate calculation
     * @dev Provides market data to support your off-chain algorithm
     */
    function getMarketDataForRating(
        address loanToken,
        address collateralToken,
        uint256 loanAmount,
        uint256 collateralAmount
    )
        external
        view
        returns (
            uint256 collateralRatio,
            uint256 loanTokenVolatility,
            uint256 collateralVolatility,
            bool isLoanTokenStablecoin,
            bool isCollateralStablecoin,
            uint256 platformUtilization
        )
    {
        // Calculate collateral ratio
        collateralRatio = priceOracle.calculateCollateralRatio(
            collateralToken,
            collateralAmount,
            loanToken,
            loanAmount
        );

        // Get volatility data (30-day window)
        loanTokenVolatility = priceOracle.getPriceVolatility(
            loanToken,
            30 days
        );
        collateralVolatility = priceOracle.getPriceVolatility(
            collateralToken,
            30 days
        );

        // Check if tokens are stablecoins
        isLoanTokenStablecoin =
            address(mentoIntegration) != address(0) &&
            mentoIntegration.isStablecoin(loanToken);
        isCollateralStablecoin =
            address(mentoIntegration) != address(0) &&
            mentoIntegration.isStablecoin(collateralToken);

        // Platform utilization (simplified calculation)
        platformUtilization = activeLoanRequests.length > 0
            ? (nextLoanId * 100) / (activeLoanRequests.length + nextLoanId)
            : 50;

        return (
            collateralRatio,
            loanTokenVolatility,
            collateralVolatility,
            isLoanTokenStablecoin,
            isCollateralStablecoin,
            platformUtilization
        );
    }

    // COMPREHENSIVE GETTER FUNCTIONS FOR FRONTEND (NO SUBGRAPH NEEDED)

    function getAllActiveRequests()
        external
        view
        returns (LoanRequest[] memory)
    {
        return this.getActiveLoanRequestsWithDetails();
    }

    function getAllUserData(
        address user
    )
        external
        view
        returns (
            bool isVerified,
            uint256 userCreditScore,
            uint256[] memory borrowedLoans,
            uint256[] memory lendedLoans,
            uint256[] memory collateralLoans
        )
    {
        isVerified = isUserVerified(user);
        userCreditScore = creditScore.getCreditScore(user);
        borrowedLoans = userLoans[user];
        lendedLoans = lenderLoans[user];
        collateralLoans = collateralVault.getUserCollateralLoans(user);
    }

    function getLoanFullDetails(
        uint256 loanId
    )
        external
        view
        returns (
            LoanRequest memory request,
            address loanContractAddress,
            bool isActive,
            bool isFunded
        )
    {
        request = loanRequests[loanId];
        loanContractAddress = loanContracts[loanId];
        isActive = request.isActive;
        isFunded = request.isFunded;
    }

    function getMarketOverview()
        external
        view
        returns (
            uint256 totalActiveRequests,
            uint256 totalFundedLoans,
            uint256 averageLoanSize,
            uint256 totalVolumeTraded,
            uint256 platformUtilization
        )
    {
        totalActiveRequests = activeLoanRequests.length;
        totalFundedLoans = nextLoanId > 1
            ? nextLoanId - 1 - totalActiveRequests
            : 0;

        // Calculate average loan size and total volume
        if (totalFundedLoans > 0) {
            uint256 totalVolume = 0;
            for (uint i = 1; i < nextLoanId; i++) {
                if (loanRequests[i].isFunded) {
                    totalVolume += loanRequests[i].amount;
                }
            }
            averageLoanSize = totalVolume / totalFundedLoans;
            totalVolumeTraded = totalVolume;
        }

        // Platform utilization (funded vs total requests)
        uint256 totalRequests = nextLoanId > 1 ? nextLoanId - 1 : 0;
        platformUtilization = totalRequests > 0
            ? (totalFundedLoans * 100) / totalRequests
            : 0;
    }

    function getTokenAnalytics(
        address token
    )
        external
        view
        returns (
            uint256 totalRequestsForToken,
            uint256 totalVolumeForToken,
            uint256 averageInterestRate,
            bool isSupported
        )
    {
        totalRequestsForToken = 0;
        totalVolumeForToken = 0;
        uint256 totalInterestSum = 0;

        for (uint i = 1; i < nextLoanId; i++) {
            LoanRequest memory req = loanRequests[i];
            if (req.tokenAddress == token) {
                totalRequestsForToken++;
                if (req.isFunded) {
                    totalVolumeForToken += req.amount;
                    totalInterestSum += req.interestRate;
                }
            }
        }

        averageInterestRate = totalRequestsForToken > 0
            ? totalInterestSum / totalRequestsForToken
            : 0;
        isSupported = supportedTokens[token];
    }

    // INTERNAL HELPER FUNCTIONS

    function _removeFromActiveLoanRequests(uint256 loanId) internal {
        for (uint i = 0; i < activeLoanRequests.length; i++) {
            if (activeLoanRequests[i] == loanId) {
                activeLoanRequests[i] = activeLoanRequests[
                    activeLoanRequests.length - 1
                ];
                activeLoanRequests.pop();
                break;
            }
        }
    }

    function _removeFromSupportedTokensList(address token) internal {
        for (uint i = 0; i < supportedTokensList.length; i++) {
            if (supportedTokensList[i] == token) {
                supportedTokensList[i] = supportedTokensList[
                    supportedTokensList.length - 1
                ];
                supportedTokensList.pop();
                break;
            }
        }
    }

    function _getTotalVerifiedUsers() internal view returns (uint256) {
        // Get verified users from credit score contract
        return creditScore.totalVerifiedUsers();
    }

    // Emergency functions
    function pause() external onlyOwner {
        // Implement pause functionality if needed
    }

    function unpause() external onlyOwner {
        // Implement unpause functionality if needed
    }

    // Receive function to accept native token transfers
    receive() external payable {
        // Allow contract to receive native tokens
    }
}
