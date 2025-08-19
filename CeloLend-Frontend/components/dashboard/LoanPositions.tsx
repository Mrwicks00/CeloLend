"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HandCoins, ArrowDownRight, Shield } from "lucide-react";
import { useLoanData } from "@/hooks/useLoanData";
import {
  formatTokenAmount,
  formatUSDValue,
  formatInterestRate,
  formatAddress,
  getHealthFactorStatus,
} from "@/lib/contracts/contractHelpers";

export function LoanPositions() {
  const { loanPositions, isLoading } = useLoanData();

  if (isLoading) {
    return (
      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        {[...Array(2)].map((_, i) => (
          <Card key={i} className="border-0 shadow-lg bg-card animate-pulse">
            <CardHeader>
              <div className="h-6 bg-muted rounded w-32"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[...Array(2)].map((_, j) => (
                  <div key={j} className="p-4 bg-muted rounded-lg">
                    <div className="space-y-2">
                      <div className="h-4 bg-muted rounded w-24"></div>
                      <div className="h-6 bg-muted rounded w-32"></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const lendingPositions = loanPositions.filter(
    (pos) => pos.type === "lending"
  );
  const borrowingPositions = loanPositions.filter(
    (pos) => pos.type === "borrowing"
  );

  return (
    <div className="grid lg:grid-cols-2 gap-8 mb-8">
      {/* Lending Positions */}
      <Card className="border-0 shadow-lg bg-card">
        <CardHeader>
          <CardTitle className="text-xl flex items-center text-card-foreground">
            <HandCoins className="w-5 h-5 mr-2 text-primary" />
            Active Loans (Lending)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {lendingPositions.map((position) => (
              <div key={position.id} className="p-4 bg-muted rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold text-lg text-card-foreground">
                      {formatTokenAmount(
                        position.amount,
                        position.tokenAddress
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      to {formatAddress(position.counterparty)}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant="secondary"
                      className="bg-green-500/10 text-green-400 mb-1"
                    >
                      {formatInterestRate(position.interestRate)} APY
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      {position.daysRemaining} days left
                    </p>
                  </div>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">
                    Earned:{" "}
                    {position.earned
                      ? formatTokenAmount(
                          position.earned,
                          position.tokenAddress
                        )
                      : "0"}
                  </span>
                  <div className="flex items-center space-x-1">
                    <Shield className="w-3 h-3 text-primary" />
                    <span className="text-muted-foreground">Active</span>
                  </div>
                </div>
              </div>
            ))}
            {lendingPositions.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>No active lending positions</p>
                <Button className="btn-primary mt-4">Start Lending</Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Borrowing Positions */}
      <Card className="border-0 shadow-lg bg-card">
        <CardHeader>
          <CardTitle className="text-xl flex items-center text-card-foreground">
            <ArrowDownRight className="w-5 h-5 mr-2 text-primary" />
            Active Loans (Borrowing)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {borrowingPositions.map((position) => {
              const healthStatus = getHealthFactorStatus(
                position.healthFactor || 2.0
              );

              return (
                <div key={position.id} className="p-4 bg-muted rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-lg text-card-foreground">
                        {formatTokenAmount(
                          position.amount,
                          position.tokenAddress
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        from {formatAddress(position.counterparty)}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant="secondary"
                        className="bg-red-500/10 text-red-400 mb-1"
                      >
                        {formatInterestRate(position.interestRate)} APY
                      </Badge>
                      <p className={`text-xs ${healthStatus.color}`}>
                        Health: {position.healthFactor?.toFixed(1) || "2.0"}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Collateral:{" "}
                      {position.collateralAmount && position.collateralToken
                        ? formatTokenAmount(
                            position.collateralAmount,
                            position.collateralToken
                          )
                        : "N/A"}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {position.daysRemaining} days left
                    </span>
                  </div>
                </div>
              );
            })}
            {borrowingPositions.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>No active borrowing positions</p>
                <Button className="btn-primary mt-4">Request Loan</Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
