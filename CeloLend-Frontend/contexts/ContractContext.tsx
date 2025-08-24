"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { ethers } from "ethers";
import { useWallet } from "./WalletContext";
import { useWallets } from "@privy-io/react-auth";
import { CONTRACT_ADDRESSES } from "@/lib/contracts/addresses";
import {
  CELO_LEND_ABI,
  PRICE_ORACLE_ABI,
  COLLATERAL_VAULT_ABI,
  CREDIT_SCORE_ABI,
  MENTO_INTEGRATION_ABI,
  LOAN_AGREEMENT_ABI,
  TREASURY_ABI,
  LOAN_REPAYMENT_ABI,
} from "@/lib/contracts/abi";

interface ContractState {
  celoLend: ethers.Contract | null;
  priceOracle: ethers.Contract | null;
  collateralVault: ethers.Contract | null;
  creditScore: ethers.Contract | null;
  mentoIntegration: ethers.Contract | null;
  loanAgreement: ethers.Contract | null;
  treasury: ethers.Contract | null;
  loanRepayment: ethers.Contract | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
}

interface ContractActions {
  connectContracts: () => Promise<void>;
  refreshData: () => Promise<void>;
  getContract: (
    contractName: keyof typeof CONTRACT_ADDRESSES.alfajores
  ) => ethers.Contract | null;
}

interface ContractContextType extends ContractState, ContractActions {}

const ContractContext = createContext<ContractContextType | undefined>(
  undefined
);

export function ContractProvider({ children }: { children: React.ReactNode }) {
  const { address, isAuthenticated, chainId } = useWallet();
  const { wallets } = useWallets();

  const [contracts, setContracts] = useState<{
    celoLend: ethers.Contract | null;
    priceOracle: ethers.Contract | null;
    collateralVault: ethers.Contract | null;
    creditScore: ethers.Contract | null;
    mentoIntegration: ethers.Contract | null;
    loanAgreement: ethers.Contract | null;
    treasury: ethers.Contract | null;
    loanRepayment: ethers.Contract | null;
  }>({
    celoLend: null,
    priceOracle: null,
    collateralVault: null,
    creditScore: null,
    mentoIntegration: null,
    loanAgreement: null,
    treasury: null,
    loanRepayment: null,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connectContracts = useCallback(async () => {
    if (!isAuthenticated || !address) {
      setError("Wallet not connected");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Get network-specific addresses
      const network = chainId === 44787 ? "alfajores" : "celo";
      const addresses = CONTRACT_ADDRESSES[network];

      // Create provider for the current network
      const provider = new ethers.JsonRpcProvider(
        network === "alfajores"
          ? "https://alfajores-forno.celo-testnet.org"
          : "https://forno.celo.org"
      );

      // Get signer from Privy wallet for transactions
      let contractRunner: ethers.ContractRunner = provider;
      const wallet = wallets[0];
      if (wallet) {
        try {
          const walletProvider = await wallet.getEthereumProvider();
          const browserProvider = new ethers.BrowserProvider(walletProvider);
          contractRunner = await browserProvider.getSigner();
        } catch (signerError) {
          console.warn(
            "Could not get signer from Privy wallet, using read-only provider:",
            signerError
          );
        }
      }

      // Initialize contracts with contract runner (signer or provider)
      const celoLend = new ethers.Contract(
        addresses.CeloLend,
        CELO_LEND_ABI,
        contractRunner
      );

      const priceOracle = new ethers.Contract(
        addresses.PriceOracle,
        PRICE_ORACLE_ABI,
        contractRunner
      );

      const collateralVault = new ethers.Contract(
        addresses.CollateralVault,
        COLLATERAL_VAULT_ABI,
        contractRunner
      );

      const creditScore = new ethers.Contract(
        addresses.CreditScore,
        CREDIT_SCORE_ABI,
        contractRunner
      );

      const mentoIntegration = new ethers.Contract(
        addresses.MentoIntegration,
        MENTO_INTEGRATION_ABI,
        contractRunner
      );

      // Note: LoanAgreement might not be deployed yet, using CeloLend address as placeholder
      const loanAgreement = new ethers.Contract(
        addresses.CeloLend,
        LOAN_AGREEMENT_ABI,
        contractRunner
      );

      const treasury = new ethers.Contract(
        addresses.Treasury,
        TREASURY_ABI,
        contractRunner
      );

      const loanRepayment = new ethers.Contract(
        addresses.LoanRepayment,
        LOAN_REPAYMENT_ABI,
        contractRunner
      );

      setContracts({
        celoLend,
        priceOracle,
        collateralVault,
        creditScore,
        mentoIntegration,
        loanAgreement,
        treasury,
        loanRepayment,
      });
    } catch (err) {
      console.error("Failed to connect contracts:", err);
      setError(
        err instanceof Error ? err.message : "Failed to connect contracts"
      );
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, address, chainId, wallets]);

  const getContract = useCallback(
    (contractName: keyof typeof CONTRACT_ADDRESSES.alfajores) => {
      const contractMap = {
        CeloLend: contracts.celoLend,
        PriceOracle: contracts.priceOracle,
        CollateralVault: contracts.collateralVault,
        CreditScore: contracts.creditScore,
        MentoIntegration: contracts.mentoIntegration,
        Treasury: contracts.treasury,
        LoanRepayment: contracts.loanRepayment,
      };
      return contractMap[contractName] || null;
    },
    [contracts]
  );

  const refreshData = useCallback(async () => {
    await connectContracts();
  }, [connectContracts]);

  // Auto-connect contracts when wallet is authenticated
  useEffect(() => {
    if (isAuthenticated && address) {
      connectContracts();
    } else {
      // Reset contracts when wallet disconnects
      setContracts({
        celoLend: null,
        priceOracle: null,
        collateralVault: null,
        creditScore: null,
        mentoIntegration: null,
        loanAgreement: null,
        treasury: null,
        loanRepayment: null,
      });
    }
  }, [isAuthenticated, address, connectContracts, wallets]);

  const value: ContractContextType = {
    ...contracts,
    isConnected: isAuthenticated && !!contracts.celoLend,
    isLoading,
    error,
    connectContracts,
    refreshData,
    getContract,
  };

  return (
    <ContractContext.Provider value={value}>
      {children}
    </ContractContext.Provider>
  );
}

export function useContract() {
  const context = useContext(ContractContext);
  if (context === undefined) {
    throw new Error("useContract must be used within a ContractProvider");
  }
  return context;
}
