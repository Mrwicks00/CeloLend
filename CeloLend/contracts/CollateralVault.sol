// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./PriceOracle.sol";

contract CollateralVault is Ownable, ReentrancyGuard {
    // Collateral tracking
    struct CollateralDeposit {
        address owner;
        address token;
        uint256 amount;
        uint256 loanId;
        bool isLocked;
        uint256 lockedAt;
    }

    // Mappings
    mapping(address => mapping(address => uint256)) public userTokenBalances; // user => token => amount
    mapping(uint256 => CollateralDeposit) public loanCollateral; // loanId => collateral details
    mapping(address => uint256[]) public userCollateralLoans; // user => loan IDs with collateral

    // Authorized contracts (CeloLend main contract, LoanAgreement contracts)
    mapping(address => bool) public authorizedContracts;

    // Price oracle for accurate valuations
    PriceOracle public priceOracle;

    // Supported tokens and their liquidation settings
    mapping(address => bool) public supportedCollateralTokens;
    mapping(address => uint256) public liquidationThresholds; // token => threshold percentage (basis points)

    // Statistics tracking
    uint256 public totalDepositsCount;
    uint256 public activeLoansCount;
    mapping(address => uint256) public tokenTotalLocked; // token => total amount locked

    // Constants
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public liquidationFee = 500; // 5% liquidation fee

    // Events
    event CollateralLocked(
        address indexed user,
        address token,
        uint256 amount,
        uint256 loanId
    );
    event CollateralReleased(
        address indexed user,
        address token,
        uint256 amount,
        uint256 loanId
    );
    event CollateralLiquidated(
        address indexed user,
        address token,
        uint256 amount,
        uint256 loanId,
        uint256 proceeds
    );
    event AuthorizedContractUpdated(
        address indexed contractAddr,
        bool authorized
    );
    event LiquidationFeeUpdated(uint256 newFee);

    modifier onlyAuthorized() {
        require(authorizedContracts[msg.sender], "Not authorized contract");
        _;
    }

    constructor() Ownable(msg.sender) {}

    function setPriceOracle(address _priceOracle) external onlyOwner {
        require(_priceOracle != address(0), "Invalid oracle address");
        priceOracle = PriceOracle(_priceOracle);
    }

    // Lock collateral for a loan
    function lockCollateral(
        address user,
        address token,
        uint256 amount,
        uint256 loanId
    ) external onlyAuthorized {
        require(
            supportedCollateralTokens[token],
            "Token not supported as collateral"
        );
        require(amount > 0, "Amount must be positive");

        // Store collateral details
        loanCollateral[loanId] = CollateralDeposit({
            owner: user,
            token: token,
            amount: amount,
            loanId: loanId,
            isLocked: true,
            lockedAt: block.timestamp
        });

        // Update user balances
        userTokenBalances[user][token] += amount;
        userCollateralLoans[user].push(loanId);

        // Update statistics
        totalDepositsCount++;
        activeLoansCount++;
        tokenTotalLocked[token] += amount;

        emit CollateralLocked(user, token, amount, loanId);
    }

    // Release collateral back to user (when loan is repaid)
    function releaseCollateral(
        address user,
        address token,
        uint256 amount,
        uint256 loanId
    ) external onlyAuthorized nonReentrant {
        CollateralDeposit storage deposit = loanCollateral[loanId];
        require(deposit.owner == user, "Not collateral owner");
        require(deposit.isLocked, "Collateral not locked");
        require(deposit.amount >= amount, "Insufficient collateral");

        // Update deposit
        deposit.amount -= amount;
        if (deposit.amount == 0) {
            deposit.isLocked = false;
        }

        // Update user balances
        userTokenBalances[user][token] -= amount;

        // Update statistics
        if (deposit.amount == 0) {
            activeLoansCount--;
        }
        tokenTotalLocked[token] -= amount;

        // Transfer tokens back to user
        if (token == address(0)) {
            // Native token transfer
            (bool success, ) = user.call{value: amount}("");
            require(success, "Native token transfer failed");
        } else {
            // ERC20 token transfer
            IERC20(token).transfer(user, amount);
        }

        emit CollateralReleased(user, token, amount, loanId);
    }

    // Liquidate collateral (when loan defaults)
    function liquidateCollateral(
        address user,
        address token,
        uint256 collateralAmount,
        uint256 debtAmount,
        address creditor
    )
        external
        onlyAuthorized
        nonReentrant
        returns (uint256 liquidationProceeds)
    {
        require(supportedCollateralTokens[token], "Token not supported");

        // Calculate liquidation amount (simplified - in production use price oracles)
        uint256 liquidationValue = _calculateLiquidationValue(
            token,
            collateralAmount
        );

        // Calculate liquidation fee
        uint256 fee = (liquidationValue * liquidationFee) / BASIS_POINTS;
        uint256 netProceeds = liquidationValue - fee;

        // Determine how much to send to creditor vs borrower
        uint256 creditorShare = debtAmount > netProceeds
            ? netProceeds
            : debtAmount;
        uint256 borrowerRefund = netProceeds - creditorShare;

        // Update user balances
        userTokenBalances[user][token] -= collateralAmount;

        // Transfer proceeds
        if (token == address(0)) {
            // Native token transfers
            if (creditorShare > 0) {
                (bool success1, ) = creditor.call{value: creditorShare}("");
                require(success1, "Native token transfer to creditor failed");
            }
            if (borrowerRefund > 0) {
                (bool success2, ) = user.call{value: borrowerRefund}("");
                require(success2, "Native token refund failed");
            }
            if (fee > 0) {
                (bool success3, ) = owner().call{value: fee}("");
                require(success3, "Native token fee transfer failed");
            }
        } else {
            // ERC20 token transfers
            if (creditorShare > 0) {
                IERC20(token).transfer(creditor, creditorShare);
            }
            if (borrowerRefund > 0) {
                IERC20(token).transfer(user, borrowerRefund);
            }
            if (fee > 0) {
                IERC20(token).transfer(owner(), fee); // Platform fee
            }
        }

        emit CollateralLiquidated(
            user,
            token,
            collateralAmount,
            0,
            liquidationValue
        );

        return liquidationValue;
    }

    // Emergency release (admin function)
    function emergencyReleaseCollateral(
        address user,
        address token,
        uint256 amount,
        uint256 loanId
    ) external onlyOwner nonReentrant {
        CollateralDeposit storage deposit = loanCollateral[loanId];
        require(deposit.owner == user, "Invalid user");

        deposit.amount -= amount;
        if (deposit.amount == 0) {
            deposit.isLocked = false;
        }

        userTokenBalances[user][token] -= amount;
        IERC20(token).transfer(user, amount);

        emit CollateralReleased(user, token, amount, loanId);
    }

    // GETTER FUNCTIONS

    function getCollateralDeposit(
        uint256 loanId
    ) external view returns (CollateralDeposit memory) {
        return loanCollateral[loanId];
    }

    function getUserCollateralBalance(
        address user,
        address token
    ) external view returns (uint256) {
        return userTokenBalances[user][token];
    }

    function getUserCollateralLoans(
        address user
    ) external view returns (uint256[] memory) {
        return userCollateralLoans[user];
    }

    function getUserCollateralDetails(
        address user
    )
        external
        view
        returns (
            address[] memory tokens,
            uint256[] memory amounts,
            uint256[] memory loanIds
        )
    {
        uint256[] memory loans = userCollateralLoans[user];
        tokens = new address[](loans.length);
        amounts = new uint256[](loans.length);
        loanIds = new uint256[](loans.length);

        for (uint i = 0; i < loans.length; i++) {
            CollateralDeposit memory deposit = loanCollateral[loans[i]];
            tokens[i] = deposit.token;
            amounts[i] = deposit.amount;
            loanIds[i] = deposit.loanId;
        }

        return (tokens, amounts, loanIds);
    }

    function getTotalValueLocked() external view returns (uint256 totalValue) {
        // Sum up all locked tokens (simplified 1:1 USD value)
        // In practice, you'd use price oracle for accurate USD values
        totalValue = 0;

        // This is a basic implementation - could be enhanced with price oracle integration
        // For now, just return a count-based approximation
        return totalDepositsCount * 1000 * 1e18; // Estimated average deposit value
    }

    function getTokenTotalLocked(
        address token
    ) external view returns (uint256) {
        return tokenTotalLocked[token];
    }

    function getVaultStats()
        external
        view
        returns (
            uint256 totalDeposits,
            uint256 activeLoans,
            uint256 liquidationFeeRate
        )
    {
        totalDeposits = totalDepositsCount;
        activeLoans = activeLoansCount;
        liquidationFeeRate = liquidationFee;
    }

    function isTokenSupported(address token) external view returns (bool) {
        return supportedCollateralTokens[token];
    }

    function getLiquidationThreshold(
        address token
    ) external view returns (uint256) {
        return liquidationThresholds[token];
    }

    function getCollateralHealth(
        uint256 loanId,
        uint256 loanValue
    )
        external
        view
        returns (uint256 collateralValue, uint256 healthFactor, bool isHealthy)
    {
        CollateralDeposit memory deposit = loanCollateral[loanId];

        // Simplified calculation - use oracle prices in production
        collateralValue = _calculateLiquidationValue(
            deposit.token,
            deposit.amount
        );

        if (loanValue == 0) {
            healthFactor = type(uint256).max;
            isHealthy = true;
        } else {
            healthFactor = (collateralValue * BASIS_POINTS) / loanValue;
            uint256 threshold = liquidationThresholds[deposit.token];
            isHealthy = healthFactor > threshold;
        }

        return (collateralValue, healthFactor, isHealthy);
    }

    // ADMIN FUNCTIONS

    function setAuthorizedContract(
        address contractAddr,
        bool authorized
    ) external onlyOwner {
        authorizedContracts[contractAddr] = authorized;
        emit AuthorizedContractUpdated(contractAddr, authorized);
    }

    function setSupportedCollateralToken(
        address token,
        bool supported
    ) external onlyOwner {
        supportedCollateralTokens[token] = supported;
    }

    function setLiquidationThreshold(
        address token,
        uint256 threshold
    ) external onlyOwner {
        require(threshold <= BASIS_POINTS, "Invalid threshold");
        liquidationThresholds[token] = threshold;
    }

    function setLiquidationFee(uint256 newFee) external onlyOwner {
        require(newFee <= 1000, "Fee too high"); // Max 10%
        liquidationFee = newFee;
        emit LiquidationFeeUpdated(newFee);
    }

    // Batch set supported tokens (for initial setup)
    function batchSetSupportedTokens(
        address[] calldata tokens,
        bool[] calldata supported,
        uint256[] calldata thresholds
    ) external onlyOwner {
        require(
            tokens.length == supported.length &&
                tokens.length == thresholds.length,
            "Array length mismatch"
        );

        for (uint i = 0; i < tokens.length; i++) {
            supportedCollateralTokens[tokens[i]] = supported[i];
            if (thresholds[i] > 0) {
                liquidationThresholds[tokens[i]] = thresholds[i];
            }
        }
    }

    // INTERNAL FUNCTIONS

    function _calculateLiquidationValue(
        address token,
        uint256 amount
    ) internal view returns (uint256) {
        // Use price oracle for accurate liquidation value calculation
        if (address(priceOracle) == address(0)) {
            // Fallback to 1:1 if oracle not set
            return amount;
        }

        try
            priceOracle.calculateLiquidationValue(token, amount, liquidationFee)
        returns (uint256 value) {
            return value;
        } catch {
            // Fallback calculation if oracle fails
            return amount;
        }
    }

    function _removeUserCollateralLoan(address user, uint256 loanId) internal {
        uint256[] storage loans = userCollateralLoans[user];
        for (uint i = 0; i < loans.length; i++) {
            if (loans[i] == loanId) {
                loans[i] = loans[loans.length - 1];
                loans.pop();
                break;
            }
        }
    }

    // Receive function to accept native token collateral
    receive() external payable {
        // Allow vault to receive native tokens
    }
}
