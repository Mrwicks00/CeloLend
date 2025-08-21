"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { formatEther } from "viem";
import type { WalletContextType, WalletState } from "@/types/wallet";
import { SUPPORTED_NETWORKS } from "@/lib/contracts/addresses";

const WalletContext = createContext<WalletContextType | null>(null);

interface WalletProviderProps {
  children: React.ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const { user, authenticated, login, logout, ready } = usePrivy();
  const { wallets } = useWallets();

  // Get the first connected wallet (embedded or external)
  const wallet = wallets[0];

  // Wallet state
  const [state, setState] = useState<WalletState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    address: null,
    balance: "0",
    chainId: 44787, // Default to Alfajores
    isConnected: false,
    isWrongNetwork: false,
  });

  // Check if user is on correct network
  const isCorrectNetwork = useCallback((chainId: number) => {
    return chainId === 44787 || chainId === 42220; // Alfajores or Celo mainnet
  }, []);

  // Refresh balance
  const refreshBalance = useCallback(async () => {
    if (!wallet?.address) return;

    try {
      const provider = await wallet.getEthereumProvider();
      const balance = await provider.request({
        method: "eth_getBalance",
        params: [wallet.address, "latest"],
      });

      const formattedBalance = formatEther(BigInt(balance));
      setState((prev) => ({ ...prev, balance: formattedBalance }));
    } catch (error) {
      console.error("Error fetching balance:", error);
    }
  }, [wallet]);

  // Switch to Alfajores testnet
  const switchToAlfajores = useCallback(async () => {
    if (!wallet) return;

    try {
      const provider = await wallet.getEthereumProvider();
      const alfajoresConfig = SUPPORTED_NETWORKS.alfajores;

      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${alfajoresConfig.chainId.toString(16)}` }],
      });
    } catch (switchError: any) {
      // Chain doesn't exist, add it
      if (switchError.code === 4902) {
        try {
          const provider = await wallet.getEthereumProvider();
          const alfajoresConfig = SUPPORTED_NETWORKS.alfajores;

          await provider.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: `0x${alfajoresConfig.chainId.toString(16)}`,
                chainName: alfajoresConfig.name,
                rpcUrls: [alfajoresConfig.rpcUrl],
                nativeCurrency: alfajoresConfig.nativeCurrency,
                blockExplorerUrls: [alfajoresConfig.blockExplorer],
              },
            ],
          });
        } catch (addError) {
          console.error("Error adding Alfajores network:", addError);
          throw addError;
        }
      } else {
        console.error("Error switching to Alfajores:", switchError);
        throw switchError;
      }
    }
  }, [wallet]);

  // Switch to Celo mainnet
  const switchToCelo = useCallback(async () => {
    if (!wallet) return;

    try {
      const provider = await wallet.getEthereumProvider();
      const celoConfig = SUPPORTED_NETWORKS.celo;

      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${celoConfig.chainId.toString(16)}` }],
      });
    } catch (switchError: any) {
      // Chain doesn't exist, add it
      if (switchError.code === 4902) {
        try {
          const provider = await wallet.getEthereumProvider();
          const celoConfig = SUPPORTED_NETWORKS.celo;

          await provider.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: `0x${celoConfig.chainId.toString(16)}`,
                chainName: celoConfig.name,
                rpcUrls: [celoConfig.rpcUrl],
                nativeCurrency: celoConfig.nativeCurrency,
                blockExplorerUrls: [celoConfig.blockExplorer],
              },
            ],
          });
        } catch (addError) {
          console.error("Error adding Celo network:", addError);
          throw addError;
        }
      } else {
        console.error("Error switching to Celo:", switchError);
        throw switchError;
      }
    }
  }, [wallet]);

  // Send transaction
  const sendTransaction = useCallback(
    async (to: string, value: string, data?: string) => {
      if (!wallet) throw new Error("No wallet connected");

      const provider = await wallet.getEthereumProvider();
      const txHash = await provider.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: wallet.address,
            to,
            value: `0x${BigInt(value).toString(16)}`,
            data: data || "0x",
          },
        ],
      });

      return txHash;
    },
    [wallet]
  );

  // Update state when wallet changes
  useEffect(() => {
    if (!ready) return;

    setState((prev) => ({
      ...prev,
      user,
      isAuthenticated: authenticated,
      isLoading: false,
      isConnected: !!wallet?.address,
      address: wallet?.address || null,
    }));

    // Get chain ID and refresh balance when wallet is connected
    if (wallet?.address) {
      (async () => {
        try {
          const provider = await wallet.getEthereumProvider();
          const chainId = await provider.request({ method: "eth_chainId" });
          const numericChainId = parseInt(chainId, 16);

          setState((prev) => ({
            ...prev,
            chainId: numericChainId,
            isWrongNetwork: !isCorrectNetwork(numericChainId),
          }));

          // Refresh balance
          await refreshBalance();
        } catch (error) {
          console.error("Error getting wallet info:", error);
        }
      })();
    }
  }, [ready, authenticated, user, wallet, refreshBalance, isCorrectNetwork]);

  // Listen for network changes
  useEffect(() => {
    if (!wallet) return;

    const handleChainChanged = (chainId: string) => {
      const numericChainId = parseInt(chainId, 16);
      setState((prev) => ({
        ...prev,
        chainId: numericChainId,
        isWrongNetwork: !isCorrectNetwork(numericChainId),
      }));
      refreshBalance();
    };

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        // Wallet disconnected
        setState((prev) => ({
          ...prev,
          isConnected: false,
          address: null,
          balance: "0",
        }));
      } else {
        // Account changed
        setState((prev) => ({
          ...prev,
          address: accounts[0],
        }));
        refreshBalance();
      }
    };

    const setupListeners = async () => {
      const provider = await wallet.getEthereumProvider();
      provider.on("chainChanged", handleChainChanged);
      provider.on("accountsChanged", handleAccountsChanged);
    };

    setupListeners();

    return () => {
      wallet.getEthereumProvider().then((provider) => {
        provider.removeListener("chainChanged", handleChainChanged);
        provider.removeListener("accountsChanged", handleAccountsChanged);
      });
    };
  }, [wallet, refreshBalance, isCorrectNetwork]);

  const contextValue: WalletContextType = {
    ...state,
    login,
    logout,
    switchToAlfajores,
    switchToCelo,
    refreshBalance,
    sendTransaction,
  };

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
}

// Hook to use wallet context
export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}
