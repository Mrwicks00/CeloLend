import { useState, useEffect, useCallback } from "react";
import { useContract } from "@/contexts/ContractContext";
import { ethers } from "ethers";

export interface LoanLimits {
  minLoanAmount: bigint;
  maxLoanAmount: bigint;
  minCollateralRatio: bigint;
  minLoanAmountFormatted: string;
  maxLoanAmountFormatted: string;
  minCollateralRatioPercent: number;
  loading: boolean;
  error: string | null;
}

export function useLoanLimits(): LoanLimits {
  const { celoLend, isConnected } = useContract();
  
  const [limits, setLimits] = useState<LoanLimits>({
    minLoanAmount: BigInt(0),
    maxLoanAmount: BigInt(0),
    minCollateralRatio: BigInt(0),
    minLoanAmountFormatted: "0",
    maxLoanAmountFormatted: "0",
    minCollateralRatioPercent: 0,
    loading: false,
    error: null,
  });

  const fetchLoanLimits = useCallback(async () => {
    if (!celoLend) return;

    setLimits(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Fetch loan limits from contract
      const [minAmount, maxAmount, minRatio] = await Promise.all([
        celoLend.minLoanAmount(),
        celoLend.maxLoanAmount(), 
        celoLend.minCollateralRatio(),
      ]);

      // Format amounts (assuming 18 decimals for display)
      const minAmountFormatted = ethers.formatEther(minAmount);
      const maxAmountFormatted = ethers.formatEther(maxAmount);
      
      // Convert basis points to percentage (15000 basis points = 150%)
      const ratioPercent = Number(minRatio) / 100;

      setLimits({
        minLoanAmount: minAmount,
        maxLoanAmount: maxAmount,
        minCollateralRatio: minRatio,
        minLoanAmountFormatted: minAmountFormatted,
        maxLoanAmountFormatted: maxAmountFormatted,
        minCollateralRatioPercent: ratioPercent,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error("Error fetching loan limits:", error);
      setLimits(prev => ({
        ...prev,
        loading: false,
        error: "Failed to fetch loan limits",
      }));
    }
  }, [celoLend]);

  useEffect(() => {
    if (celoLend) {
      fetchLoanLimits();
    }
  }, [celoLend, fetchLoanLimits]);

  return limits;
}
