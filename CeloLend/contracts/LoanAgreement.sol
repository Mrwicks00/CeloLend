// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./CollateralVault.sol";
import "./CreditScore.sol";
import "./PriceOracle.sol";

contract LoanAgreement is ReentrancyGuard {
    enum LoanStatus {
        Active,
        Repaid,
        Defaulted,
        Liquidated
    }

    // Loan details
    address public borrower;
    address public lender;
    uint256 public principal;
    address public loanToken;
    uint256 public interestRate; // Annual rate in basis points
    uint256 public duration; // Duration in seconds
    uint256 public collateralAmount;
    address public collateralToken;

    // Contract addresses
    CollateralVault public collateralVault;
    CreditScore public creditScore;
    PriceOracle public priceOracle;

    // Loan state
    LoanStatus public status;
    uint256 public startTime;
    uint256 public endTime;
    uint256 public totalRepaid;
    uint256 public lastPaymentTime;

    // Repayment tracking
    struct Payment {
        uint256 amount;
        uint256 timestamp;
        uint256 principalPaid;
        uint256 interestPaid;
    }

    Payment[] public payments;

    // Constants
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant SECONDS_PER_YEAR = 365 days;

    // Events
    event LoanStarted(uint256 startTime, uint256 endTime);
    event PaymentMade(
        uint256 amount,
        uint256 principalPaid,
        uint256 interestPaid
    );
    event LoanRepaid(uint256 totalAmount, uint256 timestamp);
    event LoanDefaulted(uint256 timestamp);
    event LoanLiquidated(uint256 collateralSold, uint256 timestamp);

    modifier onlyBorrower() {
        require(msg.sender == borrower, "Only borrower can call this");
        _;
    }

    modifier onlyLender() {
        require(msg.sender == lender, "Only lender can call this");
        _;
    }

    modifier loanActive() {
        require(status == LoanStatus.Active, "Loan not active");
        _;
    }

    constructor(
        address _borrower,
        address _lender,
        uint256 _principal,
        address _loanToken,
        uint256 _interestRate,
        uint256 _duration,
        uint256 _collateralAmount,
        address _collateralToken,
        address payable _collateralVault,
        address _creditScore,
        address _priceOracle
    ) {
        borrower = _borrower;
        lender = _lender;
        principal = _principal;
        loanToken = _loanToken;
        interestRate = _interestRate;
        duration = _duration;
        collateralAmount = _collateralAmount;
        collateralToken = _collateralToken;
        collateralVault = CollateralVault(_collateralVault);
        creditScore = CreditScore(_creditScore);
        priceOracle = PriceOracle(_priceOracle);

        status = LoanStatus.Active;
        startTime = block.timestamp;
        endTime = startTime + duration;
        lastPaymentTime = startTime;

        // Store principal in contract - borrower can claim later
        // This avoids constructor transfer failures
        if (loanToken == address(0)) {
            // Native tokens are already in contract via msg.value
            // Store the amount for borrower to claim
        } else {
            // ERC20 tokens are already transferred to this contract
            // Store the amount for borrower to claim
        }

        emit LoanStarted(startTime, endTime);
    }

    // Allow borrower to claim their loan funds
    function claimLoanFunds() external onlyBorrower {
        require(status == LoanStatus.Active, "Loan not active");
        require(block.timestamp >= startTime, "Loan not started yet");

        if (loanToken == address(0)) {
            // Transfer native tokens to borrower
            (bool success, ) = borrower.call{value: principal}("");
            require(success, "Native token transfer failed");
        } else {
            // Transfer ERC20 tokens to borrower
            IERC20(loanToken).transfer(borrower, principal);
        }
    }

    // Calculate current amount owed (principal + accrued interest)
    function calculateAmountOwed()
        public
        view
        returns (uint256 totalOwed, uint256 interestOwed)
    {
        if (status != LoanStatus.Active) {
            return (0, 0);
        }

        uint256 timeElapsed = block.timestamp - startTime;
        uint256 maxTime = endTime - startTime;

        // Don't accrue interest beyond loan term
        if (timeElapsed > maxTime) {
            timeElapsed = maxTime;
        }

        // Calculate accrued interest: principal * rate * time / (SECONDS_PER_YEAR * BASIS_POINTS)
        interestOwed =
            (principal * interestRate * timeElapsed) /
            (SECONDS_PER_YEAR * BASIS_POINTS);
        totalOwed = principal + interestOwed - totalRepaid;

        return (totalOwed, interestOwed);
    }

    // Make a payment (partial or full)
    function makePayment(
        uint256 amount
    ) external payable onlyBorrower loanActive nonReentrant {
        require(amount > 0, "Payment amount must be positive");

        (uint256 totalOwed, uint256 interestOwed) = calculateAmountOwed();
        require(totalOwed > 0, "No amount owed");
        require(amount <= totalOwed, "Payment exceeds amount owed");

        // Transfer payment from borrower
        if (loanToken == address(0)) {
            // Native token payment
            require(
                msg.value == amount,
                "Incorrect native token payment amount"
            );
        } else {
            // ERC20 token payment
            IERC20(loanToken).transferFrom(msg.sender, address(this), amount);
        }

        // Calculate principal and interest portions
        uint256 totalInterestOwed = interestOwed - _getTotalInterestPaid();
        uint256 interestPortion = amount > totalInterestOwed
            ? totalInterestOwed
            : amount;
        uint256 principalPortion = amount - interestPortion;

        // Record payment
        payments.push(
            Payment({
                amount: amount,
                timestamp: block.timestamp,
                principalPaid: principalPortion,
                interestPaid: interestPortion
            })
        );

        totalRepaid += amount;
        lastPaymentTime = block.timestamp;

        // Transfer to lender
        if (loanToken == address(0)) {
            // Native token transfer to lender
            (bool success, ) = lender.call{value: amount}("");
            require(success, "Native token transfer to lender failed");
        } else {
            // ERC20 token transfer
            IERC20(loanToken).transfer(lender, amount);
        }

        emit PaymentMade(amount, principalPortion, interestPortion);

        // Check if loan is fully repaid
        if (totalRepaid >= principal + interestOwed) {
            _completeLoan();
        }
    }

    // Repay full loan amount
    function repayLoan() external payable onlyBorrower loanActive nonReentrant {
        (uint256 totalOwed, ) = calculateAmountOwed();
        require(totalOwed > 0, "No amount owed");

        // For native token, require exact msg.value
        if (loanToken == address(0)) {
            require(msg.value == totalOwed, "Incorrect repayment amount");
        }

        // Process the payment directly instead of calling makePayment
        _processRepayment(totalOwed);
    }

    // Internal function to process repayment
    function _processRepayment(uint256 amount) internal {
        (uint256 totalOwed, uint256 interestOwed) = calculateAmountOwed();
        require(amount <= totalOwed, "Payment exceeds amount owed");

        // Transfer payment from borrower (if ERC20)
        if (loanToken != address(0)) {
            IERC20(loanToken).transferFrom(msg.sender, address(this), amount);
        }
        // For native token, funds already received via msg.value

        // Calculate principal and interest portions
        uint256 totalInterestOwed = interestOwed - _getTotalInterestPaid();
        uint256 interestPortion = amount > totalInterestOwed
            ? totalInterestOwed
            : amount;
        uint256 principalPortion = amount - interestPortion;

        // Record payment
        payments.push(
            Payment({
                amount: amount,
                timestamp: block.timestamp,
                principalPaid: principalPortion,
                interestPaid: interestPortion
            })
        );

        totalRepaid += amount;
        lastPaymentTime = block.timestamp;

        // Transfer to lender
        if (loanToken == address(0)) {
            // Native token transfer to lender
            (bool success, ) = lender.call{value: amount}("");
            require(success, "Native token transfer to lender failed");
        } else {
            // ERC20 token transfer
            IERC20(loanToken).transfer(lender, amount);
        }

        emit PaymentMade(amount, principalPortion, interestPortion);

        // Check if loan is fully repaid
        if (totalRepaid >= principal + interestOwed) {
            _completeLoan();
        }
    }

    // Check if loan is overdue
    function isOverdue() public view returns (bool) {
        return block.timestamp > endTime && status == LoanStatus.Active;
    }

    // Mark loan as defaulted (can be called by lender after grace period)
    function markAsDefaulted() external onlyLender {
        require(isOverdue(), "Loan not overdue");
        require(block.timestamp > endTime + 7 days, "Grace period not over"); // 7 day grace period

        status = LoanStatus.Defaulted;

        // Update borrower's credit score negatively
        creditScore.recordDefault(borrower);

        emit LoanDefaulted(block.timestamp);
    }

    // Liquidate collateral (after default)
    function liquidateCollateral() external onlyLender nonReentrant {
        require(status == LoanStatus.Defaulted, "Loan must be defaulted");

        // Calculate remaining debt
        (uint256 totalOwed, ) = calculateAmountOwed();

        // Request liquidation from collateral vault
        uint256 liquidationAmount = collateralVault.liquidateCollateral(
            borrower,
            collateralToken,
            collateralAmount,
            totalOwed,
            lender
        );

        status = LoanStatus.Liquidated;

        emit LoanLiquidated(liquidationAmount, block.timestamp);
    }

    // GETTER FUNCTIONS

    function getLoanDetails()
        external
        view
        returns (
            address _borrower,
            address _lender,
            uint256 _principal,
            address _loanToken,
            uint256 _interestRate,
            uint256 _duration,
            LoanStatus _status,
            uint256 _startTime,
            uint256 _endTime
        )
    {
        return (
            borrower,
            lender,
            principal,
            loanToken,
            interestRate,
            duration,
            status,
            startTime,
            endTime
        );
    }

    function getRepaymentStatus()
        external
        view
        returns (
            uint256 totalOwed,
            uint256 interestOwed,
            uint256 _totalRepaid,
            uint256 remainingBalance,
            bool _isOverdue
        )
    {
        (totalOwed, interestOwed) = calculateAmountOwed();
        remainingBalance = totalOwed;
        return (
            totalOwed,
            interestOwed,
            totalRepaid,
            remainingBalance,
            isOverdue()
        );
    }

    function getCollateralDetails()
        external
        view
        returns (
            address _collateralToken,
            uint256 _collateralAmount,
            uint256 collateralRatio
        )
    {
        // Simplified collateral ratio calculation (1:1 for now)
        collateralRatio = 10000; // 100% ratio
        return (collateralToken, collateralAmount, collateralRatio);
    }

    function getPaymentHistory() external view returns (Payment[] memory) {
        return payments;
    }

    function getPaymentCount() external view returns (uint256) {
        return payments.length;
    }

    function getPayment(uint256 index) external view returns (Payment memory) {
        require(index < payments.length, "Payment index out of bounds");
        return payments[index];
    }

    function getLoanProgress()
        external
        view
        returns (
            uint256 timeElapsed,
            uint256 totalDuration,
            uint256 progressPercentage,
            uint256 daysRemaining
        )
    {
        timeElapsed = block.timestamp > startTime
            ? block.timestamp - startTime
            : 0;
        totalDuration = duration;

        if (timeElapsed >= totalDuration) {
            progressPercentage = 100;
            daysRemaining = 0;
        } else {
            progressPercentage = (timeElapsed * 100) / totalDuration;
            daysRemaining = (totalDuration - timeElapsed) / 1 days;
        }

        return (timeElapsed, totalDuration, progressPercentage, daysRemaining);
    }

    // INTERNAL FUNCTIONS

    function _completeLoan() internal {
        status = LoanStatus.Repaid;

        // Release collateral back to borrower
        collateralVault.releaseCollateral(
            borrower,
            collateralToken,
            collateralAmount,
            0
        );

        // Update borrower's credit score positively
        creditScore.recordSuccessfulRepayment(
            borrower,
            principal,
            interestRate
        );

        emit LoanRepaid(totalRepaid, block.timestamp);
    }

    function _getTotalInterestPaid() internal view returns (uint256) {
        uint256 totalInterestPaid = 0;
        for (uint i = 0; i < payments.length; i++) {
            totalInterestPaid += payments[i].interestPaid;
        }
        return totalInterestPaid;
    }

    // Emergency functions (for admin/governance)
    function emergencyWithdraw() external {
        require(msg.sender == lender || msg.sender == borrower, "Unauthorized");
        require(
            status == LoanStatus.Defaulted || status == LoanStatus.Liquidated,
            "Not in emergency state"
        );

        uint256 balance = IERC20(loanToken).balanceOf(address(this));
        if (balance > 0) {
            IERC20(loanToken).transfer(lender, balance);
        }
    }

    // Receive function to accept native token payments
    receive() external payable {
        // Allow loan contract to receive native tokens
    }
}
