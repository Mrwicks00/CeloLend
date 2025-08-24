"use client";

import { useState, useCallback, useEffect } from "react";
import { ethers } from "ethers";
import { useContract } from "@/contexts/ContractContext";
import { useWallet } from "@/contexts/WalletContext";
import { toast } from "react-toastify";

export interface LoanRepaymentInfo {
  loanId: bigint;
  totalOwed: bigint;
  principalRemaining: bigint;
  interestAccrued: bigint;
  lastPaymentDate: bigint;
  nextDueDate: bigint;
  isOverdue: boolean;
  daysOverdue: number;
  repaymentStatus: number; // 0: Active, 1: PaidOff, 2: Defaulted
  isEarlyRepayment: boolean;
  canLiquidate: boolean;
}

export interface RepaymentCalculation {
  fullAmount: bigint;
  minimumPayment: bigint;
  interestPortion: bigint;
  principalPortion: bigint;
  earlyPaymentDiscount: bigint;
}

export function useLoanRepayment() {
  const { loanRepayment, celoLend, isConnected } = useContract();
  const { address } = useWallet();

  const [loading, setLoading] = useState(false);
  const [repaymentInfo, setRepaymentInfo] = useState<LoanRepaymentInfo | null>(
    null
  );
  const [calculation, setCalculation] = useState<RepaymentCalculation | null>(
    null
  );

  // Get loan repayment information
  const getLoanRepaymentInfo = useCallback(
    async (loanId: bigint): Promise<LoanRepaymentInfo | null> => {
      if (!loanRepayment || !isConnected) return null;

      try {
        setLoading(true);

        // Get repayment info from contract
        const info = await loanRepayment.getLoanRepaymentInfo(loanId);
        const status = await loanRepayment.getRepaymentStatus(loanId);
        const isOverdue = await loanRepayment.isLoanOverdue(loanId);

        // Calculate days overdue
        const currentTime = Math.floor(Date.now() / 1000);
        const daysOverdue = isOverdue
          ? Math.floor(
              (currentTime - Number(info.nextDueDate)) / (24 * 60 * 60)
            )
          : 0;

        const repaymentData: LoanRepaymentInfo = {
          loanId,
          totalOwed: info.totalOwed,
          principalRemaining: info.principalRemaining,
          interestAccrued: info.interestAccrued,
          lastPaymentDate: info.lastPaymentDate,
          nextDueDate: info.nextDueDate,
          isOverdue,
          daysOverdue: Math.max(0, daysOverdue),
          repaymentStatus: status,
          isEarlyRepayment: info.isEarlyRepayment,
          canLiquidate: status === 2, // Defaulted
        };

        setRepaymentInfo(repaymentData);
        return repaymentData;
      } catch (error) {
        console.error("Error fetching repayment info:", error);
        toast.error("Failed to fetch repayment information");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [loanRepayment, isConnected]
  );

  // Calculate repayment amounts
  const calculateRepayment = useCallback(
    async (
      loanId: bigint,
      paymentAmount?: bigint
    ): Promise<RepaymentCalculation | null> => {
      if (!loanRepayment || !isConnected) return null;

      try {
        // Get current amount owed
        const totalOwed = await loanRepayment.calculateAmountOwed(loanId);

        // If no specific payment amount, use full amount
        const amount = paymentAmount || totalOwed;

        // Get loan details for calculations
        const info = await loanRepayment.getLoanRepaymentInfo(loanId);

        // Calculate portions
        const interestPortion = info.interestAccrued;
        const principalPortion =
          amount > interestPortion ? amount - interestPortion : BigInt(0);

        // Early payment discount (if paying in full before due date)
        const isEarly = info.isEarlyRepayment && amount >= totalOwed;
        const earlyDiscount = isEarly ? totalOwed / BigInt(20) : BigInt(0); // 5% discount

        // Minimum payment (interest + 10% of principal)
        const minPayment =
          interestPortion + info.principalRemaining / BigInt(10);

        const calc: RepaymentCalculation = {
          fullAmount: totalOwed - earlyDiscount,
          minimumPayment: minPayment,
          interestPortion,
          principalPortion,
          earlyPaymentDiscount: earlyDiscount,
        };

        setCalculation(calc);
        return calc;
      } catch (error) {
        console.error("Error calculating repayment:", error);
        return null;
      }
    },
    [loanRepayment, isConnected]
  );

  // Make a loan payment
  const makePayment = useCallback(
    async (
      loanId: bigint,
      paymentAmount: bigint,
      tokenAddress: string
    ): Promise<boolean> => {
      if (!loanRepayment || !address) {
        toast.error("Wallet not connected");
        return false;
      }

      try {
        setLoading(true);
        toast.info("Processing payment...");

        let tx;

        if (tokenAddress === "0x0000000000000000000000000000000000000000") {
          // Native CELO payment
          tx = await loanRepayment.makePayment(
            loanId,
            tokenAddress,
            paymentAmount,
            {
              value: paymentAmount,
            }
          );
        } else {
          // ERC20 token payment - need approval first
          const ERC20_ABI = [
            "function approve(address spender, uint256 amount) returns (bool)",
            "function allowance(address owner, address spender) view returns (uint256)",
          ];

          const tokenContract = new ethers.Contract(
            tokenAddress,
            ERC20_ABI,
            loanRepayment.runner
          );
          const allowance = await tokenContract.allowance(
            address,
            await loanRepayment.getAddress()
          );

          if (allowance < paymentAmount) {
            toast.info("Approving token transfer...");
            const approveTx = await tokenContract.approve(
              await loanRepayment.getAddress(),
              paymentAmount
            );
            await approveTx.wait();
            toast.success("Token approved!");
          }

          tx = await loanRepayment.makePayment(
            loanId,
            tokenAddress,
            paymentAmount
          );
        }

        const receipt = await tx.wait();

        if (receipt.status === 1) {
          toast.success("Payment successful!");

          // Refresh repayment info
          await getLoanRepaymentInfo(loanId);

          return true;
        } else {
          toast.error("Payment failed");
          return false;
        }
      } catch (error: any) {
        console.error("Payment error:", error);

        if (error.message?.includes("insufficient funds")) {
          toast.error("Insufficient funds for payment");
        } else if (error.message?.includes("allowance")) {
          toast.error("Token approval required");
        } else if (error.message?.includes("Loan not found")) {
          toast.error("Loan not found");
        } else {
          toast.error("Payment failed. Please try again.");
        }

        return false;
      } finally {
        setLoading(false);
      }
    },
    [loanRepayment, address, getLoanRepaymentInfo]
  );

  // Check if user has borrowed loans that need repayment
  const getUserActiveLoans = useCallback(async (): Promise<bigint[]> => {
    if (!celoLend || !address) return [];

    try {
      // Get all loan requests for the user
      const filter = celoLend.filters.LoanRequestCreated(null, address);
      const events = await celoLend.queryFilter(filter);

      const activeLoans: bigint[] = [];

      for (const event of events) {
        const loanId = event.args?.[0];
        if (loanId) {
          // Check if loan is funded (has repayment info)
          try {
            const info = await loanRepayment?.getLoanRepaymentInfo(loanId);
            if (info && info.principalRemaining > 0) {
              activeLoans.push(loanId);
            }
          } catch {
            // Loan not initialized for repayment yet
          }
        }
      }

      return activeLoans;
    } catch (error) {
      console.error("Error fetching user loans:", error);
      return [];
    }
  }, [celoLend, loanRepayment, address]);

  return {
    // State
    loading,
    repaymentInfo,
    calculation,

    // Functions
    getLoanRepaymentInfo,
    calculateRepayment,
    makePayment,
    getUserActiveLoans,
    // Expose raw contract for claims if needed
    loanRepaymentContract: loanRepayment,
  };
}
