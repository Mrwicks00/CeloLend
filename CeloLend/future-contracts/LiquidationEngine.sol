// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./CeloLend.sol";
import "./LoanRepayment.sol";
import "./CollateralVault.sol";
import "./PriceOracle.sol";
import "./Treasury.sol";
import "./InsurancePool.sol";

/**
 * @title LiquidationEngine
 * @dev Automated liquidation system for overdue and undercollateralized loans
 */
contract LiquidationEngine is ReentrancyGuard {
    CeloLend public immutable celoLend;
    LoanRepayment public immutable loanRepayment;
    CollateralVault public immutable collateralVault;
    PriceOracle public immutable priceOracle;
    Treasury public immutable treasury;
    InsurancePool public immutable insurancePool;

    // Liquidation parameters
    uint256 public constant LIQUIDATION_THRESHOLD = 12000; // 120% - liquidate if collateral ratio drops below
    uint256 public constant LIQUIDATION_PENALTY = 1000; // 10% penalty on collateral
    uint256 public constant LIQUIDATOR_REWARD = 200; // 2% reward for liquidator
    uint256 public constant BASIS_POINTS = 10000;

    // Liquidation tracking
    struct LiquidationInfo {
        uint256 loanId;
        address liquidator;
        uint256 liquidationTime;
        uint256 debtAmount;
        uint256 collateralLiquidated;
        uint256 liquidatorReward;
        uint256 penaltyAmount;
        LiquidationType liquidationType;
    }

    enum LiquidationType {
        TimeDefault, // Loan overdue
        Undercollateralized // Collateral ratio below threshold
    }

    mapping(uint256 => LiquidationInfo) public liquidations;
    mapping(address => uint256[]) public liquidatorHistory;

    uint256 public totalLiquidations;
    uint256 public totalLiquidationVolume;

    event LiquidationTriggered(
        uint256 indexed loanId,
        address indexed liquidator,
        LiquidationType liquidationType,
        uint256 debtAmount,
        uint256 collateralAmount
    );

    event LiquidationCompleted(
        uint256 indexed loanId,
        uint256 liquidatorReward,
        uint256 lenderRecovery,
        uint256 borrowerRefund,
        uint256 penaltyAmount
    );

    event HealthFactorUpdate(uint256 indexed loanId, uint256 healthFactor);

    constructor(
        address _celoLend,
        address _loanRepayment,
        address _collateralVault,
        address _priceOracle,
        address _treasury,
        address _insurancePool
    ) {
        celoLend = CeloLend(_celoLend);
        loanRepayment = LoanRepayment(_loanRepayment);
        collateralVault = CollateralVault(_collateralVault);
        priceOracle = PriceOracle(_priceOracle);
        treasury = Treasury(_treasury);
        insurancePool = InsurancePool(_insurancePool);
    }

    /**
     * @notice Calculate health factor for a funded loan
     * @param loanId The loan ID to check
     * @return healthFactor Current health factor (scaled by 10000)
     * @return collateralValue Current value of collateral in USD
     * @return debtValue Current debt value in USD
     */
    function calculateHealthFactor(
        uint256 loanId
    )
        public
        view
        returns (
            uint256 healthFactor,
            uint256 collateralValue,
            uint256 debtValue
        )
    {
        // Get loan details
        CeloLend.LoanRequest memory loanRequest = celoLend.getLoanRequest(
            loanId
        );

        require(loanRequest.isFunded, "Loan not funded");

        // Get current debt amount (principal + accrued interest)
        (, uint256 currentDebt, ) = loanRepayment.getLoanRepaymentInfo(loanId);

        // Get collateral value in USD
        collateralValue = priceOracle.getTokenValueInUSD(
            loanRequest.collateralToken,
            loanRequest.collateralAmount
        );

        // Get debt value in USD
        debtValue = priceOracle.getTokenValueInUSD(
            loanRequest.tokenAddress,
            currentDebt
        );

        // Calculate health factor: (Collateral Value / Debt Value) * 10000
        if (debtValue == 0) {
            healthFactor = type(uint256).max; // Infinite if no debt
        } else {
            healthFactor = (collateralValue * BASIS_POINTS) / debtValue;
        }
    }

    /**
     * @notice Check if a loan can be liquidated
     * @param loanId The loan ID to check
     * @return canLiquidate Whether liquidation is possible
     * @return liquidationType Type of liquidation (time-based or collateral-based)
     * @return reason Human-readable reason for liquidation eligibility
     */
    function canLiquidate(
        uint256 loanId
    )
        external
        view
        returns (
            bool isLiquidable,
            LiquidationType liquidationType,
            string memory reason
        )
    {
        // Check if loan is overdue
        (bool isOverdue, bool canLiquidateTime) = loanRepayment.isLoanOverdue(
            loanId
        );

        if (canLiquidateTime) {
            return (
                true,
                LiquidationType.TimeDefault,
                "Loan is overdue and past grace period"
            );
        }

        // Check collateral ratio
        (uint256 healthFactor, , ) = calculateHealthFactor(loanId);

        if (healthFactor < LIQUIDATION_THRESHOLD) {
            return (
                true,
                LiquidationType.Undercollateralized,
                "Collateral ratio below liquidation threshold"
            );
        }

        return (false, LiquidationType.TimeDefault, "Loan is healthy");
    }

    /**
     * @notice Liquidate an eligible loan
     * @param loanId The loan ID to liquidate
     */
    function liquidateLoan(uint256 loanId) external nonReentrant {
        // Verify liquidation eligibility
        (bool canLiquidateNow, LiquidationType liquidationType, ) = this
            .canLiquidate(loanId);
        require(canLiquidateNow, "Loan cannot be liquidated");

        // Get loan and repayment details
        CeloLend.LoanRequest memory loanRequest = celoLend.getLoanRequest(
            loanId
        );

        (, uint256 currentDebt, , address lender, ) = loanRepayment
            .getLoanRepaymentInfo(loanId);

        // Calculate liquidation amounts
        uint256 collateralValue = priceOracle.getTokenValueInUSD(
            loanRequest.collateralToken,
            loanRequest.collateralAmount
        );
        uint256 debtValue = priceOracle.getTokenValueInUSD(
            loanRequest.tokenAddress,
            currentDebt
        );

        // Calculate penalty (on the debt amount)
        uint256 penaltyAmount = (debtValue * LIQUIDATION_PENALTY) /
            BASIS_POINTS;
        uint256 totalDebtWithPenalty = debtValue + penaltyAmount;

        // Calculate liquidator reward
        uint256 liquidatorReward = (collateralValue * LIQUIDATOR_REWARD) /
            BASIS_POINTS;

        // Ensure we don't over-liquidate
        uint256 maxLiquidation = collateralValue - liquidatorReward;
        uint256 lenderRecovery = totalDebtWithPenalty > maxLiquidation
            ? maxLiquidation
            : totalDebtWithPenalty;
        uint256 borrowerRefund = collateralValue -
            liquidatorReward -
            lenderRecovery;

        // Record liquidation
        liquidations[loanId] = LiquidationInfo({
            loanId: loanId,
            liquidator: msg.sender,
            liquidationTime: block.timestamp,
            debtAmount: currentDebt,
            collateralLiquidated: loanRequest.collateralAmount,
            liquidatorReward: liquidatorReward,
            penaltyAmount: penaltyAmount,
            liquidationType: liquidationType
        });

        liquidatorHistory[msg.sender].push(loanId);
        totalLiquidations++;
        totalLiquidationVolume += collateralValue;

        emit LiquidationTriggered(
            loanId,
            msg.sender,
            liquidationType,
            currentDebt,
            loanRequest.collateralAmount
        );

        // Mark loan as defaulted in repayment system
        loanRepayment.markAsDefaulted(loanId);

        // Execute liquidation through CollateralVault
        _executeLiquidation(
            loanId,
            loanRequest.borrower,
            lender,
            loanRequest.collateralToken,
            loanRequest.collateralAmount,
            liquidatorReward,
            lenderRecovery,
            borrowerRefund,
            penaltyAmount
        );

        emit LiquidationCompleted(
            loanId,
            liquidatorReward,
            lenderRecovery,
            borrowerRefund,
            penaltyAmount
        );
    }

    /**
     * @notice Execute the liquidation process
     */
    function _executeLiquidation(
        uint256 loanId,
        address borrower,
        address lender,
        address collateralToken,
        uint256 collateralAmount,
        uint256 liquidatorReward,
        uint256 lenderRecovery,
        uint256 borrowerRefund,
        uint256 penaltyAmount
    ) internal {
        // Transfer liquidator reward
        if (liquidatorReward > 0) {
            collateralVault.transferCollateral(
                borrower,
                msg.sender,
                collateralToken,
                _calculateTokenAmount(collateralToken, liquidatorReward),
                loanId
            );
        }

        // Transfer lender recovery
        if (lenderRecovery > 0) {
            collateralVault.transferCollateral(
                borrower,
                lender,
                collateralToken,
                _calculateTokenAmount(collateralToken, lenderRecovery),
                loanId
            );
        }

        // Send penalty to treasury
        if (penaltyAmount > 0) {
            collateralVault.transferCollateral(
                borrower,
                address(treasury),
                collateralToken,
                _calculateTokenAmount(collateralToken, penaltyAmount),
                loanId
            );
        }

        // Return remaining collateral to borrower (if any)
        if (borrowerRefund > 0) {
            collateralVault.transferCollateral(
                borrower,
                borrower,
                collateralToken,
                _calculateTokenAmount(collateralToken, borrowerRefund),
                loanId
            );
        }

        // Update credit score for default
        address creditScoreAddr = celoLend.creditScore();
        (bool success, ) = creditScoreAddr.call(
            abi.encodeWithSignature("recordDefault(address)", borrower)
        );
        // Don't revert if credit score update fails
    }

    /**
     * @notice Convert USD value to token amount
     */
    function _calculateTokenAmount(
        address token,
        uint256 usdValue
    ) internal view returns (uint256) {
        uint256 tokenPrice = priceOracle.getLatestPrice(token);
        require(tokenPrice > 0, "Invalid token price");

        // Convert USD to token amount based on price
        return (usdValue * 1e18) / tokenPrice;
    }

    /**
     * @notice Batch check health factors for multiple loans
     * @param loanIds Array of loan IDs to check
     * @return healthFactors Array of health factors
     */
    function batchCheckHealthFactors(
        uint256[] calldata loanIds
    ) external view returns (uint256[] memory healthFactors) {
        healthFactors = new uint256[](loanIds.length);

        for (uint256 i = 0; i < loanIds.length; i++) {
            (uint256 healthFactor, , ) = calculateHealthFactor(loanIds[i]);
            healthFactors[i] = healthFactor;
        }
    }

    /**
     * @notice Get liquidation statistics
     */
    function getLiquidationStats()
        external
        view
        returns (
            uint256 totalLiquidationsCount,
            uint256 totalVolume,
            uint256 averageLiquidationSize
        )
    {
        totalLiquidationsCount = totalLiquidations;
        totalVolume = totalLiquidationVolume;
        averageLiquidationSize = totalLiquidations > 0
            ? totalVolume / totalLiquidations
            : 0;
    }

    /**
     * @notice Get liquidator performance
     * @param liquidator Address of the liquidator
     */
    function getLiquidatorStats(
        address liquidator
    )
        external
        view
        returns (
            uint256 liquidationCount,
            uint256[] memory liquidatedLoans,
            uint256 totalRewardsEarned
        )
    {
        liquidationCount = liquidatorHistory[liquidator].length;
        liquidatedLoans = liquidatorHistory[liquidator];

        // Calculate total rewards
        for (uint256 i = 0; i < liquidatedLoans.length; i++) {
            totalRewardsEarned += liquidations[liquidatedLoans[i]]
                .liquidatorReward;
        }
    }

    /**
     * @notice Emergency function to update liquidation parameters (onlyOwner)
     */
    function updateLiquidationThreshold(uint256 newThreshold) external {
        require(msg.sender == celoLend.owner(), "Only CeloLend owner");
        require(
            newThreshold >= 11000 && newThreshold <= 15000,
            "Invalid threshold"
        );
        // Would need to add storage variable and update logic
    }

    /**
     * @notice Get detailed liquidation info
     */
    function getLiquidationInfo(
        uint256 loanId
    )
        external
        view
        returns (LiquidationInfo memory liquidationInfo, bool wasLiquidated)
    {
        liquidationInfo = liquidations[loanId];
        wasLiquidated = liquidationInfo.liquidationTime > 0;
    }
}
