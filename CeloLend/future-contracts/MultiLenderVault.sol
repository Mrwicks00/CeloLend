// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./CeloLend.sol";
import "./Treasury.sol";
import "./InsurancePool.sol";

/**
 * @title MultiLenderVault
 * @dev Enables fractional funding of loans by multiple lenders with proportional risk/reward
 */
contract MultiLenderVault is ReentrancyGuard {
    CeloLend public immutable celoLend;
    Treasury public immutable treasury;
    InsurancePool public immutable insurancePool;

    // Funding pool for each loan
    struct LoanFundingPool {
        uint256 loanId;
        uint256 targetAmount; // Total amount needed
        uint256 currentAmount; // Amount funded so far
        uint256 minContribution; // Minimum contribution per lender
        uint256 maxLenders; // Maximum number of lenders
        uint256 fundingDeadline; // Deadline for funding
        address loanToken; // Token being lent
        bool isActive; // Whether still accepting funds
        bool isFunded; // Whether fully funded
        bool isDistributed; // Whether funds distributed to borrower
        uint256 createdAt;
    }

    // Individual lender contributions
    struct LenderContribution {
        address lender;
        uint256 amount;
        uint256 contributionTime;
        uint256 sharePercentage; // Percentage of total loan (scaled by 10000)
        bool hasWithdrawn; // Whether lender has withdrawn
    }

    // Loan funding state
    mapping(uint256 => LoanFundingPool) public fundingPools;
    mapping(uint256 => LenderContribution[]) public loanContributions;
    mapping(uint256 => mapping(address => uint256))
        public lenderContributionIndex;
    mapping(address => uint256[]) public lenderParticipations;

    // Funding parameters
    uint256 public constant DEFAULT_FUNDING_PERIOD = 7 days;
    uint256 public constant MIN_CONTRIBUTION_RATIO = 100; // 1% minimum
    uint256 public constant MAX_LENDERS_PER_LOAN = 20; // Maximum 20 lenders
    uint256 public constant BASIS_POINTS = 10000;

    // Interest distribution tracking
    mapping(uint256 => uint256) public totalInterestEarned;
    mapping(uint256 => mapping(address => uint256)) public lenderInterestEarned;
    mapping(uint256 => mapping(address => bool)) public hasClaimedInterest;

    // Events
    event FundingPoolCreated(
        uint256 indexed loanId,
        uint256 targetAmount,
        uint256 deadline,
        address indexed token
    );

    event ContributionMade(
        uint256 indexed loanId,
        address indexed lender,
        uint256 amount,
        uint256 sharePercentage
    );

    event LoanFullyFunded(
        uint256 indexed loanId,
        uint256 totalAmount,
        uint256 lenderCount
    );

    event FundsDistributed(
        uint256 indexed loanId,
        address indexed borrower,
        uint256 amount
    );

    event InterestDistributed(
        uint256 indexed loanId,
        uint256 totalInterest,
        uint256 lenderCount
    );

    event LenderWithdrawal(
        uint256 indexed loanId,
        address indexed lender,
        uint256 principal,
        uint256 interest
    );

    event FundingFailed(
        uint256 indexed loanId,
        uint256 amountRaised,
        uint256 targetAmount
    );

    constructor(address _celoLend, address _treasury, address _insurancePool) {
        celoLend = CeloLend(_celoLend);
        treasury = Treasury(_treasury);
        insurancePool = InsurancePool(_insurancePool);
    }

    /**
     * @notice Create a funding pool for a loan request
     * @param loanId The loan ID to create funding for
     */
    function createFundingPool(uint256 loanId) external {
        require(
            msg.sender == address(celoLend),
            "Only CeloLend can create pools"
        );
        require(fundingPools[loanId].loanId == 0, "Pool already exists");

        // Get loan details
        (
            ,
            ,
            uint256 amount,
            address tokenAddress,
            ,
            ,
            ,
            ,
            bool isActive,
            bool isFunded,

        ) = celoLend.getLoanRequest(loanId);

        require(isActive && !isFunded, "Invalid loan state");

        // Calculate minimum contribution (1% of loan amount, minimum 1 token)
        uint256 minContribution = amount / 100;
        if (minContribution == 0) minContribution = 1e18; // 1 token minimum

        fundingPools[loanId] = LoanFundingPool({
            loanId: loanId,
            targetAmount: amount,
            currentAmount: 0,
            minContribution: minContribution,
            maxLenders: MAX_LENDERS_PER_LOAN,
            fundingDeadline: block.timestamp + DEFAULT_FUNDING_PERIOD,
            loanToken: tokenAddress,
            isActive: true,
            isFunded: false,
            isDistributed: false,
            createdAt: block.timestamp
        });

        emit FundingPoolCreated(
            loanId,
            amount,
            fundingPools[loanId].fundingDeadline,
            tokenAddress
        );
    }

    /**
     * @notice Contribute funds to a loan
     * @param loanId The loan ID to fund
     * @param amount Amount to contribute
     */
    function contributeFunds(
        uint256 loanId,
        uint256 amount
    ) external payable nonReentrant {
        LoanFundingPool storage pool = fundingPools[loanId];
        require(pool.isActive, "Pool not active");
        require(
            block.timestamp <= pool.fundingDeadline,
            "Funding deadline passed"
        );
        require(!pool.isFunded, "Already fully funded");
        require(amount >= pool.minContribution, "Below minimum contribution");

        // Check if lender already contributed
        require(
            lenderContributionIndex[loanId][msg.sender] == 0,
            "Already contributed"
        );

        // Check max lenders limit
        require(
            loanContributions[loanId].length < pool.maxLenders,
            "Max lenders reached"
        );

        // Ensure we don't exceed target
        uint256 actualAmount = amount;
        if (pool.currentAmount + amount > pool.targetAmount) {
            actualAmount = pool.targetAmount - pool.currentAmount;
        }

        // Handle payment
        if (pool.loanToken == address(0)) {
            require(msg.value >= actualAmount, "Insufficient native token");

            // Refund excess
            if (msg.value > actualAmount) {
                (bool success, ) = payable(msg.sender).call{
                    value: msg.value - actualAmount
                }("");
                require(success, "Refund failed");
            }
        } else {
            require(msg.value == 0, "No native token expected");
            IERC20(pool.loanToken).transferFrom(
                msg.sender,
                address(this),
                actualAmount
            );
        }

        // Calculate share percentage
        uint256 sharePercentage = (actualAmount * BASIS_POINTS) /
            pool.targetAmount;

        // Add contribution
        loanContributions[loanId].push(
            LenderContribution({
                lender: msg.sender,
                amount: actualAmount,
                contributionTime: block.timestamp,
                sharePercentage: sharePercentage,
                hasWithdrawn: false
            })
        );

        // Update indexes
        lenderContributionIndex[loanId][msg.sender] = loanContributions[loanId]
            .length;
        lenderParticipations[msg.sender].push(loanId);

        // Update pool state
        pool.currentAmount += actualAmount;

        emit ContributionMade(
            loanId,
            msg.sender,
            actualAmount,
            sharePercentage
        );

        // Check if fully funded
        if (pool.currentAmount >= pool.targetAmount) {
            pool.isFunded = true;
            pool.isActive = false;

            emit LoanFullyFunded(
                loanId,
                pool.currentAmount,
                loanContributions[loanId].length
            );

            // Notify CeloLend that loan is funded
            _notifyLoanFunded(loanId);
        }
    }

    /**
     * @notice Distribute funds to borrower after full funding
     * @param loanId The loan ID to distribute funds for
     */
    function distributeFunds(uint256 loanId) external {
        LoanFundingPool storage pool = fundingPools[loanId];
        require(pool.isFunded, "Not fully funded");
        require(!pool.isDistributed, "Already distributed");
        require(
            msg.sender == address(celoLend),
            "Only CeloLend can distribute"
        );

        // Get borrower address
        (, address borrower, , , , , , , , , ) = celoLend.getLoanRequest(
            loanId
        );

        // Calculate platform fee
        uint256 platformFee = (pool.currentAmount *
            celoLend.platformFeeRate()) / BASIS_POINTS;
        uint256 netAmount = pool.currentAmount - platformFee;

        // Transfer platform fee to treasury
        if (platformFee > 0) {
            if (pool.loanToken == address(0)) {
                treasury.depositPlatformFees{value: platformFee}(
                    pool.loanToken,
                    platformFee
                );
            } else {
                IERC20(pool.loanToken).approve(address(treasury), platformFee);
                treasury.depositPlatformFees(pool.loanToken, platformFee);
            }
        }

        // Transfer net amount to borrower
        if (pool.loanToken == address(0)) {
            (bool success, ) = payable(borrower).call{value: netAmount}("");
            require(success, "Transfer to borrower failed");
        } else {
            IERC20(pool.loanToken).transfer(borrower, netAmount);
        }

        pool.isDistributed = true;

        emit FundsDistributed(loanId, borrower, netAmount);
    }

    /**
     * @notice Handle loan repayment and distribute interest
     * @param loanId The loan ID being repaid
     * @param totalAmount Total repayment amount (principal + interest)
     */
    function handleRepayment(
        uint256 loanId,
        uint256 totalAmount,
        uint256 principalAmount,
        uint256 interestAmount
    ) external payable {
        require(
            msg.sender == address(celoLend),
            "Only CeloLend can handle repayment"
        );

        LoanFundingPool storage pool = fundingPools[loanId];
        require(pool.isDistributed, "Funds not distributed");

        // Record total interest earned
        totalInterestEarned[loanId] = interestAmount;

        // Distribute interest proportionally to lenders
        LenderContribution[] storage contributions = loanContributions[loanId];

        for (uint256 i = 0; i < contributions.length; i++) {
            LenderContribution storage contribution = contributions[i];

            // Calculate proportional interest
            uint256 lenderInterest = (interestAmount *
                contribution.sharePercentage) / BASIS_POINTS;
            lenderInterestEarned[loanId][contribution.lender] = lenderInterest;

            // Transfer principal + interest to lender
            uint256 totalLenderAmount = contribution.amount + lenderInterest;

            if (pool.loanToken == address(0)) {
                (bool success, ) = payable(contribution.lender).call{
                    value: totalLenderAmount
                }("");
                require(success, "Repayment transfer failed");
            } else {
                IERC20(pool.loanToken).transfer(
                    contribution.lender,
                    totalLenderAmount
                );
            }

            contribution.hasWithdrawn = true;
        }

        emit InterestDistributed(loanId, interestAmount, contributions.length);
    }

    /**
     * @notice Handle partial repayment
     * @param loanId The loan ID receiving partial payment
     * @param paymentAmount Amount being paid
     * @param interestPortion Interest portion of payment
     */
    function handlePartialRepayment(
        uint256 loanId,
        uint256 paymentAmount,
        uint256 interestPortion
    ) external payable {
        require(
            msg.sender == address(celoLend),
            "Only CeloLend can handle repayment"
        );

        LoanFundingPool storage pool = fundingPools[loanId];
        LenderContribution[] storage contributions = loanContributions[loanId];

        // Distribute interest portion proportionally
        for (uint256 i = 0; i < contributions.length; i++) {
            LenderContribution storage contribution = contributions[i];

            uint256 lenderShare = (interestPortion *
                contribution.sharePercentage) / BASIS_POINTS;
            lenderInterestEarned[loanId][contribution.lender] += lenderShare;

            // Transfer interest payment
            if (pool.loanToken == address(0)) {
                (bool success, ) = payable(contribution.lender).call{
                    value: lenderShare
                }("");
                require(success, "Interest transfer failed");
            } else {
                IERC20(pool.loanToken).transfer(
                    contribution.lender,
                    lenderShare
                );
            }
        }
    }

    /**
     * @notice Withdraw funds if loan funding fails
     * @param loanId The loan ID to withdraw from
     */
    function withdrawFailedFunding(uint256 loanId) external nonReentrant {
        LoanFundingPool storage pool = fundingPools[loanId];
        require(
            block.timestamp > pool.fundingDeadline,
            "Funding period not ended"
        );
        require(!pool.isFunded, "Loan was funded");

        uint256 contributionIndex = lenderContributionIndex[loanId][msg.sender];
        require(contributionIndex > 0, "No contribution found");

        LenderContribution storage contribution = loanContributions[loanId][
            contributionIndex - 1
        ];
        require(!contribution.hasWithdrawn, "Already withdrawn");
        require(contribution.lender == msg.sender, "Not your contribution");

        contribution.hasWithdrawn = true;

        // Return contribution
        if (pool.loanToken == address(0)) {
            (bool success, ) = payable(msg.sender).call{
                value: contribution.amount
            }("");
            require(success, "Withdrawal failed");
        } else {
            IERC20(pool.loanToken).transfer(msg.sender, contribution.amount);
        }

        // Emit event if this is the first withdrawal (marking funding as failed)
        if (pool.isActive) {
            pool.isActive = false;
            emit FundingFailed(loanId, pool.currentAmount, pool.targetAmount);
        }

        emit LenderWithdrawal(loanId, msg.sender, contribution.amount, 0);
    }

    /**
     * @notice Notify CeloLend that loan is fully funded
     */
    function _notifyLoanFunded(uint256 loanId) internal {
        // This would typically call a function on CeloLend to mark the loan as funded
        // For now, we'll emit an event that CeloLend can listen to
        bytes memory data = abi.encodeWithSignature(
            "markLoanAsFunded(uint256)",
            loanId
        );
        (bool success, ) = address(celoLend).call(data);
        // Don't revert if the call fails, just log it
    }

    /**
     * @notice Get funding pool details
     */
    function getFundingPool(
        uint256 loanId
    )
        external
        view
        returns (
            LoanFundingPool memory pool,
            uint256 fundingProgress,
            uint256 timeRemaining,
            uint256 lenderCount
        )
    {
        pool = fundingPools[loanId];
        fundingProgress = pool.targetAmount > 0
            ? (pool.currentAmount * BASIS_POINTS) / pool.targetAmount
            : 0;
        timeRemaining = block.timestamp < pool.fundingDeadline
            ? pool.fundingDeadline - block.timestamp
            : 0;
        lenderCount = loanContributions[loanId].length;
    }

    /**
     * @notice Get lender's contribution details
     */
    function getLenderContribution(
        uint256 loanId,
        address lender
    )
        external
        view
        returns (
            LenderContribution memory contribution,
            uint256 projectedInterest,
            bool canWithdraw
        )
    {
        uint256 index = lenderContributionIndex[loanId][lender];
        require(index > 0, "No contribution found");

        contribution = loanContributions[loanId][index - 1];
        projectedInterest = lenderInterestEarned[loanId][lender];

        LoanFundingPool memory pool = fundingPools[loanId];
        canWithdraw =
            (!pool.isFunded && block.timestamp > pool.fundingDeadline) ||
            contribution.hasWithdrawn;
    }

    /**
     * @notice Get all loan contributions
     */
    function getAllContributions(
        uint256 loanId
    ) external view returns (LenderContribution[] memory) {
        return loanContributions[loanId];
    }

    /**
     * @notice Get lender's participation history
     */
    function getLenderParticipations(
        address lender
    ) external view returns (uint256[] memory) {
        return lenderParticipations[lender];
    }

    /**
     * @notice Get funding statistics
     */
    function getFundingStats()
        external
        view
        returns (
            uint256 totalPoolsCreated,
            uint256 totalAmountFunded,
            uint256 averagePoolSize,
            uint256 successRate
        )
    {
        // This would be implemented with proper tracking variables
        // For now, returning placeholder values
        totalPoolsCreated = 0;
        totalAmountFunded = 0;
        averagePoolSize = 0;
        successRate = 0;
    }

    /**
     * @notice Check if loan can use multi-lender funding
     */
    function canUseMultiLenderFunding(
        uint256 loanAmount,
        address token
    ) external pure returns (bool canUse, string memory reason) {
        if (loanAmount < 100 * 1e18) {
            // 100 tokens minimum
            return (false, "Loan amount too small for multi-lender funding");
        }

        return (true, "Eligible for multi-lender funding");
    }

    // Receive function for native token payments
    receive() external payable {
        // Accept native token repayments
    }
}
