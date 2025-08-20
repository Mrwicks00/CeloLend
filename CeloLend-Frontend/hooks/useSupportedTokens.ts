import { useState, useEffect, useCallback } from "react";
import { useContract } from "@/contexts/ContractContext";
import { useWallet } from "@/contexts/WalletContext";
import { ethers } from "ethers";

export interface TokenInfo {
  address: string;
  symbol: string;
  decimals: number;
  balance: bigint;
  balanceFormatted: string;
  price: bigint; // Price in USD with 8 decimals
  priceFormatted: string;
  isSupported: boolean;
  isMentoStablecoin?: boolean;
}

export interface SupportedTokensData {
  tokens: TokenInfo[];
  nativeToken: TokenInfo | null;
  stablecoins: TokenInfo[];
  loading: boolean;
  error: string | null;
}

export function useSupportedTokens(): SupportedTokensData {
  const { celoLend, priceOracle, mentoIntegration, isConnected } =
    useContract();
  const { address, balance: nativeBalance } = useWallet();

  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper function to get token symbol
  const getTokenSymbol = async (tokenAddress: string): Promise<string> => {
    if (tokenAddress === ethers.ZeroAddress) {
      return "CELO";
    }

    try {
      // Try to get symbol from Mento integration first
      if (mentoIntegration) {
        try {
          const mentoInfo = await mentoIntegration.getStablecoinInfo(
            tokenAddress
          );
          if (mentoInfo.supported) {
            return mentoInfo.symbol;
          }
        } catch {
          // Not a Mento token, continue
        }
      }

      // Fallback to ERC20 contract
      const tokenContract = new ethers.Contract(
        tokenAddress,
        ["function symbol() view returns (string)"],
        celoLend?.runner
      );
      return await tokenContract.symbol();
    } catch {
      // Try common token addresses
      const knownTokens: { [key: string]: string } = {
        "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1": "cUSD", // Alfajores cUSD
        "0x10c892A6EC43a53E45D0B916B4b7D383B1b78C0F": "cEUR", // Alfajores cEUR
        "0xE4D517785D091D3c54818832dB6094bcc2744545": "cREAL", // Alfajores cREAL
        "0x765DE816845861e75A25fCA122bb6898B8B1282a": "cUSD", // Mainnet cUSD
        "0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73": "cEUR", // Mainnet cEUR
        "0xe8537a3d056DA446677B9E9d6c5dB704EaAb4787": "cREAL", // Mainnet cREAL
      };
      return knownTokens[tokenAddress] || "UNKNOWN";
    }
  };

  // Helper function to get token balance
  const getTokenBalance = async (tokenAddress: string): Promise<bigint> => {
    if (!address) return BigInt(0);

    if (tokenAddress === ethers.ZeroAddress) {
      // Native CELO balance
      return ethers.parseEther(nativeBalance);
    }

    try {
      const tokenContract = new ethers.Contract(
        tokenAddress,
        ["function balanceOf(address) view returns (uint256)"],
        celoLend?.runner
      );
      return await tokenContract.balanceOf(address);
    } catch {
      return BigInt(0);
    }
  };

  // Helper function to get token decimals
  const getTokenDecimals = async (tokenAddress: string): Promise<number> => {
    if (tokenAddress === ethers.ZeroAddress) {
      return 18; // CELO has 18 decimals
    }

    try {
      // Try Mento integration first
      if (mentoIntegration) {
        try {
          const mentoInfo = await mentoIntegration.getStablecoinInfo(
            tokenAddress
          );
          if (mentoInfo.supported) {
            return mentoInfo.decimals;
          }
        } catch {
          // Not a Mento token, continue
        }
      }

      // Fallback to ERC20 contract
      const tokenContract = new ethers.Contract(
        tokenAddress,
        ["function decimals() view returns (uint8)"],
        celoLend?.runner
      );
      return await tokenContract.decimals();
    } catch {
      return 18; // Default to 18 decimals
    }
  };

  // Helper function to get token price
  const getTokenPrice = async (tokenAddress: string): Promise<bigint> => {
    if (!priceOracle) return BigInt(0);

    try {
      const price = await priceOracle.getLatestPrice(tokenAddress);
      return price;
    } catch (error) {
      console.warn(`Error fetching price for token ${tokenAddress}:`, error);
      return BigInt(0);
    }
  };

  // Helper function to check if token is Mento stablecoin
  const isMentoStablecoin = async (tokenAddress: string): Promise<boolean> => {
    if (!mentoIntegration) return false;

    try {
      return await mentoIntegration.isStablecoin(tokenAddress);
    } catch {
      return false;
    }
  };

  // Fetch supported tokens and their data
  const fetchSupportedTokens = useCallback(async () => {
    if (!celoLend || !priceOracle) return;

    setLoading(true);
    setError(null);

    try {
      // Get supported tokens from contract
      const supportedTokenAddresses = await celoLend.getSupportedTokens();

      const tokenInfoPromises = supportedTokenAddresses.map(
        async (tokenAddress: string) => {
          try {
            const [symbol, balance, decimals, price, isMento] =
              await Promise.all([
                getTokenSymbol(tokenAddress),
                getTokenBalance(tokenAddress),
                getTokenDecimals(tokenAddress),
                getTokenPrice(tokenAddress),
                isMentoStablecoin(tokenAddress),
              ]);

            const balanceFormatted = ethers.formatUnits(balance, decimals);
            const priceFormatted = ethers.formatUnits(price, 8); // Price oracle returns 8 decimals

            return {
              address: tokenAddress,
              symbol,
              decimals,
              balance,
              balanceFormatted,
              price,
              priceFormatted,
              isSupported: true,
              isMentoStablecoin: isMento,
            } as TokenInfo;
          } catch (error) {
            console.warn(
              `Error fetching data for token ${tokenAddress}:`,
              error
            );
            return null;
          }
        }
      );

      const tokenInfoResults = await Promise.all(tokenInfoPromises);
      const validTokens = tokenInfoResults.filter(
        (token): token is TokenInfo => token !== null
      );

      // Add native CELO if not already included
      const hasNativeCelo = validTokens.some(
        (token) => token.address === ethers.ZeroAddress
      );
      if (!hasNativeCelo) {
        try {
          const [balance, price] = await Promise.all([
            getTokenBalance(ethers.ZeroAddress),
            getTokenPrice(ethers.ZeroAddress),
          ]);

          const balanceFormatted = ethers.formatUnits(balance, 18);
          const priceFormatted = ethers.formatUnits(price, 8);

          validTokens.unshift({
            address: ethers.ZeroAddress,
            symbol: "CELO",
            decimals: 18,
            balance,
            balanceFormatted,
            price,
            priceFormatted,
            isSupported: true,
            isMentoStablecoin: false,
          });
        } catch (error) {
          console.warn("Error fetching CELO data:", error);
        }
      }

      setTokens(validTokens);
    } catch (error) {
      console.error("Error fetching supported tokens:", error);
      setError("Failed to fetch supported tokens");
    } finally {
      setLoading(false);
    }
  }, [celoLend, priceOracle, mentoIntegration, address, nativeBalance]);

  // Refresh token data when dependencies change
  useEffect(() => {
    if (isConnected && celoLend && priceOracle) {
      fetchSupportedTokens();
    }
  }, [isConnected, celoLend, priceOracle, fetchSupportedTokens]);

  // Categorize tokens
  const nativeToken =
    tokens.find((token) => token.address === ethers.ZeroAddress) || null;
  const stablecoins = tokens.filter((token) => token.isMentoStablecoin);

  return {
    tokens,
    nativeToken,
    stablecoins,
    loading,
    error,
  };
}
