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
      const requestIds = await celoLend.getActiveLoanRequests();
      const formattedRequests: LoanRequest[] = [];

      for (const requestId of requestIds) {
        try {
          // Get the full loan request details
          const request = await celoLend.getLoanRequest(requestId);

          // Get borrower credit score
          let borrowerCreditScore = 0;
          let borrowerCompletedLoans = 0;
          let borrowerDefaultedLoans = 0;

          if (creditScoreContract) {
            try {
              const userStats = await creditScoreContract.getUserStats(
                request.borrower
              );
              borrowerCreditScore = Number(userStats.creditScore);
              borrowerCompletedLoans = Number(userStats.successfulLoans);
              borrowerDefaultedLoans = Number(userStats.defaultedLoans);
            } catch (error) {
              console.warn(
                "Could not fetch credit score for borrower:",
                request.borrower
              );
            }
          }

          // Determine status based on contract data
          let status: "open" | "funding" | "funded" | "repaid" = "open";
          if (request.isFunded) {
            status = "funded";
          }

          // Get token symbol for collateral
          let collateralType = "CELO";
          if (
            request.collateralToken ===
            "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1"
          ) {
            collateralType = "cUSD";
          } else if (
            request.collateralToken ===
            "0x10c892A6EC43a53E45D0B916B4b7D383B1b78C0F"
          ) {
            collateralType = "cEUR";
          } else if (
            request.collateralToken ===
            "0xE4D517785D091D3c54818832dB6094bcc2744545"
          ) {
            collateralType = "cREAL";
          }

          formattedRequests.push({
            id: request.id.toString(),
            borrower: request.borrower,
            amount: request.amount,
            interestRate: request.interestRate,
            duration: request.duration,
            collateralAmount: request.collateralAmount,
            collateralType,
            purpose: "General Purpose", // Default purpose - could improve this
            status,
            fundedAmount: request.isFunded ? request.amount : BigInt(0),
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

  // Check token allowance
  const checkTokenAllowance = useCallback(
    async (tokenAddress: string, amount: bigint, spenderAddress: string) => {
      if (!isConnected || !address) {
        throw new Error("Wallet not connected");
      }

      // Skip approval for native token (CELO)
      if (tokenAddress === ethers.ZeroAddress) {
        return { needsApproval: false, approved: true };
      }

      try {
        // Get token contract
        const tokenContract = new ethers.Contract(
          tokenAddress,
          ["function allowance(address,address) view returns (uint256)"],
          celoLend?.runner
        );

        // Check current allowance
        const allowance = await tokenContract.allowance(
          address,
          spenderAddress
        );

        if (allowance >= amount) {
          return { needsApproval: false, approved: true };
        }

        return { needsApproval: true, approved: false };
      } catch (error) {
        console.error("Token allowance check failed:", error);
        throw new Error("Failed to check token allowance");
      }
    },
    [celoLend, isConnected, address]
  );

  // Approve token
  const approveToken = useCallback(
    async (tokenAddress: string, spenderAddress: string) => {
      if (!isConnected || !address) {
        throw new Error("Wallet not connected");
      }

      // Skip approval for native token (CELO)
      if (tokenAddress === ethers.ZeroAddress) {
        return true;
      }

      try {
        // Get token contract
        const tokenContract = new ethers.Contract(
          tokenAddress,
          ["function approve(address,uint256) returns (bool)"],
          celoLend?.runner
        );

        // Approve max amount for convenience
        const maxApproval = ethers.parseUnits("1000000", 18); // 1M tokens
        const approveTx = await tokenContract.approve(
          spenderAddress,
          maxApproval
        );
        await approveTx.wait();

        return true;
      } catch (error) {
        console.error("Token approval failed:", error);
        throw new Error("Failed to approve token");
      }
    },
    [celoLend, isConnected, address]
  );

  // Cancel a loan request
  const cancelLoanRequest = useCallback(
    async (loanId: string) => {
      if (!celoLend || !isConnected || !address) {
        throw new Error("Wallet not connected");
      }

      try {
        const tx = await celoLend.cancelLoanRequest(loanId);
        await tx.wait();

        // Refresh loan requests after cancellation
        await fetchLoanRequests();

        return tx;
      } catch (error) {
        console.error("Error cancelling loan request:", error);
        throw error;
      }
    },
    [celoLend, isConnected, address, fetchLoanRequests]
  );

  // Create a new loan request with interest rate calculation
  const createLoanRequest = useCallback(
    async (
      amount: bigint,
      loanTokenAddress: string,
      duration: bigint,
      collateralAmount: bigint,
      collateralTokenAddress: string,
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
        const userStats = await creditScoreContract.getUserStats(address);
        const creditScore = Number(userStats.creditScore);

        // Get token symbols for collateral type
        let collateralSymbol = "UNKNOWN";
        if (collateralTokenAddress === ethers.ZeroAddress) {
          collateralSymbol = "CELO";
        } else {
          try {
            const tokenContract = new ethers.Contract(
              collateralTokenAddress,
              ["function symbol() view returns (string)"],
              celoLend.runner
            );
            collateralSymbol = await tokenContract.symbol();
          } catch {
            collateralSymbol = "UNKNOWN";
          }
        }

        const loanParams: LoanParameters = {
          creditScore,
          loanAmount: Number(ethers.formatEther(amount)), // Assuming 18 decimals for now
          loanTerm: Number(duration) / (24 * 3600), // Convert seconds to days
          collateralRatio:
            Number(ethers.formatEther(collateralAmount)) /
            Number(ethers.formatEther(amount)),
          collateralType: collateralSymbol,
        };

        const rateResult = await calculateInterestRate(loanParams);
        const interestRateBps = BigInt(rateResult.rateInBasisPoints);

        // Create loan request - parameters: amount, tokenAddress, interestRate, duration, collateralAmount, collateralToken
        const tx = await celoLend.createLoanRequest(
          amount,
          loanTokenAddress,
          interestRateBps,
          duration,
          collateralAmount,
          collateralTokenAddress
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
      // Since getMarketplaceStats doesn't exist, let's create basic stats
      const supportedTokens = await celoLend.getSupportedTokens();
      const activeLoanRequests = await celoLend.getActiveLoanRequests();

      // Calculate basic stats from available data
      const totalActiveRequests = BigInt(activeLoanRequests.length);
      let totalFundedAmount = BigInt(0);
      let averageInterestRate = 0;

      // Calculate totals from loan requests
      if (activeLoanRequests.length > 0) {
        let totalInterest = 0;
        for (const request of activeLoanRequests) {
          if (request.isFunded) {
            totalFundedAmount += request.amount;
          }
          totalInterest += Number(request.interestRate);
        }
        averageInterestRate = totalInterest / activeLoanRequests.length / 100; // Convert from basis points
      }

      setMarketStats({
        totalActiveRequests,
        totalFundedAmount,
        averageInterestRate,
        totalRequests: activeLoanRequests.length,
      });
    } catch (error) {
      console.error("Error fetching market stats:", error);
      // Set default stats on error
      setMarketStats({
        totalActiveRequests: BigInt(0),
        totalFundedAmount: BigInt(0),
        averageInterestRate: 0,
        totalRequests: 0,
      });
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
    cancelLoanRequest,
    checkTokenAllowance,
    approveToken,
    refreshData,
  };
}
