"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowDownRight,
  Plus,
  TrendingUp,
  Shield,
  HandCoins,
} from "lucide-react";
import { useLoanData } from "@/hooks/useLoanData";
import { useWallet } from "@/contexts/WalletContext";
import { useSelfProtocol } from "@/contexts/SelfProtocolContext";
import {
  formatTokenAmount,
  formatUSDValue,
  formatInterestRate,
  getHealthFactorStatus,
  getCreditScoreTier,
} from "@/lib/contracts/contractHelpers";

export function DashboardStats() {
  const { userStats, isLoading } = useLoanData();
  const { balance } = useWallet();
  const { isVerified } = useSelfProtocol();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="border-0 shadow-lg bg-card animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-20"></div>
                  <div className="h-8 bg-muted rounded w-24"></div>
                </div>
                <div className="w-12 h-12 bg-muted rounded-lg"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const creditScoreInfo = userStats
    ? getCreditScoreTier(userStats.creditScore)
    : {
        label: "N/A",
        color: "bg-gray-500/10 text-gray-400",
        tier: "unknown",
        description: "",
      };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Total Lent */}
      <Card className="border-0 shadow-lg bg-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total Lent
              </p>
              <p className="text-2xl font-bold text-card-foreground">
                {userStats ? formatUSDValue(userStats.totalLent) : "$0.00"}
              </p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
              <HandCoins className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total Borrowed */}
      <Card className="border-0 shadow-lg bg-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total Borrowed
              </p>
              <p className="text-2xl font-bold text-card-foreground">
                {userStats ? formatUSDValue(userStats.totalBorrowed) : "$0.00"}
              </p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-accent to-primary rounded-lg flex items-center justify-center">
              <ArrowDownRight className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Net APY */}
      <Card className="border-0 shadow-lg bg-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Net APY
              </p>
              <p className="text-2xl font-bold text-green-400">
                {userStats && userStats.totalLent > BigInt(0)
                  ? "+4.8%"
                  : "0.00%"}
              </p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Credit Score */}
      <Card className="border-0 shadow-lg bg-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Credit Score
              </p>
              <div className="flex items-center space-x-2">
                <p className="text-2xl font-bold text-primary">
                  {userStats ? userStats.creditScore : "N/A"}
                </p>
                <Badge
                  variant="secondary"
                  className={`text-xs ${creditScoreInfo.color}`}
                >
                  {creditScoreInfo.label}
                </Badge>
              </div>
              {userStats && (
                <div className="mt-2 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Loans: {userStats.completedLoans}</span>
                    <span>Defaults: {userStats.defaultedLoans}</span>
                  </div>
                </div>
              )}
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
