"use client"

import { useState } from "react"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Search, User, Clock, Star } from "lucide-react"

type LoanRequest = {
  id: string
  borrower: {
    address: string
    creditScore: number
    completedLoans: number
    rating: number
  }
  amount: number
  asset: string
  interestRate: number
  duration: number // in days
  collateral: {
    asset: string
    amount: number
    value: number
  }
  purpose: string
  status: "open" | "funding" | "funded" | "repaid"
  fundedAmount: number
  timeRemaining: number // hours
  riskLevel: "low" | "medium" | "high"
}

export default function MarketplacePage() {
  const [activeTab, setActiveTab] = useState("borrow-requests")
  const [searchTerm, setSearchTerm] = useState("")
  const [filterAsset, setFilterAsset] = useState("all")
  const [sortBy, setSortBy] = useState("interest-high")

  const loanRequests: LoanRequest[] = [
    {
      id: "loan-001",
      borrower: {
        address: "0x1234...5678",
        creditScore: 785,
        completedLoans: 12,
        rating: 4.8,
      },
      amount: 5000,
      asset: "USDC",
      interestRate: 8.5,
      duration: 30,
      collateral: {
        asset: "ETH",
        amount: 2.1,
        value: 7500,
      },
      purpose: "DeFi yield farming",
      status: "open",
      fundedAmount: 0,
      timeRemaining: 72,
      riskLevel: "low",
    },
    {
      id: "loan-002",
      borrower: {
        address: "0x9876...4321",
        creditScore: 720,
        completedLoans: 8,
        rating: 4.5,
      },
      amount: 12000,
      asset: "USDC",
      interestRate: 12.2,
      duration: 60,
      collateral: {
        asset: "WBTC",
        amount: 0.25,
        value: 18000,
      },
      purpose: "Business expansion",
      status: "funding",
      fundedAmount: 8500,
      timeRemaining: 24,
      riskLevel: "medium",
    },
    {
      id: "loan-003",
      borrower: {
        address: "0x5555...7777",
        creditScore: 650,
        completedLoans: 3,
        rating: 4.2,
      },
      amount: 3000,
      asset: "DAI",
      interestRate: 15.8,
      duration: 14,
      collateral: {
        asset: "ETH",
        amount: 1.5,
        value: 5400,
      },
      purpose: "Short-term liquidity",
      status: "open",
      fundedAmount: 0,
      timeRemaining: 48,
      riskLevel: "high",
    },
  ]

  const filteredRequests = loanRequests
    .filter((request) => {
      if (searchTerm && !request.asset.toLowerCase().includes(searchTerm.toLowerCase())) return false
      if (filterAsset !== "all" && request.asset !== filterAsset) return false
      return true
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "interest-high":
          return b.interestRate - a.interestRate
        case "interest-low":
          return a.interestRate - b.interestRate
        case "amount-high":
          return b.amount - a.amount
        case "credit-high":
          return b.borrower.creditScore - a.borrower.creditScore
        default:
          return 0
      }
    })

  const FundLoanDialog = ({ request }: { request: LoanRequest }) => {
    const [fundAmount, setFundAmount] = useState("")

    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button className="btn-primary">Fund Loan</Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Fund Loan Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-card rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Interest Rate</span>
                <span className="font-semibold text-primary">{request.interestRate}%</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Duration</span>
                <span className="font-semibold">{request.duration} days</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Collateral</span>
                <span className="font-semibold">
                  {request.collateral.amount} {request.collateral.asset}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Fund Amount</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={fundAmount}
                onChange={(e) => setFundAmount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Remaining: ${(request.amount - request.fundedAmount).toLocaleString()}
              </p>
            </div>

            <Button className="btn-primary w-full">
              Fund ${fundAmount || "0"} {request.asset}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "low":
        return "bg-green-500/10 text-green-400"
      case "medium":
        return "bg-yellow-500/10 text-yellow-400"
      case "high":
        return "bg-red-500/10 text-red-400"
      default:
        return "bg-gray-500/10 text-gray-400"
    }
  }

  const LoanRequestCard = ({ request }: { request: LoanRequest }) => (
    <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-card">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-card-foreground">
                ${request.amount.toLocaleString()} {request.asset}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{request.borrower.address}</p>
            </div>
          </div>
          <div className="flex flex-col items-end space-y-1">
            <Badge className={getRiskColor(request.riskLevel)}>{request.riskLevel.toUpperCase()} RISK</Badge>
            <div className="flex items-center space-x-1">
              <Star className="w-3 h-3 text-yellow-400 fill-current" />
              <span className="text-xs text-muted-foreground">{request.borrower.rating}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Interest Rate</span>
              <span className="font-semibold text-primary">{request.interestRate}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Duration</span>
              <span className="font-semibold text-card-foreground">{request.duration} days</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Credit Score</span>
              <span className="font-semibold text-card-foreground">{request.borrower.creditScore}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Completed</span>
              <span className="font-semibold text-card-foreground">{request.borrower.completedLoans}</span>
            </div>
          </div>
        </div>

        <div className="p-3 bg-muted rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Collateral</span>
            <span className="text-sm font-semibold text-card-foreground">
              {request.collateral.amount} {request.collateral.asset}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Value</span>
            <span className="text-sm font-semibold text-green-400">${request.collateral.value.toLocaleString()}</span>
          </div>
        </div>

        {request.status === "funding" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Funding Progress</span>
              <span className="font-semibold text-card-foreground">
                ${request.fundedAmount.toLocaleString()} / ${request.amount.toLocaleString()}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${(request.fundedAmount / request.amount) * 100}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-1 text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>{request.timeRemaining}h remaining</span>
          </div>
          <span className="text-muted-foreground">Purpose: {request.purpose}</span>
        </div>

        <div className="flex space-x-2 pt-2">
          <FundLoanDialog request={request} />
          <Button variant="outline" className="border-primary text-primary bg-transparent">
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Loan Marketplace</h1>
            <p className="text-muted-foreground">Fund individual borrowers or request loans with collateral</p>
          </div>

          {/* Filters */}
          <Card className="border-0 shadow-lg mb-8 bg-card">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="search">Search Assets</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="USDC, ETH, DAI..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-background"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Asset Type</Label>
                  <Select value={filterAsset} onValueChange={setFilterAsset}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="All Assets" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Assets</SelectItem>
                      <SelectItem value="USDC">USDC</SelectItem>
                      <SelectItem value="ETH">ETH</SelectItem>
                      <SelectItem value="DAI">DAI</SelectItem>
                      <SelectItem value="WBTC">WBTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Sort By</Label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="interest-high">Interest: High to Low</SelectItem>
                      <SelectItem value="interest-low">Interest: Low to High</SelectItem>
                      <SelectItem value="amount-high">Amount: High to Low</SelectItem>
                      <SelectItem value="credit-high">Credit Score: High to Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>View</Label>
                  <div className="flex space-x-2">
                    <Button
                      variant={activeTab === "borrow-requests" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setActiveTab("borrow-requests")}
                      className="flex-1"
                    >
                      Loan Requests
                    </Button>
                    <Button
                      variant={activeTab === "create-request" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setActiveTab("create-request")}
                      className="flex-1"
                    >
                      Create Request
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Loan Requests Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {filteredRequests.map((request) => (
              <LoanRequestCard key={request.id} request={request} />
            ))}
          </div>

          {/* Market Stats */}
          <Card className="border-0 shadow-lg bg-card">
            <CardHeader>
              <CardTitle className="text-xl text-card-foreground">Market Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">$2.4M</p>
                  <p className="text-sm text-muted-foreground">Active Loan Requests</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">$1.8M</p>
                  <p className="text-sm text-muted-foreground">Funded This Month</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">9.2%</p>
                  <p className="text-sm text-muted-foreground">Avg Interest Rate</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">98.5%</p>
                  <p className="text-sm text-muted-foreground">Repayment Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
