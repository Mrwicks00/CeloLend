"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Loader2 } from "lucide-react";
import { RepaymentCard } from "./RepaymentCard";
import { useLoanRepayment } from "@/hooks/useLoanRepayment";

export function RepaymentSection() {
  const { getUserActiveLoans, loading } = useLoanRepayment();
  const [activeLoans, setActiveLoans] = useState<bigint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadActiveLoans = async () => {
      setIsLoading(true);
      try {
        const loans = await getUserActiveLoans();
        setActiveLoans(loans);
      } catch (error) {
        console.error("Error loading active loans:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadActiveLoans();
  }, [getUserActiveLoans]);

  const handlePaymentSuccess = () => {
    // Refresh the loans list after successful payment
    getUserActiveLoans().then(setActiveLoans);
  };

  if (isLoading) {
    return (
      <Card className="border-0 shadow-lg bg-card">
        <CardHeader>
          <CardTitle className="text-xl flex items-center text-card-foreground">
            <CreditCard className="w-5 h-5 mr-2 text-primary" />
            Loan Repayments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">
              Loading repayments...
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg bg-card">
      <CardHeader>
        <CardTitle className="text-xl flex items-center text-card-foreground">
          <CreditCard className="w-5 h-5 mr-2 text-primary" />
          Loan Repayments
          {activeLoans.length > 0 && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({activeLoans.length} active)
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activeLoans.length > 0 ? (
            activeLoans.map((loanId) => (
              <RepaymentCard
                key={loanId.toString()}
                loanId={loanId}
                onPaymentSuccess={handlePaymentSuccess}
              />
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-lg font-medium">No Active Loans</p>
              <p className="text-sm">
                You don't have any funded loans requiring repayment.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

