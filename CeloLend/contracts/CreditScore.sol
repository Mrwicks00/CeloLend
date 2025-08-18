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

        // Update average interest rate (weighted)
        profile.averageInterestRate = _calculateWeightedAverageRate(
            profile.averageInterestRate,
            profile.totalBorrowed - loanAmount,
            interestRate,
            loanAmount
        );

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

    function getCreditTier(
        address user
    ) external view returns (string memory tier, uint256 maxLoanAmount) {
        uint256 score = this.getCreditScore(user);

        if (score >= 90) {
            return ("Excellent", 50000 * 1e18); // 50K CELO max
        } else if (score >= 80) {
            return ("Very Good", 25000 * 1e18); // 25K CELO max
        } else if (score >= 70) {
            return ("Good", 10000 * 1e18); // 10K CELO max
        } else if (score >= 60) {
            return ("Fair", 5000 * 1e18); // 5K CELO max
        } else if (score >= 50) {
            return ("Poor", 1000 * 1e18); // 1K CELO max
        } else {
            return ("Very Poor", 100 * 1e18); // 100 CELO max
        }
    }

    function getRecommendedInterestRate(
        address user,
        uint256 baseRate
    ) external view returns (uint256) {
        uint256 score = this.getCreditScore(user);

        if (score == 0) {
            return baseRate + 1000; // +10% for uninitialized users
        }

        // Higher credit score = lower interest rate
        // Score 100 = no additional rate, Score 0 = +15% additional rate
        uint256 creditAdjustment = ((100 - score) * 1500) / 100; // Max 15% additional
        return baseRate + creditAdjustment;
    }

    function isEligibleForLoan(
        address user,
        uint256 loanAmount
    )
        external
        view
        returns (bool eligible, string memory reason, uint256 maxAllowed)
    {
        if (!creditProfiles[user].isInitialized) {
            return (false, "User not verified", 0);
        }

        (, uint256 maxLoanAmount) = this.getCreditTier(user);

        if (loanAmount > maxLoanAmount) {
            return (false, "Amount exceeds credit tier limit", maxLoanAmount);
        }

        uint256 score = this.getCreditScore(user);
        if (score < 30) {
            return (false, "Credit score too low", maxLoanAmount);
        }

        return (true, "Eligible", maxLoanAmount);
    }

    function getBatchCreditScores(
        address[] calldata users
    ) external view returns (uint256[] memory scores) {
        scores = new uint256[](users.length);
        for (uint i = 0; i < users.length; i++) {
            scores[i] = this.getCreditScore(users[i]);
        }
        return scores;
    }

    function getPlatformStats()
        external
        view
        returns (
            uint256 totalUsers,
            uint256 averageCreditScore,
            uint256 platformSuccessfulLoans,
            uint256 platformDefaults,
            uint256 platformSuccessRate,
            uint256 totalVolume
        )
    {
        totalUsers = totalVerifiedUsers;
        platformSuccessfulLoans = totalSuccessfulLoans;
        platformDefaults = totalDefaultedLoans;
        totalVolume = totalVolumeProcessed;

        // Calculate success rate
        uint256 totalLoans = platformSuccessfulLoans + platformDefaults;
        platformSuccessRate = totalLoans > 0
            ? (platformSuccessfulLoans * 100) / totalLoans
            : 0;

        // Calculate average credit score (simplified)
        averageCreditScore = 50; // Default to starting score
    }

    // ADMIN FUNCTIONS

    function setAuthorizedContract(
        address contractAddr,
        bool authorized
    ) external onlyOwner {
        authorizedContracts[contractAddr] = authorized;
        emit AuthorizedContractUpdated(contractAddr, authorized);
    }

    function setScoringParameters(
        uint256 _successfulRepaymentBonus,
        uint256 _defaultPenalty,
        uint256 _timeDecayFactor
    ) external onlyOwner {
        require(_successfulRepaymentBonus <= 20, "Bonus too high");
        require(_defaultPenalty <= 50, "Penalty too high");
        require(_timeDecayFactor <= 10, "Decay factor too high");

        successfulRepaymentBonus = _successfulRepaymentBonus;
        defaultPenalty = _defaultPenalty;
        timeDecayFactor = _timeDecayFactor;
    }

    function adjustUserCreditScore(
        address user,
        uint256 newScore,
        string calldata reason
    ) external onlyOwner {
        require(creditProfiles[user].isInitialized, "User not initialized");
        require(newScore <= MAX_CREDIT_SCORE, "Score too high");

        uint256 oldScore = creditProfiles[user].creditScore;
        creditProfiles[user].creditScore = newScore;
        creditProfiles[user].lastUpdateTime = block.timestamp;

        emit CreditScoreUpdated(user, oldScore, newScore);
    }

    function batchInitializeUsers(address[] calldata users) external onlyOwner {
        for (uint i = 0; i < users.length; i++) {
            if (!creditProfiles[users[i]].isInitialized) {
                creditProfiles[users[i]] = CreditProfile({
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

                emit CreditProfileInitialized(users[i], INITIAL_CREDIT_SCORE);
            }
        }
    }

    // INTERNAL HELPER FUNCTIONS

    function _calculateNewScore(
        address user,
        bool isSuccessful
    ) internal view returns (uint256) {
        CreditProfile memory profile = creditProfiles[user];
        uint256 currentScore = profile.creditScore;

        if (isSuccessful) {
            // Bonus for successful repayment
            uint256 bonus = successfulRepaymentBonus;

            // Extra bonus for consistent performance
            if (profile.successfulLoans > 0 && profile.defaultedLoans == 0) {
                bonus += 2; // Consistency bonus
            }

            currentScore = currentScore + bonus;
        } else {
            // Penalty for default
            uint256 penalty = defaultPenalty;

            // Heavier penalty for repeat defaulters
            if (profile.defaultedLoans > 0) {
                penalty += 5; // Repeat offender penalty
            }

            currentScore = currentScore > penalty
                ? currentScore - penalty
                : MIN_CREDIT_SCORE;
        }

        // Apply time decay (simplified - reduces score slightly over time without activity)
        uint256 timeSinceLastUpdate = block.timestamp - profile.lastUpdateTime;
        uint256 yearsSinceUpdate = timeSinceLastUpdate / 365 days;
        if (yearsSinceUpdate > 0 && currentScore > MIN_CREDIT_SCORE) {
            uint256 decay = yearsSinceUpdate * timeDecayFactor;
            currentScore = currentScore > decay
                ? currentScore - decay
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

    function _calculateWeightedAverageRate(
        uint256 currentAvgRate,
        uint256 currentTotalAmount,
        uint256 newRate,
        uint256 newAmount
    ) internal pure returns (uint256) {
        if (currentTotalAmount == 0) {
            return newRate;
        }

        uint256 totalWeightedRate = (currentAvgRate * currentTotalAmount) +
            (newRate * newAmount);
        uint256 totalAmount = currentTotalAmount + newAmount;

        return totalWeightedRate / totalAmount;
    }
}
