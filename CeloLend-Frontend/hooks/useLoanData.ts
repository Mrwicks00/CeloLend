"use client";

import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { useContract } from "@/contexts/ContractContext";
import { useWallet } from "@/contexts/WalletContext";
import { useLoanRepayment } from "./useLoanRepayment";

interface LoanRequest {
  id: number;
  borrower: string;
  amount: bigint;
  tokenAddress: string;
  interestRate: bigint;
  duration: bigint;
  collateralAmount: bigint;
  collateralToken: string;
  isActive: boolean;
  isFunded: boolean;
  createdAt: bigint;
}

interface LoanPosition {
  id: number;
  type: "lending" | "borrowing";
  counterparty: string;
  amount: bigint;
  tokenAddress: string;
  interestRate: bigint;
  duration: bigint;
  collateralAmount?: bigint;
  collateralToken?: string;
  isActive: boolean;
  createdAt: bigint;
  daysRemaining: number;
  earned?: bigint;
  healthFactor?: number;
}

interface UserStats {
  totalLent: bigint;
  totalBorrowed: bigint;
  totalCollateral: bigint;
  creditScore: number;
  activeLoans: number;
  completedLoans: number;
  defaultedLoans: number;
}

export function useLoanData() {
  const { celoLend, creditScore, collateralVault, isConnected } = useContract();
  const { address } = useWallet();

  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loanPositions, setLoanPositions] = useState<LoanPosition[]>([]);
  const [activeLoanRequests, setActiveLoanRequests] = useState<LoanRequest[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's loan statistics
  const fetchUserStats = useCallback(async () => {
    if (!celoLend || !creditScore || !address) return;

    try {
      setIsLoading(true);
      setError(null);

      // Get user's loan IDs
      let userLoanIds: bigint[] = [];
      try {
        userLoanIds = await celoLend.getUserLoans(address);
      } catch (error) {
        console.warn("Could not fetch user loans:", error);
        userLoanIds = [];
      }

      // Get platform stats
      const platformStats = await celoLend.getPlatformStats();

      // Get credit profile
      const creditProfile = await creditScore.getCreditProfile(address);

      // Calculate totals from loan positions
      let totalLent = BigInt(0);
      let totalBorrowed = BigInt(0);
      let activeLoans = 0;

      for (const loanId of userLoanIds) {
        const loanRequest = await celoLend.getLoanRequest(loanId);
        if (loanRequest.isActive && loanRequest.isFunded) {
          activeLoans++;
          if (loanRequest.borrower === address) {
            totalBorrowed += loanRequest.amount;
          } else {
            totalLent += loanRequest.amount;
          }
        }
      }

      // Get collateral value (if function exists)
      let collateralValue = BigInt(0);
      try {
        if (collateralVault) {
          collateralValue = await collateralVault.getUserCollateralValue(
            address
          );
        }
      } catch (error) {
        console.warn("getUserCollateralValue not available:", error);
      }

      setUserStats({
        totalLent,
        totalBorrowed,
        totalCollateral: collateralValue,
        creditScore: Number(creditProfile.creditScore),
        activeLoans,
        completedLoans: Number(creditProfile.successfulLoans),
        defaultedLoans: Number(creditProfile.defaultedLoans),
      });
    } catch (err) {
      console.error("Failed to fetch user stats:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch user stats"
      );
    } finally {
      setIsLoading(false);
    }
  }, [celoLend, creditScore, collateralVault, address]);

  // Fetch user's loan positions
  const fetchLoanPositions = useCallback(async () => {
    if (!celoLend || !address) return;

    try {
      setIsLoading(true);
      setError(null);

      let userLoanIds: bigint[] = [];
      try {
        userLoanIds = await celoLend.getUserLoans(address);
      } catch (error) {
        console.warn("Could not fetch user loans for positions:", error);
        userLoanIds = [];
      }
      const positions: LoanPosition[] = [];

      for (const loanId of userLoanIds) {
        const loanRequest = await celoLend.getLoanRequest(loanId);

        if (loanRequest.isActive) {
          const now = BigInt(Math.floor(Date.now() / 1000));
          const endTime = loanRequest.createdAt + loanRequest.duration;
          const daysRemaining = Math.max(0, Number(endTime - now) / 86400); // 86400 seconds in a day

          const position: LoanPosition = {
            id: Number(loanId),
            type: loanRequest.borrower === address ? "borrowing" : "lending",
            counterparty:
              loanRequest.borrower === address
                ? "Lender"
                : loanRequest.borrower,
            amount: loanRequest.amount,
            tokenAddress: loanRequest.tokenAddress,
            interestRate: loanRequest.interestRate,
            duration: loanRequest.duration,
            collateralAmount: loanRequest.collateralAmount,
            collateralToken: loanRequest.collateralToken,
            isActive: loanRequest.isActive,
            createdAt: loanRequest.createdAt,
            daysRemaining: Math.ceil(daysRemaining),
          };

          // Calculate earned interest for lending positions
          if (position.type === "lending") {
            const timeElapsed = now - loanRequest.createdAt;
            const interestEarned =
              (loanRequest.amount *
                BigInt(loanRequest.interestRate) *
                timeElapsed) /
              (BigInt(365) * BigInt(24) * BigInt(3600) * BigInt(10000));
            position.earned = interestEarned;
          }

          // Calculate health factor for borrowing positions
          if (position.type === "borrowing") {
            // This would need price oracle integration for accurate calculation
            position.healthFactor = 2.0; // Placeholder
          }

          positions.push(position);
        }
      }

      setLoanPositions(positions);
    } catch (err) {
      console.error("Failed to fetch loan positions:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch loan positions"
      );
    } finally {
      setIsLoading(false);
    }
  }, [celoLend, address]);

  // Fetch active loan requests in marketplace
  const fetchActiveLoanRequests = useCallback(async () => {
    if (!celoLend) return;

    try {
      setIsLoading(true);
      setError(null);

      let activeRequests: bigint[] = [];
      try {
        activeRequests = await celoLend.getActiveLoanRequests();
      } catch (error) {
        console.warn("Could not fetch active loan requests:", error);
        activeRequests = [];
      }
      const requests: LoanRequest[] = [];

      for (const requestId of activeRequests) {
        const request = await celoLend.getLoanRequest(requestId);
        requests.push(request);
      }

      setActiveLoanRequests(requests);
    } catch (err) {
      console.error("Failed to fetch active loan requests:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to fetch active loan requests"
      );
    } finally {
      setIsLoading(false);
    }
  }, [celoLend]);

  // Refresh all loan data
  const refreshLoanData = useCallback(async () => {
    if (!isConnected || !address) return;

    await Promise.all([
      fetchUserStats(),
      fetchLoanPositions(),
      fetchActiveLoanRequests(),
    ]);
  }, [
    isConnected,
    address,
    fetchUserStats,
    fetchLoanPositions,
    fetchActiveLoanRequests,
  ]);

  // Auto-fetch data when contracts are connected
  useEffect(() => {
    if (isConnected && address) {
      refreshLoanData();
    }
  }, [isConnected, address, refreshLoanData]);

  return {
    userStats,
    loanPositions,
    activeLoanRequests,
    isLoading,
    error,
    refreshLoanData,
    fetchUserStats,
    fetchLoanPositions,
    fetchActiveLoanRequests,
  };
}
