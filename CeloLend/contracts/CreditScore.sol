// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract CreditScore is Ownable {
    // Credit profile structure
    struct CreditProfile {
        uint256 creditScore; // 0-100 scale
        uint256 totalLoansCount; // Total number of loans taken
        uint256 successfulLoans; // Number of loans successfully repaid
        uint256 defaultedLoans; // Number of defaulted loans
        uint256 totalBorrowed; // Total amount ever borrowed
        uint256 totalRepaid; // Total amount successfully repaid
        uint256 averageInterestRate; // Weighted average interest rate
        uint256 lastUpdateTime; // Last time profile was updated
        bool isInitialized; // Whether user has been initialized
    }

    // Loan record for history tracking
    struct LoanRecord {
        uint256 loanId;
        uint256 amount;
        uint256 interestRate;
        uint256 startTime;
        uint256 endTime;
        bool wasSuccessful;
        bool wasDefaulted;
    }

    // Mappings
    mapping(address => CreditProfile) public creditProfiles;
    mapping(address => LoanRecord[]) public userLoanHistory;
    mapping(address => bool) public authorizedContracts;

    // Platform statistics tracking
    uint256 public totalVerifiedUsers;
    uint256 public totalSuccessfulLoans;
    uint256 public totalDefaultedLoans;
    uint256 public totalVolumeProcessed;

    // Credit scoring parameters
    uint256 public constant INITIAL_CREDIT_SCORE = 50; // Starting score for new users
    uint256 public constant MAX_CREDIT_SCORE = 100;
    uint256 public constant MIN_CREDIT_SCORE = 0;

    // Score adjustment factors
    uint256 public successfulRepaymentBonus = 5; // Points added for successful repayment
    uint256 public defaultPenalty = 15; // Points deducted for default
    uint256 public timeDecayFactor = 1; // Points decay over time (per year)

    // Undercollateralized lending risk tiers
    enum RiskTier {
        HIGH_RISK, // 0-30 credit score
        MEDIUM_RISK, // 31-70 credit score
        LOW_RISK, // 71-85 credit score
        PREMIUM // 86-100 credit score
    }

    struct RiskProfile {
        RiskTier tier;
        uint256 maxUndercollateralizedAmount;
        uint256 maxLoanToValueRatio; // e.g., 50% = 5000 basis points
        uint256 interestRateMultiplier; // e.g., 1.2x for higher risk
        bool eligibleForUndercollateralized;
    }

    // Events
    event CreditProfileInitialized(address indexed user, uint256 initialScore);
    event CreditScoreUpdated(
        address indexed user,
        uint256 oldScore,
        uint256 newScore
    );
    event SuccessfulRepaymentRecorded(
        address indexed user,
        uint256 loanAmount,
        uint256 interestRate
    );
    event DefaultRecorded(address indexed user, uint256 loanAmount);
    event AuthorizedContractUpdated(
        address indexed contractAddr,
        bool authorized
    );

    modifier onlyAuthorized() {
        require(authorizedContracts[msg.sender], "Not authorized contract");
        _;
    }

    constructor() Ownable(msg.sender) {}

    // Initialize credit profile for new verified user
    function initializeUser(address user) external onlyAuthorized {
        require(
            !creditProfiles[user].isInitialized,
            "User already initialized"
        );

        creditProfiles[user] = CreditProfile({
            creditScore: INITIAL_CREDIT_SCORE,
            totalLoansCount: 0,
            successfulLoans: 0,
            defaultedLoans: 0,
            totalBorrowed: 0,
            totalRepaid: 0,
            averageInterestRate: 0,
            lastUpdateTime: block.timestamp,
            isInitialized: true
        });

        // Update platform stats
        totalVerifiedUsers++;

        emit CreditProfileInitialized(user, INITIAL_CREDIT_SCORE);
    }

    // Record successful loan repayment
    function recordSuccessfulRepayment(
        address user,
        uint256 loanAmount,
        uint256 interestRate
    ) external onlyAuthorized {
        require(creditProfiles[user].isInitialized, "User not initialized");

        CreditProfile storage profile = creditProfiles[user];
        uint256 oldScore = profile.creditScore;

        // Update loan counts
        profile.totalLoansCount += 1;
        profile.successfulLoans += 1;

        // Update global stats
        totalSuccessfulLoans++;
        totalVolumeProcessed += loanAmount;

        // Update financial metrics
        profile.totalBorrowed += loanAmount;
        profile.totalRepaid += loanAmount; // Simplified - doesn't include interest

        // Update average interest rate (simplified)
        profile.averageInterestRate = interestRate;

        // Calculate new credit score
        uint256 newScore = _calculateNewScore(user, true);
        profile.creditScore = newScore;
        profile.lastUpdateTime = block.timestamp;

        // Add to loan history
        userLoanHistory[user].push(
            LoanRecord({
                loanId: profile.totalLoansCount, // Using count as simple ID
                amount: loanAmount,
                interestRate: interestRate,
                startTime: block.timestamp - 30 days, // Simplified
                endTime: block.timestamp,
                wasSuccessful: true,
                wasDefaulted: false
            })
        );

        emit SuccessfulRepaymentRecorded(user, loanAmount, interestRate);
        emit CreditScoreUpdated(user, oldScore, newScore);
    }

    // Record loan default
    function recordDefault(address user) external onlyAuthorized {
        require(creditProfiles[user].isInitialized, "User not initialized");

        CreditProfile storage profile = creditProfiles[user];
        uint256 oldScore = profile.creditScore;

        // Update loan counts
        profile.defaultedLoans += 1;

        // Update global stats
        totalDefaultedLoans++;

        // Calculate new credit score
        uint256 newScore = _calculateNewScore(user, false);
        profile.creditScore = newScore;
        profile.lastUpdateTime = block.timestamp;

        // Add to loan history
        userLoanHistory[user].push(
            LoanRecord({
                loanId: profile.totalLoansCount + 1,
                amount: 0, // Amount not tracked for defaults in this simplified version
                interestRate: 0,
                startTime: block.timestamp - 30 days, // Simplified
                endTime: block.timestamp,
                wasSuccessful: false,
                wasDefaulted: true
            })
        );

        emit DefaultRecorded(user, 0);
        emit CreditScoreUpdated(user, oldScore, newScore);
    }

    // GETTER FUNCTIONS

    function getCreditProfile(
        address user
    ) external view returns (CreditProfile memory) {
        return creditProfiles[user];
    }

    function getCreditScore(address user) external view returns (uint256) {
        if (!creditProfiles[user].isInitialized) {
            return 0;
        }
        return creditProfiles[user].creditScore;
    }

    /**
     * @dev Get risk profile for undercollateralized lending
     * @param user The user address
     * @return profile Risk profile with tier, limits, and eligibility
     */
    function getRiskProfile(
        address user
    ) external view returns (RiskProfile memory profile) {
        uint256 score = creditProfiles[user].creditScore;

        if (score >= 86) {
            profile.tier = RiskTier.PREMIUM;
            profile.maxLoanToValueRatio = 8000; // 80% LTV
            profile.maxUndercollateralizedAmount = 50000 * 1e18; // 50K max
            profile.interestRateMultiplier = 10000; // 1.0x
            profile.eligibleForUndercollateralized = true;
        } else if (score >= 71) {
            profile.tier = RiskTier.LOW_RISK;
            profile.maxLoanToValueRatio = 6000; // 60% LTV
            profile.maxUndercollateralizedAmount = 20000 * 1e18; // 20K max
            profile.interestRateMultiplier = 11000; // 1.1x
            profile.eligibleForUndercollateralized = true;
        } else if (score >= 31) {
            profile.tier = RiskTier.MEDIUM_RISK;
            profile.maxLoanToValueRatio = 4000; // 40% LTV
            profile.maxUndercollateralizedAmount = 5000 * 1e18; // 5K max
            profile.interestRateMultiplier = 13000; // 1.3x
            profile.eligibleForUndercollateralized = true;
        } else {
            profile.tier = RiskTier.HIGH_RISK;
            profile.maxLoanToValueRatio = 0; // No undercollateralized loans
            profile.maxUndercollateralizedAmount = 0;
            profile.interestRateMultiplier = 15000; // 1.5x
            profile.eligibleForUndercollateralized = false;
        }

        return profile;
    }

    function getUserLoanHistory(
        address user
    ) external view returns (LoanRecord[] memory) {
        return userLoanHistory[user];
    }

    function getUserStats(
        address user
    )
        external
        view
        returns (
            uint256 creditScore,
            uint256 totalLoans,
            uint256 successfulLoans,
            uint256 defaultedLoans,
            uint256 successRate,
            uint256 totalBorrowed,
            uint256 averageInterestRate
        )
    {
        CreditProfile memory profile = creditProfiles[user];

        if (!profile.isInitialized) {
            return (0, 0, 0, 0, 0, 0, 0);
        }

        successRate = profile.totalLoansCount > 0
            ? (profile.successfulLoans * 100) / profile.totalLoansCount
            : 0;

        return (
            profile.creditScore,
            profile.totalLoansCount,
            profile.successfulLoans,
            profile.defaultedLoans,
            successRate,
            profile.totalBorrowed,
            profile.averageInterestRate
        );
    }

    // Complex tier system removed - keep basic scoring

    // Interest rate calculation removed - keep basic scoring

    // Complex eligibility check removed - keep basic scoring

    // Batch functions removed - keep basic scoring

    // Platform stats removed - keep basic scoring

    // ADMIN FUNCTIONS

    function setAuthorizedContract(
        address contractAddr,
        bool authorized
    ) external onlyOwner {
        authorizedContracts[contractAddr] = authorized;
        emit AuthorizedContractUpdated(contractAddr, authorized);
    }

    // Complex admin functions removed - keep basic scoring

    // Batch functions removed - keep basic scoring

    // INTERNAL HELPER FUNCTIONS

    function _calculateNewScore(
        address user,
        bool isSuccessful
    ) internal view returns (uint256) {
        CreditProfile memory profile = creditProfiles[user];
        uint256 currentScore = profile.creditScore;

        if (isSuccessful) {
            // Simple bonus for successful repayment
            currentScore = currentScore + successfulRepaymentBonus;
        } else {
            // Simple penalty for default
            currentScore = currentScore > defaultPenalty
                ? currentScore - defaultPenalty
                : MIN_CREDIT_SCORE;
        }

        // Ensure score stays within bounds
        if (currentScore > MAX_CREDIT_SCORE) {
            currentScore = MAX_CREDIT_SCORE;
        }
        if (currentScore < MIN_CREDIT_SCORE) {
            currentScore = MIN_CREDIT_SCORE;
        }

        return currentScore;
    }

    // Complex rate calculation removed - keep basic scoring
}
