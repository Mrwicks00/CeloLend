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

    // Complex collateral ratio calculation removed - keep basic price feeds

    // Complex collateral checks removed - keep basic price feeds

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

    // Complex batch functions removed - keep basic admin

    // Complex Mento integration removed - keep basic price feeds

    // Complex Mento price feed updates removed - keep basic price feeds

    // Complex volatility and risk functions removed - keep basic price feeds

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
