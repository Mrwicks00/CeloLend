"use client";

import { Navigation } from "@/components/navigation";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { PortfolioSummary } from "@/components/dashboard/PortfolioSummary";
import { LoanPositions } from "@/components/dashboard/LoanPositions";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { RepaymentSection } from "@/components/dashboard/RepaymentSection";
import { TokenBalanceGrid } from "@/components/ui/token-balance-card";
import { useWallet } from "@/contexts/WalletContext";
import { useSelfProtocol } from "@/contexts/SelfProtocolContext";

export default function DashboardPage() {
  const { isAuthenticated, address } = useWallet();
  const { isVerified } = useSelfProtocol();

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Dashboard
            </h1>
            <p className="text-muted-foreground">
              Manage your P2P lending and borrowing positions
            </p>
          </div>

          {/* Quick Stats */}
          <DashboardStats />

          {/* Portfolio Summary */}
          {isAuthenticated && isVerified && <PortfolioSummary />}

          {/* Token Balances */}
          {isAuthenticated && isVerified && (
            <div className="mb-8">
              <TokenBalanceGrid />
            </div>
          )}

          {/* Quick Actions */}
          <QuickActions />

          {/* Loan Positions */}
          <LoanPositions />

          {/* Loan Repayments */}
          {isAuthenticated && isVerified && (
            <div className="mb-8">
              <RepaymentSection />
            </div>
          )}

          {/* Recent Activity */}
          <RecentActivity />
        </div>
      </div>
    </div>
  );
}
