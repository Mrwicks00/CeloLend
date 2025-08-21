// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title Treasury
 * @dev Manages platform fees, revenue distribution, and protocol reserves
 */
contract Treasury is ReentrancyGuard, Ownable {
    // Revenue streams
    struct RevenueStreams {
        uint256 platformFees; // Fees from loan origination
        uint256 liquidationPenalties; // Penalties from liquidations
        uint256 insurancePremiums; // Insurance pool contributions
        uint256 earlyWithdrawalFees; // Fees from early withdrawals
    }

    // Distribution targets
    struct RevenueDistribution {
        uint256 stakeholderRewards; // 40% - Token holders/stakers
        uint256 developmentFund; // 30% - Development and improvements
        uint256 insurancePool; // 20% - Insurance pool backing
        uint256 emergencyReserve; // 10% - Emergency reserve
    }

    // Token balances in treasury
    mapping(address => uint256) public tokenBalances;
    mapping(address => RevenueStreams) public revenueByToken;

    // Distribution percentages (in basis points)
    uint256 public constant STAKEHOLDER_SHARE = 4000; // 40%
    uint256 public constant DEVELOPMENT_SHARE = 3000; // 30%
    uint256 public constant INSURANCE_SHARE = 2000; // 20%
    uint256 public constant EMERGENCY_SHARE = 1000; // 10%
    uint256 public constant BASIS_POINTS = 10000;

    // Authorized contracts
    mapping(address => bool) public authorizedDepositors;

    // Distribution tracking
    mapping(address => RevenueDistribution) public distributedRevenue;
    mapping(address => uint256) public lastDistributionTime;

    // Withdrawal destinations
    address public developmentFund;
    address public insurancePool;
    address public emergencyReserve;
    address public stakeholderRewards;

    // Events
    event RevenueDeposited(
        address indexed token,
        uint256 amount,
        string revenueType,
        address indexed depositor
    );

    event RevenueDistributed(
        address indexed token,
        uint256 totalAmount,
        uint256 stakeholderAmount,
        uint256 developmentAmount,
        uint256 insuranceAmount,
        uint256 emergencyAmount
    );

    event Withdrawal(
        address indexed token,
        address indexed recipient,
        uint256 amount,
        string purpose
    );

    event AuthorizationUpdated(address indexed account, bool authorized);
    event DistributionTargetUpdated(string target, address newAddress);

    constructor(
        address _developmentFund,
        address _insurancePool,
        address _emergencyReserve,
        address _stakeholderRewards
    ) Ownable(msg.sender) {
        developmentFund = _developmentFund;
        insurancePool = _insurancePool;
        emergencyReserve = _emergencyReserve;
        stakeholderRewards = _stakeholderRewards;
    }

    /**
     * @notice Authorize a contract to deposit revenue
     * @param account Address to authorize
     * @param authorized Whether to authorize or revoke
     */
    function setAuthorizedDepositor(
        address account,
        bool authorized
    ) external onlyOwner {
        authorizedDepositors[account] = authorized;
        emit AuthorizationUpdated(account, authorized);
    }

    /**
     * @notice Deposit platform fees from loan origination
     * @param token Token address (address(0) for native)
     * @param amount Amount to deposit
     */
    function depositPlatformFees(
        address token,
        uint256 amount
    ) external payable {
        require(authorizedDepositors[msg.sender], "Unauthorized depositor");

        if (token == address(0)) {
            require(msg.value == amount, "Incorrect native token amount");
        } else {
            require(msg.value == 0, "No native token expected");
            IERC20(token).transferFrom(msg.sender, address(this), amount);
        }

        tokenBalances[token] += amount;
        revenueByToken[token].platformFees += amount;

        emit RevenueDeposited(token, amount, "Platform Fees", msg.sender);
    }

    /**
     * @notice Deposit liquidation penalties
     * @param token Token address
     * @param amount Amount to deposit
     */
    function depositLiquidationPenalty(
        address token,
        uint256 amount
    ) external payable {
        require(authorizedDepositors[msg.sender], "Unauthorized depositor");

        if (token == address(0)) {
            require(msg.value == amount, "Incorrect native token amount");
        } else {
            require(msg.value == 0, "No native token expected");
            IERC20(token).transferFrom(msg.sender, address(this), amount);
        }

        tokenBalances[token] += amount;
        revenueByToken[token].liquidationPenalties += amount;

        emit RevenueDeposited(token, amount, "Liquidation Penalty", msg.sender);
    }

    /**
     * @notice Deposit insurance premiums
     * @param token Token address
     * @param amount Amount to deposit
     */
    function depositInsurancePremium(
        address token,
        uint256 amount
    ) external payable {
        require(authorizedDepositors[msg.sender], "Unauthorized depositor");

        if (token == address(0)) {
            require(msg.value == amount, "Incorrect native token amount");
        } else {
            require(msg.value == 0, "No native token expected");
            IERC20(token).transferFrom(msg.sender, address(this), amount);
        }

        tokenBalances[token] += amount;
        revenueByToken[token].insurancePremiums += amount;

        emit RevenueDeposited(token, amount, "Insurance Premium", msg.sender);
    }

    /**
     * @notice Distribute accumulated revenue according to allocation percentages
     * @param token Token to distribute
     */
    function distributeRevenue(address token) external nonReentrant {
        uint256 balance = tokenBalances[token];
        require(balance > 0, "No balance to distribute");

        // Calculate distribution amounts
        uint256 stakeholderAmount = (balance * STAKEHOLDER_SHARE) /
            BASIS_POINTS;
        uint256 developmentAmount = (balance * DEVELOPMENT_SHARE) /
            BASIS_POINTS;
        uint256 insuranceAmount = (balance * INSURANCE_SHARE) / BASIS_POINTS;
        uint256 emergencyAmount = (balance * EMERGENCY_SHARE) / BASIS_POINTS;

        // Ensure we don't have rounding errors
        uint256 totalDistribution = stakeholderAmount +
            developmentAmount +
            insuranceAmount +
            emergencyAmount;
        require(totalDistribution <= balance, "Distribution exceeds balance");

        // Update tracking
        distributedRevenue[token].stakeholderRewards += stakeholderAmount;
        distributedRevenue[token].developmentFund += developmentAmount;
        distributedRevenue[token].insurancePool += insuranceAmount;
        distributedRevenue[token].emergencyReserve += emergencyAmount;

        lastDistributionTime[token] = block.timestamp;
        tokenBalances[token] = balance - totalDistribution;

        // Execute transfers
        _transferRevenue(
            token,
            stakeholderRewards,
            stakeholderAmount,
            "Stakeholder Rewards"
        );
        _transferRevenue(
            token,
            developmentFund,
            developmentAmount,
            "Development Fund"
        );
        _transferRevenue(
            token,
            insurancePool,
            insuranceAmount,
            "Insurance Pool"
        );
        _transferRevenue(
            token,
            emergencyReserve,
            emergencyAmount,
            "Emergency Reserve"
        );

        emit RevenueDistributed(
            token,
            totalDistribution,
            stakeholderAmount,
            developmentAmount,
            insuranceAmount,
            emergencyAmount
        );
    }

    /**
     * @notice Internal function to transfer revenue
     */
    function _transferRevenue(
        address token,
        address recipient,
        uint256 amount,
        string memory purpose
    ) internal {
        if (amount == 0) return;

        if (token == address(0)) {
            (bool success, ) = payable(recipient).call{value: amount}("");
            require(success, "Native token transfer failed");
        } else {
            IERC20(token).transfer(recipient, amount);
        }

        emit Withdrawal(token, recipient, amount, purpose);
    }

    /**
     * @notice Emergency withdrawal function (onlyOwner)
     * @param token Token to withdraw
     * @param amount Amount to withdraw
     * @param recipient Recipient address
     */
    function emergencyWithdraw(
        address token,
        uint256 amount,
        address recipient
    ) external onlyOwner nonReentrant {
        require(recipient != address(0), "Invalid recipient");
        require(amount <= tokenBalances[token], "Insufficient balance");

        tokenBalances[token] -= amount;

        if (token == address(0)) {
            (bool success, ) = payable(recipient).call{value: amount}("");
            require(success, "Native token transfer failed");
        } else {
            IERC20(token).transfer(recipient, amount);
        }

        emit Withdrawal(token, recipient, amount, "Emergency Withdrawal");
    }

    /**
     * @notice Update distribution target addresses
     */
    function updateDistributionTarget(
        string calldata target,
        address newAddress
    ) external onlyOwner {
        require(newAddress != address(0), "Invalid address");

        bytes32 targetHash = keccak256(abi.encodePacked(target));

        if (targetHash == keccak256(abi.encodePacked("development"))) {
            developmentFund = newAddress;
        } else if (targetHash == keccak256(abi.encodePacked("insurance"))) {
            insurancePool = newAddress;
        } else if (targetHash == keccak256(abi.encodePacked("emergency"))) {
            emergencyReserve = newAddress;
        } else if (targetHash == keccak256(abi.encodePacked("stakeholder"))) {
            stakeholderRewards = newAddress;
        } else {
            revert("Invalid target");
        }

        emit DistributionTargetUpdated(target, newAddress);
    }

    /**
     * @notice Get total revenue by token and type
     */
    function getTotalRevenue(
        address token
    )
        external
        view
        returns (
            uint256 totalPlatformFees,
            uint256 totalLiquidationPenalties,
            uint256 totalInsurancePremiums,
            uint256 totalEarlyWithdrawalFees,
            uint256 currentBalance
        )
    {
        RevenueStreams memory streams = revenueByToken[token];
        return (
            streams.platformFees,
            streams.liquidationPenalties,
            streams.insurancePremiums,
            streams.earlyWithdrawalFees,
            tokenBalances[token]
        );
    }

    /**
     * @notice Get distribution history
     */
    function getDistributionHistory(
        address token
    )
        external
        view
        returns (
            RevenueDistribution memory distribution,
            uint256 lastDistribution
        )
    {
        return (distributedRevenue[token], lastDistributionTime[token]);
    }

    /**
     * @notice Calculate pending distribution amounts
     */
    function getPendingDistribution(
        address token
    )
        external
        view
        returns (
            uint256 stakeholderAmount,
            uint256 developmentAmount,
            uint256 insuranceAmount,
            uint256 emergencyAmount,
            uint256 totalPending
        )
    {
        uint256 balance = tokenBalances[token];

        stakeholderAmount = (balance * STAKEHOLDER_SHARE) / BASIS_POINTS;
        developmentAmount = (balance * DEVELOPMENT_SHARE) / BASIS_POINTS;
        insuranceAmount = (balance * INSURANCE_SHARE) / BASIS_POINTS;
        emergencyAmount = (balance * EMERGENCY_SHARE) / BASIS_POINTS;
        totalPending =
            stakeholderAmount +
            developmentAmount +
            insuranceAmount +
            emergencyAmount;
    }

    /**
     * @notice Get treasury health metrics
     */
    function getTreasuryMetrics()
        external
        view
        returns (
            uint256 totalTokenTypes,
            uint256 totalValueUSD,
            uint256 lastActivityTime
        )
    {
        // This would integrate with price oracle for USD calculations
        // For now, return basic metrics
        totalTokenTypes = 1; // Simplified
        totalValueUSD = 0; // Would need price oracle integration
        lastActivityTime = block.timestamp;
    }

    // Receive function for native token deposits
    receive() external payable {
        // Only accept from authorized depositors
        require(authorizedDepositors[msg.sender], "Unauthorized");
    }
}
