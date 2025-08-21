// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./CeloLend.sol";
import "./LoanRepayment.sol";
import "./Treasury.sol";

/**
 * @title InsurancePool
 * @dev Provides insurance coverage for loan defaults and manages risk assessment
 */
contract InsurancePool is ReentrancyGuard {
    CeloLend public immutable celoLend;
    LoanRepayment public immutable loanRepayment;
    Treasury public immutable treasury;

    // Insurance pool parameters
    uint256 public constant COVERAGE_RATIO = 8000; // 80% coverage on defaults
    uint256 public constant PREMIUM_RATE = 50; // 0.5% annual premium
    uint256 public constant MIN_POOL_RATIO = 1500; // 15% minimum pool to loans ratio
    uint256 public constant BASIS_POINTS = 10000;

    // Pool state
    mapping(address => uint256) public poolBalances; // Token balances in pool
    mapping(address => uint256) public totalCoveredAmount; // Total loans covered by token
    mapping(address => uint256) public totalClaims; // Total claims paid by token
    mapping(address => uint256) public premiumsCollected; // Premiums collected by token

    // Insurance policies
    struct InsurancePolicy {
        uint256 loanId;
        address lender;
        address borrower;
        uint256 coveredAmount; // Amount covered by insurance
        uint256 premiumPaid; // Premium paid for coverage
        uint256 coverageStart; // When coverage began
        uint256 coverageEnd; // When coverage expires
        bool isActive;
        bool hasClaimed;
    }

    mapping(uint256 => InsurancePolicy) public policies;
    mapping(address => uint256[]) public lenderPolicies; // Policies by lender
    mapping(address => uint256) public providerBalances; // Insurance provider balances

    // Provider system for insurance backing
    struct InsuranceProvider {
        uint256 stakedAmount; // Amount staked to provide insurance
        uint256 rewardsEarned; // Rewards earned from premiums
        uint256 claimsPaid; // Claims paid out
        uint256 lastRewardTime; // Last time rewards were calculated
        bool isActive;
    }

    mapping(address => InsuranceProvider) public providers;
    address[] public activeProviders;
    uint256 public totalStakedAmount;
    uint256 public totalProviderRewards;

    // Risk assessment
    mapping(address => uint256) public borrowerRiskScores; // 0-10000 scale
    mapping(address => uint256) public defaultHistory; // Number of defaults

    // Events
    event PolicyCreated(
        uint256 indexed loanId,
        address indexed lender,
        uint256 coveredAmount,
        uint256 premiumPaid
    );

    event ClaimPaid(
        uint256 indexed loanId,
        address indexed lender,
        uint256 claimAmount,
        uint256 timestamp
    );

    event ProviderStaked(
        address indexed provider,
        uint256 amount,
        uint256 totalStaked
    );

    event ProviderWithdraw(
        address indexed provider,
        uint256 amount,
        uint256 rewards
    );

    event PremiumDistributed(
        address indexed token,
        uint256 totalPremium,
        uint256 providerShare,
        uint256 poolShare
    );

    event RiskScoreUpdated(address indexed borrower, uint256 newScore);

    constructor(address _celoLend, address _loanRepayment, address _treasury) {
        celoLend = CeloLend(_celoLend);
        loanRepayment = LoanRepayment(_loanRepayment);
        treasury = Treasury(_treasury);
    }

    /**
     * @notice Create insurance policy for a new loan
     * @param loanId The loan ID to insure
     * @param lender Address of the lender
     * @param borrower Address of the borrower
     * @param loanAmount Amount of the loan
     * @param duration Loan duration in seconds
     * @param token Token address
     */
    function createPolicy(
        uint256 loanId,
        address lender,
        address borrower,
        uint256 loanAmount,
        uint256 duration,
        address token
    ) external payable {
        require(
            msg.sender == address(celoLend),
            "Only CeloLend can create policies"
        );
        require(policies[loanId].loanId == 0, "Policy already exists");

        // Calculate coverage amount based on risk score
        uint256 riskScore = _calculateRiskScore(borrower);
        uint256 maxCoverage = (loanAmount * COVERAGE_RATIO) / BASIS_POINTS;
        uint256 coveredAmount = _adjustCoverageForRisk(maxCoverage, riskScore);

        // Calculate premium (annual rate adjusted for loan duration)
        uint256 annualPremium = (coveredAmount * PREMIUM_RATE) / BASIS_POINTS;
        uint256 premiumRequired = (annualPremium * duration) / (365 days);

        // Verify pool can cover this loan
        require(
            _canCoverLoan(token, coveredAmount),
            "Insufficient pool capacity"
        );

        // Handle premium payment
        if (token == address(0)) {
            require(msg.value >= premiumRequired, "Insufficient premium");
            poolBalances[token] += premiumRequired;

            // Refund excess
            if (msg.value > premiumRequired) {
                (bool success, ) = payable(lender).call{
                    value: msg.value - premiumRequired
                }("");
                require(success, "Refund failed");
            }
        } else {
            require(msg.value == 0, "No native token expected");
            IERC20(token).transferFrom(lender, address(this), premiumRequired);
            poolBalances[token] += premiumRequired;
        }

        // Create policy
        policies[loanId] = InsurancePolicy({
            loanId: loanId,
            lender: lender,
            borrower: borrower,
            coveredAmount: coveredAmount,
            premiumPaid: premiumRequired,
            coverageStart: block.timestamp,
            coverageEnd: block.timestamp + duration,
            isActive: true,
            hasClaimed: false
        });

        lenderPolicies[lender].push(loanId);
        totalCoveredAmount[token] += coveredAmount;
        premiumsCollected[token] += premiumRequired;

        // Distribute premium to providers
        _distributePremium(token, premiumRequired);

        emit PolicyCreated(loanId, lender, coveredAmount, premiumRequired);
    }

    /**
     * @notice File insurance claim for defaulted loan
     * @param loanId The loan ID to claim for
     */
    function fileClaim(uint256 loanId) external nonReentrant {
        InsurancePolicy storage policy = policies[loanId];
        require(policy.loanId != 0, "Policy does not exist");
        require(policy.lender == msg.sender, "Only lender can file claim");
        require(policy.isActive, "Policy not active");
        require(!policy.hasClaimed, "Claim already filed");
        require(block.timestamp <= policy.coverageEnd, "Coverage expired");

        // Verify loan has defaulted
        (, , uint256 status) = loanRepayment.getRepaymentStatus(loanId);
        require(status == 3, "Loan not defaulted"); // 3 = Defaulted status

        // Calculate claim amount
        (, uint256 outstandingDebt, ) = loanRepayment.getLoanRepaymentInfo(
            loanId
        );
        uint256 claimAmount = outstandingDebt > policy.coveredAmount
            ? policy.coveredAmount
            : outstandingDebt;

        // Get loan token
        (, , , address tokenAddress, , , , , , , ) = celoLend.getLoanRequest(
            loanId
        );

        // Verify pool has sufficient balance
        require(
            poolBalances[tokenAddress] >= claimAmount,
            "Insufficient pool balance"
        );

        // Process claim
        policy.hasClaimed = true;
        policy.isActive = false;
        poolBalances[tokenAddress] -= claimAmount;
        totalClaims[tokenAddress] += claimAmount;

        // Transfer claim to lender
        if (tokenAddress == address(0)) {
            (bool success, ) = payable(policy.lender).call{value: claimAmount}(
                ""
            );
            require(success, "Claim transfer failed");
        } else {
            IERC20(tokenAddress).transfer(policy.lender, claimAmount);
        }

        // Update borrower risk score
        _updateBorrowerRisk(policy.borrower, true);

        // Distribute claim cost among providers
        _distributeClaim(tokenAddress, claimAmount);

        emit ClaimPaid(loanId, policy.lender, claimAmount, block.timestamp);
    }

    /**
     * @notice Stake tokens to become insurance provider
     * @param token Token to stake
     * @param amount Amount to stake
     */
    function stakeAsProvider(
        address token,
        uint256 amount
    ) external payable nonReentrant {
        require(amount > 0, "Amount must be greater than 0");

        if (token == address(0)) {
            require(msg.value == amount, "Incorrect native token amount");
        } else {
            require(msg.value == 0, "No native token expected");
            IERC20(token).transferFrom(msg.sender, address(this), amount);
        }

        InsuranceProvider storage provider = providers[msg.sender];

        if (!provider.isActive) {
            provider.isActive = true;
            provider.lastRewardTime = block.timestamp;
            activeProviders.push(msg.sender);
        }

        provider.stakedAmount += amount;
        providerBalances[msg.sender] += amount;
        totalStakedAmount += amount;
        poolBalances[token] += amount;

        emit ProviderStaked(msg.sender, amount, provider.stakedAmount);
    }

    /**
     * @notice Withdraw stake and earned rewards
     * @param token Token to withdraw
     * @param amount Amount to withdraw
     */
    function withdrawStake(
        address token,
        uint256 amount
    ) external nonReentrant {
        InsuranceProvider storage provider = providers[msg.sender];
        require(provider.isActive, "Not an active provider");
        require(amount <= provider.stakedAmount, "Insufficient staked amount");

        // Calculate and update rewards before withdrawal
        uint256 rewards = _calculateProviderRewards(msg.sender, token);
        provider.rewardsEarned += rewards;
        provider.lastRewardTime = block.timestamp;

        // Update balances
        provider.stakedAmount -= amount;
        providerBalances[msg.sender] -= amount;
        totalStakedAmount -= amount;

        uint256 totalWithdraw = amount + rewards;
        require(
            poolBalances[token] >= totalWithdraw,
            "Insufficient pool balance"
        );
        poolBalances[token] -= totalWithdraw;

        // Transfer withdrawal
        if (token == address(0)) {
            (bool success, ) = payable(msg.sender).call{value: totalWithdraw}(
                ""
            );
            require(success, "Withdrawal failed");
        } else {
            IERC20(token).transfer(msg.sender, totalWithdraw);
        }

        // Deactivate if no stake remaining
        if (provider.stakedAmount == 0) {
            provider.isActive = false;
            _removeFromActiveProviders(msg.sender);
        }

        emit ProviderWithdraw(msg.sender, amount, rewards);
    }

    /**
     * @notice Calculate risk score for borrower
     */
    function _calculateRiskScore(
        address borrower
    ) internal view returns (uint256) {
        // Get credit score from CeloLend's credit system
        address creditScoreAddr = celoLend.creditScore();
        (bool success, bytes memory data) = creditScoreAddr.staticcall(
            abi.encodeWithSignature("getCreditScore(address)", borrower)
        );

        uint256 creditScore = success ? abi.decode(data, (uint256)) : 50; // Default to 50 if failed
        uint256 defaults = defaultHistory[borrower];

        // Convert credit score (0-100) to risk score (0-10000)
        // Higher credit score = lower risk score
        uint256 baseRisk = (100 - creditScore) * 100; // 0-10000 scale

        // Increase risk for each default (500 points per default, max 5000)
        uint256 defaultPenalty = defaults * 500;
        if (defaultPenalty > 5000) defaultPenalty = 5000;

        uint256 totalRisk = baseRisk + defaultPenalty;
        return totalRisk > 10000 ? 10000 : totalRisk;
    }

    /**
     * @notice Adjust coverage based on risk score
     */
    function _adjustCoverageForRisk(
        uint256 maxCoverage,
        uint256 riskScore
    ) internal pure returns (uint256) {
        if (riskScore <= 2000) return maxCoverage; // Low risk: full coverage
        if (riskScore <= 5000) return (maxCoverage * 8000) / 10000; // Medium risk: 80% coverage
        if (riskScore <= 7500) return (maxCoverage * 6000) / 10000; // High risk: 60% coverage
        return (maxCoverage * 4000) / 10000; // Very high risk: 40% coverage
    }

    /**
     * @notice Check if pool can cover additional loan
     */
    function _canCoverLoan(
        address token,
        uint256 amount
    ) internal view returns (bool) {
        uint256 currentCoverage = totalCoveredAmount[token];
        uint256 availablePool = poolBalances[token];
        uint256 requiredRatio = ((currentCoverage + amount) * BASIS_POINTS) /
            availablePool;

        return requiredRatio <= (BASIS_POINTS - MIN_POOL_RATIO);
    }

    /**
     * @notice Distribute premium among providers
     */
    function _distributePremium(address token, uint256 premium) internal {
        if (activeProviders.length == 0) return;

        uint256 providerShare = (premium * 6000) / BASIS_POINTS; // 60% to providers
        uint256 poolShare = premium - providerShare; // 40% stays in pool

        uint256 perProviderShare = providerShare / activeProviders.length;

        for (uint256 i = 0; i < activeProviders.length; i++) {
            providers[activeProviders[i]].rewardsEarned += perProviderShare;
        }

        totalProviderRewards += providerShare;

        emit PremiumDistributed(token, premium, providerShare, poolShare);
    }

    /**
     * @notice Distribute claim cost among providers
     */
    function _distributeClaim(address token, uint256 claimAmount) internal {
        if (totalStakedAmount == 0) return;

        for (uint256 i = 0; i < activeProviders.length; i++) {
            address provider = activeProviders[i];
            InsuranceProvider storage providerData = providers[provider];

            if (providerData.stakedAmount > 0) {
                uint256 providerShare = (claimAmount *
                    providerData.stakedAmount) / totalStakedAmount;
                providerData.claimsPaid += providerShare;
            }
        }
    }

    /**
     * @notice Calculate provider rewards
     */
    function _calculateProviderRewards(
        address provider,
        address token
    ) internal view returns (uint256) {
        InsuranceProvider memory providerData = providers[provider];
        if (!providerData.isActive || providerData.stakedAmount == 0) return 0;

        uint256 timeStaked = block.timestamp - providerData.lastRewardTime;
        uint256 annualReward = (providerData.stakedAmount * 500) / BASIS_POINTS; // 5% annual
        uint256 reward = (annualReward * timeStaked) / (365 days);

        return reward;
    }

    /**
     * @notice Update borrower risk after default
     */
    function _updateBorrowerRisk(address borrower, bool isDefault) internal {
        if (isDefault) {
            defaultHistory[borrower]++;
        }

        uint256 newRiskScore = _calculateRiskScore(borrower);
        borrowerRiskScores[borrower] = newRiskScore;

        emit RiskScoreUpdated(borrower, newRiskScore);
    }

    /**
     * @notice Remove provider from active list
     */
    function _removeFromActiveProviders(address provider) internal {
        for (uint256 i = 0; i < activeProviders.length; i++) {
            if (activeProviders[i] == provider) {
                activeProviders[i] = activeProviders[
                    activeProviders.length - 1
                ];
                activeProviders.pop();
                break;
            }
        }
    }

    /**
     * @notice Get pool statistics
     */
    function getPoolStats(
        address token
    )
        external
        view
        returns (
            uint256 totalPool,
            uint256 totalCovered,
            uint256 totalClaimsAmount,
            uint256 utilizationRatio,
            uint256 claimRatio
        )
    {
        totalPool = poolBalances[token];
        totalCovered = totalCoveredAmount[token];
        totalClaimsAmount = totalClaims[token];
        utilizationRatio = totalPool > 0
            ? (totalCovered * BASIS_POINTS) / totalPool
            : 0;
        claimRatio = premiumsCollected[token] > 0
            ? (totalClaimsAmount * BASIS_POINTS) / premiumsCollected[token]
            : 0;
    }

    /**
     * @notice Get provider information
     */
    function getProviderInfo(
        address provider
    )
        external
        view
        returns (
            uint256 stakedAmount,
            uint256 rewardsEarned,
            uint256 claimsPaid,
            bool isActive,
            uint256 pendingRewards
        )
    {
        InsuranceProvider memory providerData = providers[provider];
        return (
            providerData.stakedAmount,
            providerData.rewardsEarned,
            providerData.claimsPaid,
            providerData.isActive,
            _calculateProviderRewards(provider, address(0)) // Simplified for native token
        );
    }

    /**
     * @notice Get policy details
     */
    function getPolicyDetails(
        uint256 loanId
    )
        external
        view
        returns (
            InsurancePolicy memory policy,
            uint256 coverageRemaining,
            bool canClaim
        )
    {
        policy = policies[loanId];
        coverageRemaining = block.timestamp < policy.coverageEnd
            ? policy.coverageEnd - block.timestamp
            : 0;
        canClaim =
            policy.isActive &&
            !policy.hasClaimed &&
            block.timestamp <= policy.coverageEnd;
    }
}
