// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./CeloLend.sol";
import "./CollateralVault.sol";
import "./PriceOracle.sol";

/**
 * @title LoanRepayment
 * @dev Handles loan repayments, interest calculations, and early payment discounts
 */
contract LoanRepayment is ReentrancyGuard {
    CeloLend public immutable celoLend;
    CollateralVault public immutable collateralVault;
    PriceOracle public immutable priceOracle;

    // Loan repayment status
    enum RepaymentStatus {
        Active,
        Repaid,
        Liquidated,
        Defaulted
    }

    struct LoanRepaymentInfo {
        uint256 loanId;
        uint256 principalAmount;
        uint256 interestRate; // Annual rate in basis points
        uint256 startTime;
        uint256 duration;
        uint256 totalRepaid;
        uint256 lastPaymentTime;
        RepaymentStatus status;
        address lender; // set to CeloLend when multi-lender; split handled via claim
        address borrower;
        address loanToken;
        bool isEarlyRepayment;
    }

    // Mapping from loan ID to repayment info
    mapping(uint256 => LoanRepaymentInfo) public loanRepayments;

    // Early repayment discount: 2% discount for paying off early
    uint256 public constant EARLY_REPAYMENT_DISCOUNT = 200; // 2% in basis points
    uint256 public constant BASIS_POINTS = 10000;

    // Grace period before liquidation: 7 days
    uint256 public constant GRACE_PERIOD = 7 days;

    event LoanRepaymentInitiated(
        uint256 indexed loanId,
        address indexed borrower,
        address indexed lender
    );
    event PaymentMade(
        uint256 indexed loanId,
        uint256 amount,
        uint256 interestPaid,
        uint256 principalPaid
    );
    event LoanFullyRepaid(
        uint256 indexed loanId,
        uint256 totalRepaid,
        bool isEarlyRepayment
    );
    event LoanDefaulted(uint256 indexed loanId, uint256 timeOverdue);

    constructor(
        address payable _celoLend,
        address payable _collateralVault,
        address _priceOracle
    ) {
        celoLend = CeloLend(_celoLend);
        collateralVault = CollateralVault(_collateralVault);
        priceOracle = PriceOracle(_priceOracle);
    }

    /**
     * @notice Initialize repayment tracking when a loan is funded
     * @param loanId The ID of the funded loan
     * @param lender Address of the lender who funded the loan
     */
    function initializeLoanRepayment(uint256 loanId, address lender) external {
        require(
            msg.sender == address(celoLend),
            "Only CeloLend can initialize"
        );

        // Get loan details from CeloLend
        CeloLend.LoanRequest memory loanRequest = celoLend.getLoanRequest(
            loanId
        );

        require(loanRequest.isFunded, "Loan must be funded");
        require(
            loanRepayments[loanId].loanId == 0,
            "Repayment already initialized"
        );

        loanRepayments[loanId] = LoanRepaymentInfo({
            loanId: loanId,
            principalAmount: loanRequest.amount,
            interestRate: loanRequest.interestRate,
            startTime: block.timestamp,
            duration: loanRequest.duration,
            totalRepaid: 0,
            lastPaymentTime: 0,
            status: RepaymentStatus.Active,
            lender: lender,
            borrower: loanRequest.borrower,
            loanToken: loanRequest.tokenAddress,
            isEarlyRepayment: false
        });

        emit LoanRepaymentInitiated(loanId, loanRequest.borrower, lender);
    }

    /**
     * @notice Calculate current amount owed including accrued interest
     * @param loanId The loan ID to calculate for
     * @return totalOwed Total amount owed (principal + interest)
     * @return interestOwed Interest portion only
     */
    function calculateAmountOwed(
        uint256 loanId
    ) public view returns (uint256 totalOwed, uint256 interestOwed) {
        LoanRepaymentInfo memory loan = loanRepayments[loanId];
        require(loan.loanId != 0, "Loan not found");

        if (loan.status != RepaymentStatus.Active) {
            return (0, 0);
        }

        uint256 timeElapsed = block.timestamp - loan.startTime;
        uint256 remainingPrincipal = loan.principalAmount - loan.totalRepaid;

        // Calculate interest: Principal * Rate * Time / (365 days * 10000 basis points)
        interestOwed =
            (remainingPrincipal * loan.interestRate * timeElapsed) /
            (365 days * BASIS_POINTS);

        totalOwed = remainingPrincipal + interestOwed;

        // Apply early repayment discount if loan is being paid off before maturity
        uint256 loanEndTime = loan.startTime + loan.duration;
        if (block.timestamp < loanEndTime && remainingPrincipal > 0) {
            uint256 discount = (interestOwed * EARLY_REPAYMENT_DISCOUNT) /
                BASIS_POINTS;
            if (interestOwed > discount) {
                interestOwed -= discount;
                totalOwed = remainingPrincipal + interestOwed;
            }
        }
    }

    /**
     * @notice Make a payment towards a loan
     * @param loanId The loan ID to pay
     * @param amount Amount to pay (0 means pay full amount owed)
     */
    function makePayment(
        uint256 loanId,
        uint256 amount
    ) external payable nonReentrant {
        LoanRepaymentInfo storage loan = loanRepayments[loanId];
        require(loan.loanId != 0, "Loan not found");
        require(loan.status == RepaymentStatus.Active, "Loan not active");
        // Allow third-party payments on behalf of borrower

        (uint256 totalOwed, uint256 interestOwed) = calculateAmountOwed(loanId);
        require(totalOwed > 0, "No amount owed");

        uint256 paymentAmount = amount;
        if (paymentAmount == 0 || paymentAmount > totalOwed) {
            paymentAmount = totalOwed;
        }

        // Handle payment transfer
        if (loan.loanToken == address(0)) {
            // Native token (CELO)
            require(msg.value >= paymentAmount, "Insufficient CELO sent");

            // If multi-lender (lender == CeloLend), split to all lenders
            if (loan.lender == address(celoLend)) {
                address[] memory lenders = celoLend.getLendersByLoan(loanId);
                uint256 totalFunded = celoLend.getTotalFundedByLoan(loanId);
                for (uint i = 0; i < lenders.length; i++) {
                    address l = lenders[i];
                    uint256 contributed = celoLend.getLenderContribution(
                        loanId,
                        l
                    );
                    if (contributed > 0) {
                        uint256 share = (paymentAmount * contributed) /
                            totalFunded;
                        if (share > 0) {
                            (bool ok, ) = payable(l).call{value: share}("");
                            require(ok, "Lender payout failed");
                        }
                    }
                }
            } else {
                // Single lender case
                (bool success, ) = payable(loan.lender).call{
                    value: paymentAmount
                }("");
                require(success, "Payment transfer failed");
            }

            // Refund excess
            if (msg.value > paymentAmount) {
                (bool refundSuccess, ) = payable(msg.sender).call{
                    value: msg.value - paymentAmount
                }("");
                require(refundSuccess, "Refund failed");
            }
        } else {
            // ERC20 token
            require(msg.value == 0, "No ETH needed for ERC20 payment");
            if (loan.lender == address(celoLend)) {
                address[] memory lenders = celoLend.getLendersByLoan(loanId);
                uint256 totalFunded = celoLend.getTotalFundedByLoan(loanId);
                for (uint i = 0; i < lenders.length; i++) {
                    address l = lenders[i];
                    uint256 contributed = celoLend.getLenderContribution(
                        loanId,
                        l
                    );
                    if (contributed > 0) {
                        uint256 share = (paymentAmount * contributed) /
                            totalFunded;
                        if (share > 0) {
                            IERC20(loan.loanToken).transferFrom(
                                msg.sender,
                                l,
                                share
                            );
                        }
                    }
                }
            } else {
                IERC20(loan.loanToken).transferFrom(
                    msg.sender,
                    loan.lender,
                    paymentAmount
                );
            }
        }

        // Calculate how much goes to interest vs principal
        uint256 interestPaid = paymentAmount > interestOwed
            ? interestOwed
            : paymentAmount;
        uint256 principalPaid = paymentAmount - interestPaid;

        // Update loan state
        loan.totalRepaid += principalPaid;
        loan.lastPaymentTime = block.timestamp;

        emit PaymentMade(loanId, paymentAmount, interestPaid, principalPaid);

        // Check if loan is fully repaid
        if (loan.totalRepaid >= loan.principalAmount) {
            loan.status = RepaymentStatus.Repaid;
            uint256 loanEndTime = loan.startTime + loan.duration;
            loan.isEarlyRepayment = block.timestamp < loanEndTime;

            // Release collateral back to borrower
            // Get loan details from CeloLend to get collateral info
            CeloLend.LoanRequest memory loanRequest = celoLend.getLoanRequest(
                loanId
            );
            collateralVault.releaseCollateralAfterRepayment(
                loanId,
                loan.borrower,
                loanRequest.collateralToken,
                loanRequest.collateralAmount
            );

            emit LoanFullyRepaid(
                loanId,
                loan.totalRepaid,
                loan.isEarlyRepayment
            );
        }
    }

    /**
     * @notice Check if a loan is overdue and can be liquidated
     * @param loanId The loan ID to check
     * @return isOverdue Whether the loan is past due
     * @return canLiquidate Whether liquidation can proceed
     */
    function isLoanOverdue(
        uint256 loanId
    ) external view returns (bool isOverdue, bool canLiquidate) {
        LoanRepaymentInfo memory loan = loanRepayments[loanId];
        require(loan.loanId != 0, "Loan not found");

        if (loan.status != RepaymentStatus.Active) {
            return (false, false);
        }

        uint256 loanEndTime = loan.startTime + loan.duration;
        isOverdue = block.timestamp > loanEndTime;
        canLiquidate =
            isOverdue &&
            (block.timestamp > loanEndTime + GRACE_PERIOD);
    }

    /**
     * @notice Mark a loan as defaulted (callable after grace period)
     * @param loanId The loan ID to default
     */
    function markAsDefaulted(uint256 loanId) external {
        LoanRepaymentInfo storage loan = loanRepayments[loanId];
        require(loan.loanId != 0, "Loan not found");
        require(loan.status == RepaymentStatus.Active, "Loan not active");

        uint256 loanEndTime = loan.startTime + loan.duration;
        require(
            block.timestamp > loanEndTime + GRACE_PERIOD,
            "Grace period not elapsed"
        );

        loan.status = RepaymentStatus.Defaulted;
        uint256 timeOverdue = block.timestamp - loanEndTime;

        emit LoanDefaulted(loanId, timeOverdue);
    }

    /**
     * @notice Get detailed repayment information for a loan
     * @param loanId The loan ID to query
     */
    function getLoanRepaymentInfo(
        uint256 loanId
    )
        external
        view
        returns (
            LoanRepaymentInfo memory repaymentInfo,
            uint256 currentAmountOwed,
            uint256 currentInterestOwed,
            bool isOverdue,
            bool canLiquidate
        )
    {
        repaymentInfo = loanRepayments[loanId];
        (currentAmountOwed, currentInterestOwed) = calculateAmountOwed(loanId);
        (isOverdue, canLiquidate) = this.isLoanOverdue(loanId);
    }

    /**
     * @notice Get simple repayment status for frontend
     * @param loanId The loan ID to query
     */
    function getRepaymentStatus(
        uint256 loanId
    )
        external
        view
        returns (
            RepaymentStatus status,
            uint256 amountOwed,
            uint256 daysOverdue
        )
    {
        LoanRepaymentInfo memory loan = loanRepayments[loanId];
        status = loan.status;

        if (status == RepaymentStatus.Active) {
            (amountOwed, ) = calculateAmountOwed(loanId);

            uint256 loanEndTime = loan.startTime + loan.duration;
            if (block.timestamp > loanEndTime) {
                daysOverdue = (block.timestamp - loanEndTime) / 1 days;
            }
        }
    }
}
