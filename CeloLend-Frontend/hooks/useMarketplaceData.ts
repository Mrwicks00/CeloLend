import { useState, useEffect, useCallback } from "react";
import { useContract } from "@/contexts/ContractContext";
import { useWallet } from "@/contexts/WalletContext";
import { useInterestRate } from "./useInterestRate";
import { calculateInterestRate, LoanParameters } from "@/lib/interestRateUtils";
import {
  formatTokenAmount,
  formatAddress,
} from "@/lib/contracts/contractHelpers";
import { ethers } from "ethers";

export interface LoanRequest {
  id: string;
  borrower: string;
  amount: bigint;
  interestRate: bigint;
  duration: bigint;
  collateralAmount: bigint;
  collateralType: string;
  purpose: string;
  status: "open" | "funding" | "funded" | "repaid";
  fundedAmount: bigint;
  createdAt: bigint;
  borrowerCreditScore: number;
  borrowerCompletedLoans: number;
  borrowerDefaultedLoans: number;
}

export interface MarketplaceStats {
  totalActiveRequests: bigint;
  totalFundedAmount: bigint;
  averageInterestRate: number;
  totalRequests: number;
}

export function useMarketplaceData() {
  const {
    celoLend,
    creditScore: creditScoreContract,
    isConnected,
  } = useContract();
  const { address } = useWallet();
  const { calculateRate, rate, loading: rateLoading } = useInterestRate();

  const [loanRequests, setLoanRequests] = useState<LoanRequest[]>([]);
  const [marketStats, setMarketStats] = useState<MarketplaceStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all active loan requests
  const fetchLoanRequests = useCallback(async () => {
    if (!celoLend) return;

    setLoading(true);
    setError(null);

    try {
      const requests = await celoLend.getActiveLoanRequests();
      const formattedRequests: LoanRequest[] = [];

      for (const request of requests) {
        try {
          // Get borrower credit score
          let borrowerCreditScore = 0;
          let borrowerCompletedLoans = 0;
          let borrowerDefaultedLoans = 0;

          if (creditScoreContract) {
            try {
              const userProfile = await creditScoreContract.getUserProfile(
                request.borrower
              );
              borrowerCreditScore = Number(userProfile.creditScore);
              borrowerCompletedLoans = Number(userProfile.completedLoans);
              borrowerDefaultedLoans = Number(userProfile.defaultedLoans);
            } catch (error) {
              console.warn(
                "Could not fetch credit score for borrower:",
                request.borrower
              );
            }
          }

          formattedRequests.push({
            id: request.id.toString(),
            borrower: request.borrower,
            amount: request.amount,
            interestRate: request.interestRate,
            duration: request.duration,
            collateralAmount: request.collateralAmount,
            collateralType: request.collateralType,
            purpose: request.purpose,
            status: request.status as "open" | "funding" | "funded" | "repaid",
            fundedAmount: request.fundedAmount,
            createdAt: request.createdAt,
            borrowerCreditScore: borrowerCreditScore || 0,
            borrowerCompletedLoans: borrowerCompletedLoans || 0,
            borrowerDefaultedLoans: borrowerDefaultedLoans || 0,
          });
        } catch (error) {
          console.warn("Error processing loan request:", error);
        }
      }

      setLoanRequests(formattedRequests);
    } catch (error) {
      console.error("Error fetching loan requests:", error);
      setError("Failed to fetch loan requests");
    } finally {
      setLoading(false);
    }
  }, [celoLend, creditScoreContract]);

  // Fund a loan request
  const fundLoan = useCallback(
    async (loanId: string, amount: bigint) => {
      if (!celoLend || !isConnected) {
        throw new Error("Wallet not connected");
      }

      try {
        const tx = await celoLend.fundLoan(loanId, amount);
        await tx.wait();

        // Refresh loan requests after funding
        await fetchLoanRequests();

        return tx;
      } catch (error) {
        console.error("Error funding loan:", error);
        throw error;
      }
    },
    [celoLend, isConnected, fetchLoanRequests]
  );

  // Create a new loan request with interest rate calculation
  const createLoanRequest = useCallback(
    async (
      amount: bigint,
      duration: bigint,
      collateralAmount: bigint,
      collateralType: string,
      purpose: string
    ) => {
      if (!celoLend || !isConnected || !address) {
        throw new Error("Wallet not connected");
      }

      try {
        // Calculate interest rate using the algorithm
        if (!creditScoreContract) {
          throw new Error("Credit score contract not available");
        }
        const userStats = await creditScoreContract.getUserProfile(address);
        const creditScore = Number(userStats.creditScore);

        const loanParams: LoanParameters = {
          creditScore,
          loanAmount: Number(ethers.formatEther(amount)),
          loanTerm: Number(duration) / (24 * 3600), // Convert seconds to months
          collateralRatio:
            Number(ethers.formatEther(collateralAmount)) /
            Number(ethers.formatEther(amount)),
          collateralType,
        };

        const rateResult = await calculateInterestRate(loanParams);
        const interestRateBps = BigInt(rateResult.rateInBasisPoints);

        // Create loan request
        const tx = await celoLend.createLoanRequest(
          amount,
          interestRateBps,
          duration,
          collateralAmount,
          collateralType,
          purpose
        );

        await tx.wait();

        // Refresh loan requests after creation
        await fetchLoanRequests();

        return { tx, calculatedRate: rateResult };
      } catch (error) {
        console.error("Error creating loan request:", error);
        throw error;
      }
    },
    [celoLend, creditScoreContract, isConnected, address, fetchLoanRequests]
  );

  // Fetch marketplace statistics
  const fetchMarketStats = useCallback(async () => {
    if (!celoLend) return;

    try {
      const stats = await celoLend.getMarketplaceStats();

      setMarketStats({
        totalActiveRequests: stats.totalActiveRequests,
        totalFundedAmount: stats.totalFundedAmount,
        averageInterestRate: Number(stats.averageInterestRate) / 100, // Convert from basis points
        totalRequests: Number(stats.totalRequests),
      });
    } catch (error) {
      console.error("Error fetching market stats:", error);
    }
  }, [celoLend]);

  // Refresh all data
  const refreshData = useCallback(async () => {
    await Promise.all([fetchLoanRequests(), fetchMarketStats()]);
  }, [fetchLoanRequests, fetchMarketStats]);

  // Initial data fetch
  useEffect(() => {
    if (celoLend) {
      refreshData();
    }
  }, [celoLend, refreshData]);

  return {
    loanRequests,
    marketStats,
    loading,
    error,
    rate,
    rateLoading,
    fundLoan,
    createLoanRequest,
    refreshData,
  };
}
