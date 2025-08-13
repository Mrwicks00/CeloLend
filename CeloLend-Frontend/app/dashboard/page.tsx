"use client"

import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowDownRight, Plus, TrendingUp, Shield, Clock, HandCoins } from "lucide-react"

export default function DashboardPage() {
  const userStats = {
    totalLent: 18750, // Total lent to borrowers
    totalBorrowed: 12200, // Total borrowed from lenders
    totalCollateral: 25000,
    creditScore: 742,
    netAPY: 4.8, // Net APY across all positions
    healthFactor: 2.1, // Liquidation health factor
  }

  const lendingPositions = [
    {
      id: 1,
      borrower: "0x1234...5678",
      asset: "USDC",
      lentAmount: 8000,
      interestRate: 8.5,
      earned: 340,
      duration: 30,
      daysRemaining: 18,
      creditScore: 785,
      status: "active",
    },
    {
      id: 2,
      borrower: "0x9876...4321",
      asset: "ETH",
      lentAmount: 10750,
      interestRate: 6.2,
      earned: 225,
      duration: 60,
      daysRemaining: 45,
      creditScore: 720,
      status: "active",
    },
  ]

  const borrowingPositions = [
    {
      id: 1,
      lender: "0x5555...7777",
      asset: "USDC",
      borrowed: 5000,
      interestRate: 12.2,
      collateral: "ETH",
      collateralAmount: 3.2,
      healthFactor: 2.3,
      duration: 30,
      daysRemaining: 22,
    },
    {
      id: 2,
      lender: "0x8888...9999",
      asset: "DAI",
      borrowed: 7200,
      interestRate: 13.8,
      collateral: "WBTC",
      collateralAmount: 0.15,
      healthFactor: 1.9,
      duration: 45,
      daysRemaining: 30,
    },
  ]

  const recentActivity = [
    {
      id: 1,
      type: "lend",
      asset: "USDC",
      amount: 5000,
      counterparty: "0x1234...5678",
      date: "2025-01-10",
      status: "completed",
    },
    {
      id: 2,
      type: "borrow",
      asset: "DAI",
      amount: 3000,
      counterparty: "0x9876...4321",
      date: "2025-01-09",
      status: "completed",
    },
    {
      id: 3,
      type: "collateral_deposit",
      asset: "ETH",
      amount: 8000,
      counterparty: "0x5555...7777",
      date: "2025-01-08",
      status: "completed",
    },
  ]

  const getHealthFactorColor = (factor: number) => {
    if (factor >= 2.0) return "text-green-400"
    if (factor >= 1.5) return "text-yellow-400"
    return "text-red-400"
  }

  const getHealthFactorLabel = (factor: number) => {
    if (factor >= 2.0) return "Safe"
    if (factor >= 1.5) return "Moderate"
    return "At Risk"
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
            <p className="text-muted-foreground">Manage your P2P lending and borrowing positions</p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="border-0 shadow-lg bg-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Lent</p>
                    <p className="text-2xl font-bold text-card-foreground">${userStats.totalLent.toLocaleString()}</p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
                    <HandCoins className="w-6 h-6 text-primary-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Borrowed</p>
                    <p className="text-2xl font-bold text-card-foreground">
                      ${userStats.totalBorrowed.toLocaleString()}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-accent to-primary rounded-lg flex items-center justify-center">
                    <ArrowDownRight className="w-6 h-6 text-primary-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Net APY</p>
                    <p className="text-2xl font-bold text-green-400">+{userStats.netAPY}%</p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Credit Score</p>
                    <div className="flex items-center space-x-2">
                      <p className="text-2xl font-bold text-primary">{userStats.creditScore}</p>
                      <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-400">
                        Excellent
                      </Badge>
                    </div>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
                    <Shield className="w-6 h-6 text-primary-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card className="border-0 shadow-lg mb-8 bg-card">
            <CardHeader>
              <CardTitle className="text-xl text-card-foreground">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button className="btn-primary p-6 h-auto flex flex-col items-center space-y-2">
                  <HandCoins className="w-8 h-8" />
                  <span className="font-semibold">Fund Loans</span>
                  <span className="text-sm opacity-90">Lend to borrowers</span>
                </Button>

                <Button
                  variant="outline"
                  className="p-6 h-auto flex flex-col items-center space-y-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground bg-transparent"
                >
                  <ArrowDownRight className="w-8 h-8" />
                  <span className="font-semibold">Request Loan</span>
                  <span className="text-sm opacity-90">Borrow with collateral</span>
                </Button>

                <Button
                  variant="outline"
                  className="p-6 h-auto flex flex-col items-center space-y-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground bg-transparent"
                >
                  <Plus className="w-8 h-8" />
                  <span className="font-semibold">Add Collateral</span>
                  <span className="text-sm opacity-90">Improve loan terms</span>
                </Button>
              </div>
            </CardContent>
          </Card>

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
                            ${position.lentAmount.toLocaleString()}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {position.asset} to {position.borrower}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary" className="bg-green-500/10 text-green-400 mb-1">
                            {position.interestRate}% APY
                          </Badge>
                          <p className="text-xs text-muted-foreground">{position.daysRemaining} days left</p>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Earned: ${position.earned}</span>
                        <div className="flex items-center space-x-1">
                          <Shield className="w-3 h-3 text-primary" />
                          <span className="text-muted-foreground">Score: {position.creditScore}</span>
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
                  {borrowingPositions.map((position) => (
                    <div key={position.id} className="p-4 bg-muted rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold text-lg text-card-foreground">
                            ${position.borrowed.toLocaleString()}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {position.asset} from {position.lender}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary" className="bg-red-500/10 text-red-400 mb-1">
                            {position.interestRate}% APY
                          </Badge>
                          <p className={`text-xs ${getHealthFactorColor(position.healthFactor)}`}>
                            Health: {position.healthFactor}
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">
                          Collateral: {position.collateralAmount} {position.collateral}
                        </span>
                        <span className="text-sm text-muted-foreground">{position.daysRemaining} days left</span>
                      </div>
                    </div>
                  ))}
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

          {/* Recent Activity */}
          <Card className="border-0 shadow-lg bg-card">
            <CardHeader>
              <CardTitle className="text-xl text-card-foreground">Recent P2P Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                    <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center">
                      {activity.type === "lend" && <HandCoins className="w-4 h-4 text-primary-foreground" />}
                      {activity.type === "borrow" && <ArrowDownRight className="w-4 h-4 text-primary-foreground" />}
                      {activity.type === "collateral_deposit" && <Shield className="w-4 h-4 text-primary-foreground" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-card-foreground">
                        {activity.type === "lend" && `Funded loan for ${activity.counterparty}`}
                        {activity.type === "borrow" && `Borrowed from ${activity.counterparty}`}
                        {activity.type === "collateral_deposit" && `Deposited collateral to ${activity.counterparty}`}
                      </p>
                      <p className="text-xs text-muted-foreground">{activity.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-card-foreground">
                        ${activity.amount.toLocaleString()} {activity.asset}
                      </p>
                      <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-400">
                        {activity.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>

              <Button variant="ghost" className="w-full mt-4 text-primary">
                <Clock className="w-4 h-4 mr-2" />
                View All Activity
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
