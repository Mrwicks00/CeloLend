"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMarketplaceData } from "@/hooks/useMarketplaceData";
import { useContract } from "@/contexts/ContractContext";
import { ethers } from "ethers";
import { toast } from "react-toastify";

export function LenderClaims() {
  const { loanRequests, refreshData } = useMarketplaceData();
  const { celoLend, isConnected } = useContract();
  const [claiming, setClaiming] = useState<Record<string, boolean>>({});

  // Filter loans where user is a lender (contributed > 0) and loan is funded or repaid
  const claimableLoans = useMemo(() => {
    return loanRequests.filter(
      (lr) => lr.fundedAmount > BigInt(0) && lr.status !== "open"
    );
  }, [loanRequests]);

  const handleClaim = async (loanId: string) => {
    if (!celoLend || !isConnected) return;
    try {
      setClaiming((p) => ({ ...p, [loanId]: true }));
      toast.info("Claiming repayments...");
      const tx = await celoLend.claimRepayments(loanId);
      await tx.wait();
      toast.success("Repayments claimed");
      await refreshData();
    } catch (e: any) {
      toast.error(e?.message || "Claim failed");
    } finally {
      setClaiming((p) => ({ ...p, [loanId]: false }));
    }
  };

  if (claimableLoans.length === 0) return null;

  return (
    <Card className="border-0 shadow-lg bg-card">
      <CardHeader>
        <CardTitle className="text-lg">Lender Claims</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {claimableLoans.map((lr) => (
          <div
            key={lr.id}
            className="flex items-center justify-between gap-3 p-3 bg-muted rounded-lg"
          >
            <div>
              <div className="text-sm font-semibold">Loan #{lr.id}</div>
              <div className="text-xs text-muted-foreground">
                Funded: {(Number(lr.fundedAmount) / 1e18).toFixed(4)} | Status:{" "}
                {lr.status}
              </div>
            </div>
            <Button
              onClick={() => handleClaim(lr.id)}
              disabled={!!claiming[lr.id]}
              className="btn-primary"
            >
              {claiming[lr.id] ? "Claiming..." : "Claim Repayments"}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
