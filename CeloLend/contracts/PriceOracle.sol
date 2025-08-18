// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "./MentoIntegration.sol";

/**
 * @title PriceOracle
 * @dev Handles price feeds for Celo tokens including CELO, USDC, and Mento stablecoins
 * @notice Uses Chainlink price feeds for accurate token valuation
 */
contract PriceOracle is Ownable {
    // Price feed mappings
    mapping(address => AggregatorV3Interface) public priceFeeds;
    mapping(address => uint8) public tokenDecimals;
    mapping(address => bool) public supportedTokens;

    // Celo testnet (Alfajores) Chainlink price feeds
    address public constant CELO_USD_FEED =
        0x022F9dCC73C5Fb43F2b4eF2EF9ad3eDD1D853946; // Celo/USD testnet
    address public constant USDC_USD_FEED =
        0x642Abc0c069dC5041dEA5bFC155D38D844779274; // USDC/USD testnet - TO BE UPDATED

    // Mento stablecoin price feeds (testnet)
    address public constant cUSD_USD_FEED =
        0x8b255b1FB27d4D06bD8899f81095627464868EEE; // cUSD/USD testnet
    address public constant cEUR_USD_FEED =
        0x9b2a3A09bCd6BAec27d5ab005490d3772CfBf7C3; // cEUR/USD testnet
    address public constant cREAL_USD_FEED =
        0x643Cb57A8A3C6Df36D7a766c326C334D699F330f; // cREAL/USD testnet

    // Token addresses - NATIVE TOKEN USES ZERO ADDRESS
    address public constant NATIVE_TOKEN = address(0); // CELO native token (use msg.value)
    address public constant USDC_TESTNET =
        0x2F5c0C5d0a8D5Fa15f07E5C8E1E1B9e7c8E4f4A0; // USDC on Alfajores testnet

    // Mento integration contract
    MentoIntegration public mentoIntegration;

    // Price staleness check (24 hours)
    uint256 public constant PRICE_STALENESS_THRESHOLD = 24 hours;

    // Events
    event PriceFeedUpdated(address indexed token, address indexed feed);
    event TokenSupportUpdated(address indexed token, bool supported);

    constructor(address _mentoIntegration) Ownable(msg.sender) {
        if (_mentoIntegration != address(0)) {
            mentoIntegration = MentoIntegration(_mentoIntegration);
        }
        _initializePriceFeeds();
    }

    /**
     * @dev Initialize price feeds for supported tokens
     */
    function _initializePriceFeeds() internal {
        // Native token (CELO) price feed
        if (CELO_USD_FEED != address(0)) {
            priceFeeds[NATIVE_TOKEN] = AggregatorV3Interface(CELO_USD_FEED);
            supportedTokens[NATIVE_TOKEN] = true;
            tokenDecimals[NATIVE_TOKEN] = 18;
        }

        // USDC price feed (testnet)
        if (USDC_USD_FEED != address(0)) {
            priceFeeds[USDC_TESTNET] = AggregatorV3Interface(USDC_USD_FEED);
            supportedTokens[USDC_TESTNET] = true;
            tokenDecimals[USDC_TESTNET] = 6;
        }

        // Initialize Mento stablecoins if MentoIntegration is available
        if (address(mentoIntegration) != address(0)) {
            _initializeMentoTokens();
        }
    }

    /**
     * @dev Initialize Mento stablecoin price feeds
     */
    function _initializeMentoTokens() internal {
        (address[] memory tokens, string[] memory symbols, ) = mentoIntegration
            .getSupportedStablecoins();

        for (uint i = 0; i < tokens.length; i++) {
            address token = tokens[i];
            supportedTokens[token] = true;
            tokenDecimals[token] = 18; // All Mento tokens have 18 decimals

            // Set up price feeds for Mento stablecoins
            if (
                keccak256(bytes(symbols[i])) == keccak256(bytes("cUSD")) &&
                cUSD_USD_FEED != address(0)
            ) {
                priceFeeds[token] = AggregatorV3Interface(cUSD_USD_FEED);
            } else if (
                keccak256(bytes(symbols[i])) == keccak256(bytes("cEUR")) &&
                cEUR_USD_FEED != address(0)
            ) {
                priceFeeds[token] = AggregatorV3Interface(cEUR_USD_FEED);
            } else if (
                keccak256(bytes(symbols[i])) == keccak256(bytes("cREAL")) &&
                cREAL_USD_FEED != address(0)
            ) {
                priceFeeds[token] = AggregatorV3Interface(cREAL_USD_FEED);
            }
        }
    }

    /**
     * @dev Get the latest price for a token in USD (8 decimals)
     * @param token The token address
     * @return price The latest price in USD with 8 decimals
     */
    function getLatestPrice(
        address token
    ) external view returns (uint256 price) {
        require(supportedTokens[token], "Token not supported");

        AggregatorV3Interface priceFeed = priceFeeds[token];

        // Check if we have a Chainlink price feed for this token
        if (address(priceFeed) != address(0)) {
            (
                uint80 roundId,
                int256 answer,
                uint256 startedAt,
                uint256 updatedAt,
                uint80 answeredInRound
            ) = priceFeed.latestRoundData();

            require(answer > 0, "Invalid price");
            require(updatedAt > 0, "Price not updated");
            require(
                block.timestamp - updatedAt < PRICE_STALENESS_THRESHOLD,
                "Price too stale"
            );

            return uint256(answer);
        }

        // Fallback: For Mento stablecoins without Chainlink feeds, use Mento integration
        if (
            address(mentoIntegration) != address(0) &&
            mentoIntegration.isStablecoin(token)
        ) {
            return _getMentoTokenPrice(token);
        }

        revert("No price source available for token");
    }

    /**
     * @dev Get Mento stablecoin price (fallback method)
     * @param token The Mento stablecoin address
     * @return price The price in USD with 8 decimals
     */
    function _getMentoTokenPrice(
        address token
    ) internal view returns (uint256 price) {
        // For now, return close to $1 but with slight variations to simulate real market conditions
        // In production, this would integrate with Mento's reserve system or use alternative oracles

        (, string memory symbol, ) = mentoIntegration.getStablecoinInfo(token);

        if (keccak256(bytes(symbol)) == keccak256(bytes("cUSD"))) {
            return 99800000; // $0.998 (8 decimals) - slightly below peg
        } else if (keccak256(bytes(symbol)) == keccak256(bytes("cEUR"))) {
            return 107200000; // ~$1.072 (EUR is stronger than USD)
        } else if (keccak256(bytes(symbol)) == keccak256(bytes("cREAL"))) {
            return 19500000; // ~$0.195 (BRL is weaker than USD)
        }

        return 100000000; // Default $1.00 (8 decimals)
    }

    /**
     * @dev Convert token amount to USD value
     * @param token The token address
     * @param amount The token amount
     * @return usdValue The USD value with 8 decimals
     */
    function getTokenValueInUSD(
        address token,
        uint256 amount
    ) external view returns (uint256 usdValue) {
        uint256 price = this.getLatestPrice(token);
        uint8 decimals = tokenDecimals[token];

        // Convert to USD: (amount * price) / (10^token_decimals)
        usdValue = (amount * price) / (10 ** decimals);
        return usdValue;
    }

    /**
     * @dev Get exchange rate between two tokens
     * @param tokenA First token
     * @param tokenB Second token
     * @return rate Exchange rate (tokenA/tokenB) with 18 decimals
     */
    function getExchangeRate(
        address tokenA,
        address tokenB
    ) external view returns (uint256 rate) {
        uint256 priceA = this.getLatestPrice(tokenA);
        uint256 priceB = this.getLatestPrice(tokenB);

        require(priceB > 0, "Invalid price for token B");

        // Rate = priceA / priceB * 1e18 (for 18 decimal precision)
        rate = (priceA * 1e18) / priceB;
        return rate;
    }

    /**
     * @dev Calculate collateral ratio for a loan
     * @param collateralToken The collateral token address
     * @param collateralAmount The collateral amount
     * @param loanToken The loan token address
     * @param loanAmount The loan amount
     * @return ratio Collateral ratio in basis points (10000 = 100%)
     */
    function calculateCollateralRatio(
        address collateralToken,
        uint256 collateralAmount,
        address loanToken,
        uint256 loanAmount
    ) external view returns (uint256 ratio) {
        uint256 collateralValueUSD = this.getTokenValueInUSD(
            collateralToken,
            collateralAmount
        );
        uint256 loanValueUSD = this.getTokenValueInUSD(loanToken, loanAmount);

        require(loanValueUSD > 0, "Invalid loan value");

        // Ratio = (collateralValue / loanValue) * 10000
        ratio = (collateralValueUSD * 10000) / loanValueUSD;
        return ratio;
    }

    /**
     * @dev Check if collateral is sufficient for a loan
     * @param collateralToken The collateral token address
     * @param collateralAmount The collateral amount
     * @param loanToken The loan token address
     * @param loanAmount The loan amount
     * @param minRatio Minimum required ratio in basis points
     * @return sufficient Whether collateral is sufficient
     */
    function isCollateralSufficient(
        address collateralToken,
        uint256 collateralAmount,
        address loanToken,
        uint256 loanAmount,
        uint256 minRatio
    ) external view returns (bool sufficient) {
        uint256 currentRatio = this.calculateCollateralRatio(
            collateralToken,
            collateralAmount,
            loanToken,
            loanAmount
        );

        return currentRatio >= minRatio;
    }

    /**
     * @dev Calculate liquidation value for collateral
     * @param token The collateral token
     * @param amount The collateral amount
     * @param discountBps Liquidation discount in basis points
     * @return liquidationValue The liquidation value in USD (8 decimals)
     */
    function calculateLiquidationValue(
        address token,
        uint256 amount,
        uint256 discountBps
    ) external view returns (uint256 liquidationValue) {
        uint256 marketValue = this.getTokenValueInUSD(token, amount);

        // Apply liquidation discount
        uint256 discount = (marketValue * discountBps) / 10000;
        liquidationValue = marketValue - discount;

        return liquidationValue;
    }

    // ADMIN FUNCTIONS

    /**
     * @dev Set price feed for a token
     * @param token The token address
     * @param feed The price feed address
     */
    function setPriceFeed(
        address token,
        address feed,
        uint8 decimals
    ) external onlyOwner {
        priceFeeds[token] = AggregatorV3Interface(feed);
        tokenDecimals[token] = decimals;
        supportedTokens[token] = true;

        emit PriceFeedUpdated(token, feed);
    }

    /**
     * @dev Set token support status
     * @param token The token address
     * @param supported Whether the token is supported
     */
    function setTokenSupport(address token, bool supported) external onlyOwner {
        supportedTokens[token] = supported;
        emit TokenSupportUpdated(token, supported);
    }

    /**
     * @dev Batch set token support
     * @param tokens Array of token addresses
     * @param supported Array of support statuses
     * @param decimalsArray Array of token decimals
     */
    function batchSetTokenSupport(
        address[] calldata tokens,
        bool[] calldata supported,
        uint8[] calldata decimalsArray
    ) external onlyOwner {
        require(
            tokens.length == supported.length &&
                tokens.length == decimalsArray.length,
            "Array length mismatch"
        );

        for (uint i = 0; i < tokens.length; i++) {
            supportedTokens[tokens[i]] = supported[i];
            tokenDecimals[tokens[i]] = decimalsArray[i];
            emit TokenSupportUpdated(tokens[i], supported[i]);
        }
    }

    /**
     * @dev Set MentoIntegration contract
     * @param _mentoIntegration Address of MentoIntegration contract
     */
    function setMentoIntegration(address _mentoIntegration) external onlyOwner {
        require(
            _mentoIntegration != address(0),
            "Invalid MentoIntegration address"
        );
        mentoIntegration = MentoIntegration(_mentoIntegration);

        // Re-initialize Mento tokens with new integration
        if (address(mentoIntegration) != address(0)) {
            _initializeMentoTokens();
        }
    }

    /**
     * @dev Update Mento stablecoin price feeds
     * @param cUSDFeed Chainlink feed for cUSD/USD
     * @param cEURFeed Chainlink feed for cEUR/USD
     * @param cREALFeed Chainlink feed for cREAL/USD
     */
    function updateMentoPriceFeeds(
        address cUSDFeed,
        address cEURFeed,
        address cREALFeed
    ) external onlyOwner {
        // Get Mento token addresses from integration contract
        if (address(mentoIntegration) != address(0)) {
            (
                address[] memory tokens,
                string[] memory symbols,

            ) = mentoIntegration.getSupportedStablecoins();

            for (uint i = 0; i < tokens.length; i++) {
                if (
                    keccak256(bytes(symbols[i])) == keccak256(bytes("cUSD")) &&
                    cUSDFeed != address(0)
                ) {
                    priceFeeds[tokens[i]] = AggregatorV3Interface(cUSDFeed);
                    emit PriceFeedUpdated(tokens[i], cUSDFeed);
                } else if (
                    keccak256(bytes(symbols[i])) == keccak256(bytes("cEUR")) &&
                    cEURFeed != address(0)
                ) {
                    priceFeeds[tokens[i]] = AggregatorV3Interface(cEURFeed);
                    emit PriceFeedUpdated(tokens[i], cEURFeed);
                } else if (
                    keccak256(bytes(symbols[i])) == keccak256(bytes("cREAL")) &&
                    cREALFeed != address(0)
                ) {
                    priceFeeds[tokens[i]] = AggregatorV3Interface(cREALFeed);
                    emit PriceFeedUpdated(tokens[i], cREALFeed);
                }
            }
        }
    }

    /**
     * @dev Get price volatility for algorithmic interest rate models
     * @param token The token address
     * @param timeWindow Time window in seconds for volatility calculation
     * @return volatility Volatility as a percentage (basis points)
     */
    function getPriceVolatility(
        address token,
        uint256 timeWindow
    ) external view returns (uint256 volatility) {
        // Simplified volatility calculation - in production, this would analyze historical price data
        // For now, return different volatility levels based on token type

        if (
            address(mentoIntegration) != address(0) &&
            mentoIntegration.isStablecoin(token)
        ) {
            return 50; // 0.5% volatility for stablecoins (basis points)
        } else if (token == NATIVE_TOKEN) {
            return 2000; // 20% volatility for native CELO
        } else if (token == USDC_TESTNET) {
            return 100; // 1% volatility for USDC
        }

        return 1500; // Default 15% volatility
    }

    /**
     * @dev Get risk-adjusted price for algorithmic models
     * @param token The token address
     * @param riskMultiplier Risk multiplier (basis points, 10000 = 1x)
     * @return adjustedPrice Risk-adjusted price
     */
    function getRiskAdjustedPrice(
        address token,
        uint256 riskMultiplier
    ) external view returns (uint256 adjustedPrice) {
        uint256 basePrice = this.getLatestPrice(token);
        adjustedPrice = (basePrice * riskMultiplier) / 10000;
        return adjustedPrice;
    }

    // GETTER FUNCTIONS

    function getSupportedTokens()
        external
        view
        returns (
            address[] memory tokens,
            bool[] memory supported,
            uint8[] memory decimals
        )
    {
        // Get basic tokens count
        uint256 basicCount = 2; // NATIVE_TOKEN + USDC_TESTNET
        uint256 mentoCount = 0;

        // Count Mento tokens if available
        if (address(mentoIntegration) != address(0)) {
            (address[] memory mentoTokens, , ) = mentoIntegration
                .getSupportedStablecoins();
            mentoCount = mentoTokens.length;
        }

        uint256 totalCount = basicCount + mentoCount;
        tokens = new address[](totalCount);
        supported = new bool[](totalCount);
        decimals = new uint8[](totalCount);

        uint256 index = 0;

        // Add basic tokens
        tokens[index] = NATIVE_TOKEN;
        supported[index] = supportedTokens[NATIVE_TOKEN];
        decimals[index] = tokenDecimals[NATIVE_TOKEN];
        index++;

        tokens[index] = USDC_TESTNET;
        supported[index] = supportedTokens[USDC_TESTNET];
        decimals[index] = tokenDecimals[USDC_TESTNET];
        index++;

        // Add Mento tokens if available
        if (address(mentoIntegration) != address(0)) {
            (address[] memory mentoTokens, , ) = mentoIntegration
                .getSupportedStablecoins();
            for (uint i = 0; i < mentoTokens.length; i++) {
                tokens[index] = mentoTokens[i];
                supported[index] = supportedTokens[mentoTokens[i]];
                decimals[index] = tokenDecimals[mentoTokens[i]];
                index++;
            }
        }

        return (tokens, supported, decimals);
    }

    function getPriceFeedInfo(
        address token
    )
        external
        view
        returns (address feedAddress, uint8 decimals, bool isSupported)
    {
        return (
            address(priceFeeds[token]),
            tokenDecimals[token],
            supportedTokens[token]
        );
    }
}
