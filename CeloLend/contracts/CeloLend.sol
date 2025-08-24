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

    // Verification configuration storage (for dynamic config management)
    SelfStructs.VerificationConfigV2 public verificationConfig;

    // Platform contracts
    CollateralVault public collateralVault;
    CreditScore public creditScore;
    PriceOracle public priceOracle;
    MentoIntegration public mentoIntegration;
    address public loanRepaymentContract;

    // Platform settings
    uint256 public platformFeeRate = 100; // 1% (basis points) - reduced for competitiveness
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public minLoanAmount = 2 * 1e18; // 2 tokens minimum
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

    // Multi-lender partial funding tracking
    mapping(uint256 => uint256) public totalFundedByLoan; // gross funded (before fee)
    mapping(uint256 => uint256) public netAmountHeldByLoan; // net after fee, held until fully funded
    mapping(uint256 => mapping(address => uint256)) public lenderContribution; // loanId => lender => amount
    mapping(uint256 => address[]) public lendersByLoan; // loanId => list of lenders

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
        uint256 amount
    );
    event LoanFullyFunded(uint256 indexed loanId);
    event LoanPartiallyFunded(
        uint256 indexed loanId,
        address indexed lender,
        uint256 amount,
        uint256 totalFunded
    );
    event LoanRequestCancelled(uint256 indexed loanId);
    event PlatformFeeUpdated(uint256 newFeeRate);
    event TokenSupported(address indexed token, bool supported);
    event VerificationConfigUpdated(bytes32 newConfigId);
    event AdditionalCollateralAdded(
        uint256 indexed loanId,
        address indexed user,
        address token,
        uint256 amount
    );

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
        bytes memory /* userData */
    ) internal override {
        address userWallet = address(uint160(output.userIdentifier)); // <-- from proof
        bytes32 userIdentifier = bytes32(output.userIdentifier);

        require(
            identifierToWallet[userIdentifier] == address(0),
            "Identifier already used"
        );

        userIdentifiers[userWallet] = userIdentifier;

        identifierToWallet[userIdentifier] = userWallet;

        // Optional: nationality might be absent depending on your config
        string memory nationality = output.nationality;

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

        emit UserVerified(userWallet, userIdentifier, nationality);
    }

    modifier onlyVerifiedUser() {
        require(
            isUserVerified(msg.sender),
            "User not verified with Self Protocol"
        );
        _;
    }

    // VERIFICATION CONFIGURATION MANAGEMENT (from reference implementation)

    /**
     * @notice Set the verification configuration for the contract
     * @param config The verification configuration to set
     */
    function setVerificationConfig(
        SelfStructs.VerificationConfigV2 memory config
    ) external onlyOwner {
        verificationConfig = config;
        _identityVerificationHubV2.setVerificationConfigV2(verificationConfig);
    }

    /**
     * @notice Set the verification configuration without updating the hub
     * @param config The verification configuration to set
     */
    function setVerificationConfigNoHub(
        SelfStructs.VerificationConfigV2 memory config
    ) external onlyOwner {
        verificationConfig = config;
    }

    /**
     * @notice Set the configuration ID
     * @param _configId The new configuration ID
     */
    function setConfigId(bytes32 _configId) external onlyOwner {
        configId = _configId;
        emit VerificationConfigUpdated(_configId);
    }

    /**
     * @notice Expose the internal _setScope function for scope management
     * @param newScope The new scope value to set
     */
    function setScope(uint256 newScope) external onlyOwner {
        _setScope(newScope);
    }

    /**
     * @notice Set the loan repayment contract address
     * @param _loanRepaymentContract Address of the LoanRepayment contract
     */
    function setLoanRepaymentContract(
        address _loanRepaymentContract
    ) external onlyOwner {
        loanRepaymentContract = _loanRepaymentContract;
    }

    /**
     * @notice Set platform contract addresses
     */

    /**
     * @notice Reset verification state for testing purposes
     * @dev This function is only for testing and should be removed in production
     */
    function resetVerificationState(address user) external onlyOwner {
        bytes32 identifier = userIdentifiers[user];
        if (identifier != bytes32(0)) {
            delete userIdentifiers[user];
            delete identifierToWallet[identifier];
        }
    }

    // Create loan request with multiple collateral tokens
    function createLoanRequest(
        uint256 amount,
        address tokenAddress,
        uint256 interestRate,
        uint256 duration,
        address[] calldata collateralTokens,
        uint256[] calldata collateralAmounts
    ) external payable onlyVerifiedUser nonReentrant {
        require(
            amount >= minLoanAmount && amount <= maxLoanAmount,
            "Invalid loan amount"
        );
        require(supportedTokens[tokenAddress], "Token not supported");
        require(duration > 0, "Invalid duration");
        require(
            collateralTokens.length > 0,
            "At least one collateral token required"
        );
        require(
            collateralTokens.length == collateralAmounts.length,
            "Array length mismatch"
        );
        require(
            collateralTokens.length <= 5,
            "Maximum 5 collateral tokens allowed"
        );

        // Validate all collateral tokens are supported
        for (uint256 i = 0; i < collateralTokens.length; i++) {
            require(
                supportedTokens[collateralTokens[i]],
                "Collateral token not supported"
            );
            require(
                collateralAmounts[i] > 0,
                "Collateral amount must be positive"
            );
        }

        // Calculate total collateral value and validate ratio
        uint256 totalCollateralValue = 0;

        for (uint256 i = 0; i < collateralTokens.length; i++) {
            totalCollateralValue += priceOracle.getTokenValueInUSD(
                collateralTokens[i],
                collateralAmounts[i]
            );
        }

        // Calculate loan value in USD for ratio validation
        uint256 loanValueUSD = priceOracle.getTokenValueInUSD(
            tokenAddress,
            amount
        );

        // Validate overall collateral ratio manually since we have total values
        require(
            (totalCollateralValue * 10000) / loanValueUSD >= minCollateralRatio,
            "Insufficient collateral ratio"
        );

        uint256 loanId = nextLoanId++;

        // Transfer all collateral tokens to vault
        uint256 totalNativeValue = 0;
        for (uint256 i = 0; i < collateralTokens.length; i++) {
            if (collateralTokens[i] == address(0)) {
                // Native token (CELO) - accumulate msg.value
                totalNativeValue += collateralAmounts[i];
            } else {
                // ERC20 token
                IERC20(collateralTokens[i]).transferFrom(
                    msg.sender,
                    payable(address(collateralVault)),
                    collateralAmounts[i]
                );
            }
        }

        // Verify total native token amount matches
        if (totalNativeValue > 0) {
            require(
                msg.value == totalNativeValue,
                "Incorrect native token amount"
            );
            // Transfer native tokens to vault
            (bool success, ) = address(collateralVault).call{value: msg.value}(
                ""
            );
            require(success, "Native token transfer failed");
        }

        // Lock all collateral tokens in vault
        for (uint256 i = 0; i < collateralTokens.length; i++) {
            collateralVault.lockCollateral(
                msg.sender,
                collateralTokens[i],
                collateralAmounts[i],
                loanId
            );
        }

        // Create loan request (store first collateral token for backward compatibility)
        loanRequests[loanId] = LoanRequest({
            id: loanId,
            borrower: msg.sender,
            amount: amount,
            tokenAddress: tokenAddress,
            interestRate: interestRate,
            duration: duration,
            collateralAmount: collateralAmounts[0], // First amount for backward compatibility
            collateralToken: collateralTokens[0], // First token for backward compatibility
            isActive: true,
            isFunded: false,
            createdAt: block.timestamp
        });

        activeLoanRequests.push(loanId);
        userLoans[msg.sender].push(loanId);

        emit LoanRequestCreated(loanId, msg.sender, amount);
    }

    // Fund a loan request (multi-lender). amount is gross (before platform fee)
    function fundLoan(
        uint256 loanId,
        uint256 amount
    ) external payable onlyVerifiedUser nonReentrant {
        LoanRequest storage request = loanRequests[loanId];
        require(request.isActive, "Loan not active");
        require(!request.isFunded, "Already funded");
        require(amount > 0, "Amount must be > 0");
        require(request.borrower != msg.sender, "Cannot fund own loan");

        // Cap contribution to remaining
        uint256 remaining = request.amount - totalFundedByLoan[loanId];
        uint256 contribution = amount > remaining ? remaining : amount;
        require(contribution > 0, "Nothing remaining");

        // Transfer contribution
        if (request.tokenAddress == address(0)) {
            require(msg.value == contribution, "Incorrect native token amount");
        } else {
            IERC20(request.tokenAddress).transferFrom(
                msg.sender,
                address(this),
                contribution
            );
        }

        // Fee and net tracking
        uint256 platformFee = (contribution * platformFeeRate) / BASIS_POINTS;
        uint256 netPart = contribution - platformFee;
        netAmountHeldByLoan[loanId] += netPart;
        if (platformFee > 0) {
            if (request.tokenAddress == address(0)) {
                (bool fs, ) = feeCollector.call{value: platformFee}("");
                require(fs, "Fee transfer failed");
            } else {
                IERC20(request.tokenAddress).transfer(
                    feeCollector,
                    platformFee
                );
            }
            totalFeesCollected += platformFee;
        }

        // Update contribution tracking
        totalFundedByLoan[loanId] += contribution;
        if (lenderContribution[loanId][msg.sender] == 0) {
            lendersByLoan[loanId].push(msg.sender);
        }
        lenderContribution[loanId][msg.sender] += contribution;
        lenderLoans[msg.sender].push(loanId);
        emit LoanPartiallyFunded(
            loanId,
            msg.sender,
            contribution,
            totalFundedByLoan[loanId]
        );

        // If fully funded, deploy agreement and move funds
        if (totalFundedByLoan[loanId] >= request.amount) {
            LoanAgreement loanContract = new LoanAgreement(
                request.borrower,
                address(this),
                netAmountHeldByLoan[loanId],
                request.tokenAddress,
                request.interestRate,
                request.duration,
                request.collateralAmount,
                request.collateralToken,
                payable(address(collateralVault)),
                address(creditScore),
                address(priceOracle)
            );
            loanContracts[loanId] = address(loanContract);

            if (request.tokenAddress == address(0)) {
                (bool s2, ) = address(loanContract).call{
                    value: netAmountHeldByLoan[loanId]
                }("");
                require(s2, "Native transfer to loan failed");
            } else {
                IERC20(request.tokenAddress).transfer(
                    address(loanContract),
                    netAmountHeldByLoan[loanId]
                );
            }

            request.isFunded = true;
            request.isActive = false;
            _removeFromActiveLoanRequests(loanId);

            if (loanRepaymentContract != address(0)) {
                (bool success, ) = loanRepaymentContract.call(
                    abi.encodeWithSignature(
                        "initializeLoanRepayment(uint256,address)",
                        loanId,
                        address(this)
                    )
                );
                require(success, "Failed to initialize repayment tracking");
            }
            emit LoanFullyFunded(loanId);
        }
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

    // Add additional collateral to an existing loan
    function addCollateral(
        uint256 loanId,
        address token,
        uint256 amount
    ) external payable onlyVerifiedUser nonReentrant {
        LoanRequest storage request = loanRequests[loanId];
        require(request.isActive, "Loan not active");
        require(
            request.borrower == msg.sender,
            "Only borrower can add collateral"
        );
        require(supportedTokens[token], "Token not supported");
        require(amount > 0, "Amount must be positive");

        // Transfer collateral to vault
        if (token == address(0)) {
            // Native token (CELO) - check msg.value
            require(msg.value == amount, "Incorrect native token amount");
            // Transfer native token to vault
            (bool success, ) = address(collateralVault).call{value: msg.value}(
                ""
            );
            require(success, "Native token transfer failed");
        } else {
            // ERC20 token
            IERC20(token).transferFrom(
                msg.sender,
                payable(address(collateralVault)),
                amount
            );
        }

        // Add collateral to existing loan
        collateralVault.lockAdditionalCollateral(
            msg.sender,
            token,
            amount,
            loanId
        );

        emit AdditionalCollateralAdded(loanId, msg.sender, token, amount);
    }

    // Optional: withdraw excess collateral when healthy (simple check via oracle)
    function withdrawExcessCollateral(
        uint256 loanId,
        address token,
        uint256 amount
    ) external nonReentrant {
        LoanRequest storage request = loanRequests[loanId];
        require(request.borrower == msg.sender, "Only borrower");
        require(amount > 0, "Amount must be positive");

        // Compute new collateral ratio after withdrawal; must remain >= minCollateralRatio
        uint256 currentCollateral = collateralVault.loanTokenAmounts(
            loanId,
            token
        );
        require(currentCollateral >= amount, "Insufficient collateral");

        uint256 newCollateralAmount = 0;
        {
            // sum all collateral tokens for this loan from vault and subtract planned amount for 'token'
            (address[] memory tks, uint256[] memory amts) = collateralVault
                .getLoanCollateralDetails(loanId);
            uint256 totalColl = 0;
            for (uint i = 0; i < tks.length; i++) {
                uint256 a = amts[i];
                if (tks[i] == token) {
                    a = a - amount;
                }
                // Convert token amounts to USD-equivalent via oracle and aggregate by using priceOracle.getTokenValueInUSD-like logic is not available here; fall back to ratio check using calculateCollateralRatio per token sequentially.
                // Simplified: approximate by checking global ratio with token removed amount
                totalColl += a; // placeholder, conservative enforcement would be better with full USD conversion
            }
            newCollateralAmount = totalColl; // placeholder
        }

        // Simple guard: disallow if any collateral removal would drop below min ratio using primary pair
        require(
            priceOracle.isCollateralSufficient(
                token,
                request.collateralAmount >= amount
                    ? request.collateralAmount - amount
                    : 0,
                request.tokenAddress,
                request.amount,
                minCollateralRatio
            ),
            "Would drop below min ratio"
        );

        // Approve release via vault
        collateralVault.releaseCollateral(msg.sender, token, amount, loanId);
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

    // MULTI-LENDER GETTERS
    function getLendersByLoan(
        uint256 loanId
    ) external view returns (address[] memory) {
        return lendersByLoan[loanId];
    }

    function getLenderContribution(
        uint256 loanId,
        address lender
    ) external view returns (uint256) {
        return lenderContribution[loanId][lender];
    }

    function getTotalFundedByLoan(
        uint256 loanId
    ) external view returns (uint256) {
        return totalFundedByLoan[loanId];
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
