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
      <Card className="bg-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-iphone text-foreground mb-2">
                Total Lent
              </p>
              <p className="text-2xl font-iphone-black text-foreground mb-1">
                {userStats ? formatUSDValue(userStats.totalLent) : "$0.00"}
              </p>
              {userStats && userStats.totalLent > BigInt(0) && (
                <p className="text-sm font-iphone text-foreground">
                  {(Number(userStats.totalLent) / 1e18).toFixed(2)} CELO
                </p>
              )}
            </div>
            <div className="w-14 h-14 bg-yellow-gradient rounded-2xl flex items-center justify-center">
              <HandCoins className="w-7 h-7 text-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total Borrowed */}
      <Card className="bg-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-iphone text-foreground mb-2">
                Total Borrowed
              </p>
              <p className="text-2xl font-iphone-black text-foreground mb-1">
                {userStats ? formatUSDValue(userStats.totalBorrowed) : "$0.00"}
              </p>
              {userStats && userStats.totalBorrowed > BigInt(0) && (
                <p className="text-sm font-iphone text-foreground">
                  {(Number(userStats.totalBorrowed) / 1e18).toFixed(2)} CELO
                </p>
              )}
            </div>
            <div className="w-14 h-14 bg-yellow-gradient-dark rounded-2xl flex items-center justify-center">
              <ArrowDownRight className="w-7 h-7 text-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Net APY */}
      <Card className="bg-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-iphone text-foreground mb-2">
                Net APY
              </p>
              <p className="text-2xl font-iphone-black text-foreground">
                {userStats && userStats.totalLent > BigInt(0)
                  ? "+4.8%"
                  : "0.00%"}
              </p>
            </div>
            <div className="w-14 h-14 bg-yellow-gradient rounded-2xl flex items-center justify-center">
              <TrendingUp className="w-7 h-7 text-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Credit Score */}
      <Card className="bg-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-iphone text-foreground mb-2">
                Credit Score
              </p>
              <div className="flex items-center space-x-2 mb-1">
                <p className="text-2xl font-iphone-black text-foreground">
                  {userStats ? userStats.creditScore : "N/A"}
                </p>
                <Badge
                  variant="secondary"
                  className={`text-xs font-iphone ${creditScoreInfo.color}`}
                >
                  {creditScoreInfo.label}
                </Badge>
              </div>
              {userStats && (
                <div className="mt-2 text-xs font-iphone text-foreground">
                  <div className="flex justify-between">
                    <span>Loans: {userStats.completedLoans}</span>
                    <span>Defaults: {userStats.defaultedLoans}</span>
                  </div>
                </div>
              )}
            </div>
            <div className="w-14 h-14 bg-yellow-gradient-dark rounded-2xl flex items-center justify-center">
              <Shield className="w-7 h-7 text-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
