// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MentoIntegration
 * @dev Helper contract for Mento Protocol stablecoin integration on Celo
 * @notice Provides utilities for working with Mento stablecoins (cUSD, cEUR, cREAL)
 */
contract MentoIntegration is Ownable {
    // Mento stablecoin addresses on Celo mainnet
    address public constant cUSD = 0x765DE816845861e75A25fCA122bb6898B8B1282a;
    address public constant cEUR = 0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73;
    address public constant cREAL = 0xe8537a3d056DA446677B9E9d6c5dB704EaAb4787;

    // Mento testnet addresses (Alfajores)
    address public constant cUSD_TESTNET =
        0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1;
    address public constant cEUR_TESTNET =
        0x10c892A6EC43a53E45D0B916B4b7D383B1b78C0F;
    address public constant cREAL_TESTNET =
       0xE4D517785D091D3c54818832dB6094bcc2744545;

    // Network configuration
    bool public isTestnet;

    // Supported Mento stablecoins
    mapping(address => bool) public isMentoStablecoin;
    mapping(address => string) public stablecoinSymbol;
    mapping(address => uint8) public stablecoinDecimals;

    // Events
    event NetworkConfigured(bool isTestnet);
    event StablecoinConfigured(
        address indexed token,
        string symbol,
        bool supported
    );

    constructor(bool _isTestnet) Ownable(msg.sender) {
        isTestnet = _isTestnet;
        _configureMentoTokens();
        emit NetworkConfigured(_isTestnet);
    }

    /**
     * @dev Configure Mento stablecoin addresses based on network
     */
    function _configureMentoTokens() internal {
        if (isTestnet) {
            // Alfajores testnet configuration
            _addStablecoin(cUSD_TESTNET, "cUSD", 18);
            _addStablecoin(cEUR_TESTNET, "cEUR", 18);
            _addStablecoin(cREAL_TESTNET, "cREAL", 18);
        } else {
            // Celo mainnet configuration
            _addStablecoin(cUSD, "cUSD", 18);
            _addStablecoin(cEUR, "cEUR", 18);
            _addStablecoin(cREAL, "cREAL", 18);
        }
    }

    /**
     * @dev Add a Mento stablecoin to the supported list
     */
    function _addStablecoin(
        address token,
        string memory symbol,
        uint8 decimals
    ) internal {
        isMentoStablecoin[token] = true;
        stablecoinSymbol[token] = symbol;
        stablecoinDecimals[token] = decimals;
        emit StablecoinConfigured(token, symbol, true);
    }

    /**
     * @dev Get the appropriate token address for the current network
     */
    function getMentoToken(
        string memory symbol
    ) external view returns (address) {
        if (keccak256(bytes(symbol)) == keccak256(bytes("cUSD"))) {
            return isTestnet ? cUSD_TESTNET : cUSD;
        } else if (keccak256(bytes(symbol)) == keccak256(bytes("cEUR"))) {
            return isTestnet ? cEUR_TESTNET : cEUR;
        } else if (keccak256(bytes(symbol)) == keccak256(bytes("cREAL"))) {
            return isTestnet ? cREAL_TESTNET : cREAL;
        }
        revert("Unsupported Mento token");
    }

    /**
     * @dev Get all supported Mento stablecoins for current network
     */
    function getSupportedStablecoins()
        external
        view
        returns (
            address[] memory tokens,
            string[] memory symbols,
            uint8[] memory decimals
        )
    {
        tokens = new address[](3);
        symbols = new string[](3);
        decimals = new uint8[](3);

        if (isTestnet) {
            tokens[0] = cUSD_TESTNET;
            tokens[1] = cEUR_TESTNET;
            tokens[2] = cREAL_TESTNET;
        } else {
            tokens[0] = cUSD;
            tokens[1] = cEUR;
            tokens[2] = cREAL;
        }

        symbols[0] = "cUSD";
        symbols[1] = "cEUR";
        symbols[2] = "cREAL";

        decimals[0] = 18;
        decimals[1] = 18;
        decimals[2] = 18;

        return (tokens, symbols, decimals);
    }

    /**
     * @dev Check if a token is a Mento stablecoin
     */
    function isStablecoin(address token) external view returns (bool) {
        return isMentoStablecoin[token];
    }

    /**
     * @dev Get stablecoin information
     */
    function getStablecoinInfo(
        address token
    )
        external
        view
        returns (bool supported, string memory symbol, uint8 decimals)
    {
        return (
            isMentoStablecoin[token],
            stablecoinSymbol[token],
            stablecoinDecimals[token]
        );
    }

    /**
     * @dev Calculate USD value for Mento stablecoins (assumes $1 peg)
     * @param token The stablecoin address
     * @param amount The token amount
     * @return usdValue The USD value (with 8 decimals for consistency with price feeds)
     */
    function getStablecoinValueUSD(
        address token,
        uint256 amount
    ) external view returns (uint256 usdValue) {
        require(isMentoStablecoin[token], "Not a Mento stablecoin");

        // Mento stablecoins are pegged to $1, so value equals amount
        // Convert to 8 decimals for consistency with Chainlink price feeds
        uint8 tokenDecimals = stablecoinDecimals[token];

        if (tokenDecimals >= 8) {
            usdValue = amount / (10 ** (tokenDecimals - 8));
        } else {
            usdValue = amount * (10 ** (8 - tokenDecimals));
        }

        return usdValue;
    }

    /**
     * @dev Validate stablecoin transfer parameters
     */
    function validateStablecoinTransfer(
        address token,
        address from,
        address to,
        uint256 amount
    ) external view returns (bool valid, string memory reason) {
        if (!isMentoStablecoin[token]) {
            return (false, "Not a supported Mento stablecoin");
        }

        if (from == address(0) || to == address(0)) {
            return (false, "Invalid address");
        }

        if (amount == 0) {
            return (false, "Amount must be positive");
        }

        // Check balance if it's not a mint operation
        if (from != address(0)) {
            uint256 balance = IERC20(token).balanceOf(from);
            if (balance < amount) {
                return (false, "Insufficient balance");
            }
        }

        return (true, "Valid transfer");
    }

    /**
     * @dev Get exchange rate between two Mento stablecoins (simplified)
     * @notice This assumes 1:1 peg for simplicity, real implementation would use Mento exchange
     */
    function getStablecoinExchangeRate(
        address fromToken,
        address toToken
    ) external view returns (uint256 rate) {
        require(isMentoStablecoin[fromToken], "From token not supported");
        require(isMentoStablecoin[toToken], "To token not supported");

        // Simplified: assume 1:1 rate for all stablecoins
        // In production, you'd integrate with Mento's exchange mechanism
        return 1e18; // 1:1 rate with 18 decimals
    }

    // ADMIN FUNCTIONS

    /**
     * @dev Switch network configuration (testnet/mainnet)
     */
    function setNetwork(bool _isTestnet) external onlyOwner {
        if (isTestnet != _isTestnet) {
            isTestnet = _isTestnet;

            // Clear existing configuration
            _clearStablecoins();

            // Reconfigure for new network
            _configureMentoTokens();

            emit NetworkConfigured(_isTestnet);
        }
    }

    /**
     * @dev Manually add/remove stablecoin support
     */
    function setStablecoinSupport(
        address token,
        bool supported,
        string memory symbol,
        uint8 decimals
    ) external onlyOwner {
        if (supported) {
            _addStablecoin(token, symbol, decimals);
        } else {
            isMentoStablecoin[token] = false;
            stablecoinSymbol[token] = "";
            stablecoinDecimals[token] = 0;
            emit StablecoinConfigured(token, symbol, false);
        }
    }

    /**
     * @dev Clear all stablecoin configurations
     */
    function _clearStablecoins() internal {
        // Clear mainnet tokens
        isMentoStablecoin[cUSD] = false;
        isMentoStablecoin[cEUR] = false;
        isMentoStablecoin[cREAL] = false;

        // Clear testnet tokens
        isMentoStablecoin[cUSD_TESTNET] = false;
        isMentoStablecoin[cEUR_TESTNET] = false;
        isMentoStablecoin[cREAL_TESTNET] = false;
    }

    // UTILITY FUNCTIONS

    /**
     * @dev Format amount for display (handle different decimals)
     */
    function formatAmount(
        address token,
        uint256 amount
    ) external view returns (string memory) {
        require(isMentoStablecoin[token], "Not a Mento stablecoin");

        uint8 decimals = stablecoinDecimals[token];
        string memory symbol = stablecoinSymbol[token];

        // Simple formatting - in production you'd use a proper formatter
        return
            string(
                abi.encodePacked(
                    _uint2str(amount / (10 ** decimals)),
                    " ",
                    symbol
                )
            );
    }

    /**
     * @dev Convert uint to string (helper function)
     */
    function _uint2str(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}
