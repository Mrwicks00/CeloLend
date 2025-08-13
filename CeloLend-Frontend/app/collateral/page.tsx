"use client"

import { useState } from "react"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Plus,
  Minus,
  TrendingUp,
  TrendingDown,
  Shield,
  AlertTriangle,
  RefreshCw,
  Eye,
  Building,
  Coins,
  Gem,
} from "lucide-react"

type CollateralAsset = {
  id: string
  symbol: string
  name: string
  type: "crypto" | "rwa" | "stablecoin"
  balance: number
  valueUSD: number
  priceUSD: number
  priceChange24h: number
  utilizationRatio: number
  maxLTV: number
  liquidationThreshold: number
  isActive: boolean
  lastUpdated: string
}

type CollateralPosition = {
  id: string
  assetSymbol: string
  depositedAmount: number
  currentValue: number
  utilizationRatio: number
  healthFactor: number
  loanAmount: number
  liquidationPrice: number
  status: "healthy" | "warning" | "danger"
}

export default function CollateralPage() {
  const [selectedAsset, setSelectedAsset] = useState("")
  const [depositAmount, setDepositAmount] = useState("")
  const [withdrawAmount, setWithdrawAmount] = useState("")
  const [refreshing, setRefreshing] = useState(false)

  // Mock data - in real app this would come from API/blockchain/oracles
  const collateralAssets: CollateralAsset[] = [
    {
      id: "1",
      symbol: "ETH",
      name: "Ethereum",
      type: "crypto",
      balance: 5.2,
      valueUSD: 18720,
      priceUSD: 3600,
      priceChange24h: 2.4,
      utilizationRatio: 65,
      maxLTV: 80,
      liquidationThreshold: 85,
      isActive: true,
      lastUpdated: "2025-01-12T10:30:00Z",
    },
    {
      id: "2",
      symbol: "BTC",
      name: "Bitcoin",
      type: "crypto",
      balance: 0.25,
      valueUSD: 26000,
      priceUSD: 104000,
      priceChange24h: -1.2,
      utilizationRatio: 45,
      maxLTV: 75,
      liquidationThreshold: 80,
      isActive: true,
      lastUpdated: "2025-01-12T10:30:00Z",
    },
    {
      id: "3",
      symbol: "USDC",
      name: "USD Coin",
      type: "stablecoin",
      balance: 12500,
      valueUSD: 12500,
      priceUSD: 1.0,
      priceChange24h: 0.01,
      utilizationRatio: 90,
      maxLTV: 95,
      liquidationThreshold: 98,
      isActive: true,
      lastUpdated: "2025-01-12T10:30:00Z",
    },
    {
      id: "4",
      symbol: "RWA-RE",
      name: "Real Estate Token",
      type: "rwa",
      balance: 100,
      valueUSD: 15000,
      priceUSD: 150,
      priceChange24h: 0.5,
      utilizationRatio: 30,
      maxLTV: 60,
      liquidationThreshold: 70,
      isActive: true,
      lastUpdated: "2025-01-12T09:00:00Z",
    },
    {
      id: "5",
      symbol: "RWA-GOLD",
      name: "Tokenized Gold",
      type: "rwa",
      balance: 5.5,
      valueUSD: 11550,
      priceUSD: 2100,
      priceChange24h: 1.8,
      utilizationRatio: 20,
      maxLTV: 70,
      liquidationThreshold: 75,
      isActive: true,
      lastUpdated: "2025-01-12T10:15:00Z",
    },
  ]

  const collateralPositions: CollateralPosition[] = [
    {
      id: "1",
      assetSymbol: "ETH",
      depositedAmount: 3.2,
      currentValue: 11520,
      utilizationRatio: 65,
      healthFactor: 1.8,
      loanAmount: 7500,
      liquidationPrice: 2800,
      status: "healthy",
    },
    {
      id: "2",
      assetSymbol: "BTC",
      depositedAmount: 0.15,
      currentValue: 15600,
      utilizationRatio: 45,
      healthFactor: 2.2,
      loanAmount: 7000,
      liquidationPrice: 85000,
      status: "healthy",
    },
    {
      id: "3",
      assetSymbol: "RWA-RE",
      depositedAmount: 50,
      currentValue: 7500,
      utilizationRatio: 30,
      healthFactor: 2.8,
      loanAmount: 2250,
      liquidationPrice: 120,
      status: "healthy",
    },
  ]

  const totalCollateralValue = collateralAssets.reduce((sum, asset) => sum + asset.valueUSD, 0)
  const totalUtilized = collateralPositions.reduce((sum, pos) => sum + pos.loanAmount, 0)
  const averageHealthFactor =
    collateralPositions.reduce((sum, pos) => sum + pos.healthFactor, 0) / collateralPositions.length

  const handleRefreshPrices = async () => {
    setRefreshing(true)
    // Simulate API call to refresh oracle prices
    setTimeout(() => setRefreshing(false), 2000)
  }

  const getAssetIcon = (type: string) => {
    switch (type) {
      case "crypto":
        return <Coins className="w-5 h-5" />
      case "rwa":
        return <Building className="w-5 h-5" />
      case "stablecoin":
        return <Shield className="w-5 h-5" />
      default:
        return <Gem className="w-5 h-5" />
    }
  }

  const getHealthFactorColor = (factor: number) => {
    if (factor >= 2) return "text-green-600"
    if (factor >= 1.5) return "text-yellow-600"
    return "text-red-600"
  }

  const getHealthFactorBadge = (factor: number) => {
    if (factor >= 2) return <Badge className="bg-green-100 text-green-800">Healthy</Badge>
    if (factor >= 1.5) return <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>
    return <Badge className="bg-red-100 text-red-800">At Risk</Badge>
  }

  const DepositDialog = () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="btn-primary text-white">
          <Plus className="w-4 h-4 mr-2" />
          Deposit Collateral
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Deposit Collateral</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Select Asset</Label>
            <Select value={selectedAsset} onValueChange={setSelectedAsset}>
              <SelectTrigger>
                <SelectValue placeholder="Choose asset to deposit" />
              </SelectTrigger>
              <SelectContent>
                {collateralAssets.map((asset) => (
                  <SelectItem key={asset.id} value={asset.symbol}>
                    <div className="flex items-center space-x-2">
                      {getAssetIcon(asset.type)}
                      <span>
                        {asset.symbol} - {asset.name}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deposit-amount">Amount</Label>
            <Input
              id="deposit-amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
            />
            {selectedAsset && (
              <p className="text-xs text-gray-600">
                Available: {collateralAssets.find((a) => a.symbol === selectedAsset)?.balance || 0} {selectedAsset}
              </p>
            )}
          </div>

          <div className="p-3 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-900 text-sm mb-1">Deposit Benefits</h4>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• Increase your borrowing capacity</li>
              <li>• Improve your health factor</li>
              <li>• Access better loan terms</li>
            </ul>
          </div>

          <Button className="btn-primary text-white w-full">Deposit {selectedAsset}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )

  const WithdrawDialog = () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="border-[#B03060] text-[#B03060] hover:bg-[#B03060] hover:text-white bg-transparent"
        >
          <Minus className="w-4 h-4 mr-2" />
          Withdraw
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Withdraw Collateral</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Select Asset</Label>
            <Select value={selectedAsset} onValueChange={setSelectedAsset}>
              <SelectTrigger>
                <SelectValue placeholder="Choose asset to withdraw" />
              </SelectTrigger>
              <SelectContent>
                {collateralPositions.map((pos) => (
                  <SelectItem key={pos.id} value={pos.assetSymbol}>
                    <div className="flex items-center space-x-2">
                      {getAssetIcon(collateralAssets.find((a) => a.symbol === pos.assetSymbol)?.type || "crypto")}
                      <span>{pos.assetSymbol}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="withdraw-amount">Amount</Label>
            <Input
              id="withdraw-amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
            />
            {selectedAsset && (
              <p className="text-xs text-gray-600">
                Deposited: {collateralPositions.find((p) => p.assetSymbol === selectedAsset)?.depositedAmount || 0}{" "}
                {selectedAsset}
              </p>
            )}
          </div>

          <div className="p-3 bg-yellow-50 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-yellow-900 text-sm mb-1">Withdrawal Warning</h4>
                <p className="text-xs text-yellow-800">
                  Withdrawing collateral may reduce your health factor and borrowing capacity.
                </p>
              </div>
            </div>
          </div>

          <Button className="btn-primary text-white w-full">Withdraw {selectedAsset}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )

  return (
    <div className="min-h-screen bg-[#F8F8F8]">
      <Navigation />

      <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Collateral Management</h1>
              <p className="text-gray-600">Manage your tokenized assets and collateral positions</p>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={handleRefreshPrices}
                disabled={refreshing}
                className="border-[#B03060] text-[#B03060] hover:bg-[#B03060] hover:text-white bg-transparent"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
                Refresh Prices
              </Button>
              <DepositDialog />
            </div>
          </div>

          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Collateral Value</p>
                    <p className="text-2xl font-bold text-gray-900">${totalCollateralValue.toLocaleString()}</p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-[#B03060] to-[#C85062] rounded-lg flex items-center justify-center">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Utilized</p>
                    <p className="text-2xl font-bold text-gray-900">${totalUtilized.toLocaleString()}</p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-[#C85062] to-[#FF6F61] rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Available to Borrow</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ${(totalCollateralValue * 0.75 - totalUtilized).toLocaleString()}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-[#FF6F61] to-[#E57373] rounded-lg flex items-center justify-center">
                    <Plus className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Avg Health Factor</p>
                    <p className={`text-2xl font-bold ${getHealthFactorColor(averageHealthFactor)}`}>
                      {averageHealthFactor.toFixed(2)}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-[#E57373] to-[#8B1E3F] rounded-lg flex items-center justify-center">
                    <Eye className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="positions" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="positions">Active Positions</TabsTrigger>
              <TabsTrigger value="assets">Available Assets</TabsTrigger>
            </TabsList>

            <TabsContent value="positions" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Active Collateral Positions</h2>
                <WithdrawDialog />
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                {collateralPositions.map((position) => {
                  const asset = collateralAssets.find((a) => a.symbol === position.assetSymbol)
                  return (
                    <Card key={position.id} className="border-0 shadow-lg">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-[#B03060] to-[#C85062] rounded-lg flex items-center justify-center">
                              {getAssetIcon(asset?.type || "crypto")}
                              <span className="text-white text-xs font-bold ml-1">{position.assetSymbol}</span>
                            </div>
                            <div>
                              <CardTitle className="text-lg">{asset?.name}</CardTitle>
                              <p className="text-sm text-gray-600">
                                {position.depositedAmount} {position.assetSymbol}
                              </p>
                            </div>
                          </div>
                          {getHealthFactorBadge(position.healthFactor)}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Current Value</p>
                            <p className="font-semibold">${position.currentValue.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Loan Amount</p>
                            <p className="font-semibold">${position.loanAmount.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Health Factor</p>
                            <p className={`font-semibold ${getHealthFactorColor(position.healthFactor)}`}>
                              {position.healthFactor.toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">Liquidation Price</p>
                            <p className="font-semibold">${position.liquidationPrice.toLocaleString()}</p>
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-gray-600">Utilization</span>
                            <span className="font-medium">{position.utilizationRatio}%</span>
                          </div>
                          <Progress value={position.utilizationRatio} className="h-2" />
                        </div>

                        <div className="flex space-x-2">
                          <Button size="sm" className="btn-primary text-white flex-1">
                            <Plus className="w-3 h-3 mr-1" />
                            Add More
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 border-[#B03060] text-[#B03060] hover:bg-[#B03060] hover:text-white bg-transparent"
                          >
                            <Minus className="w-3 h-3 mr-1" />
                            Withdraw
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </TabsContent>

            <TabsContent value="assets" className="space-y-6">
              <h2 className="text-xl font-semibold">Available Collateral Assets</h2>

              <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {collateralAssets.map((asset) => (
                  <Card key={asset.id} className="border-0 shadow-lg">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-[#B03060] to-[#C85062] rounded-lg flex items-center justify-center">
                            {getAssetIcon(asset.type)}
                          </div>
                          <div>
                            <CardTitle className="text-lg">{asset.symbol}</CardTitle>
                            <p className="text-sm text-gray-600">{asset.name}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {asset.type.toUpperCase()}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Balance</p>
                          <p className="font-semibold">
                            {asset.balance} {asset.symbol}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Value</p>
                          <p className="font-semibold">${asset.valueUSD.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Price</p>
                          <div className="flex items-center space-x-1">
                            <p className="font-semibold">${asset.priceUSD.toLocaleString()}</p>
                            <div
                              className={`flex items-center ${asset.priceChange24h >= 0 ? "text-green-600" : "text-red-600"}`}
                            >
                              {asset.priceChange24h >= 0 ? (
                                <TrendingUp className="w-3 h-3" />
                              ) : (
                                <TrendingDown className="w-3 h-3" />
                              )}
                              <span className="text-xs ml-1">{Math.abs(asset.priceChange24h)}%</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <p className="text-gray-600">Max LTV</p>
                          <p className="font-semibold">{asset.maxLTV}%</p>
                        </div>
                      </div>

                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                          <span>Utilization</span>
                          <span>{asset.utilizationRatio}%</span>
                        </div>
                        <Progress value={asset.utilizationRatio} className="h-1.5" />
                      </div>

                      <div className="text-xs text-gray-500">
                        Last updated: {new Date(asset.lastUpdated).toLocaleTimeString()}
                      </div>

                      <Button className="btn-primary text-white w-full">
                        <Plus className="w-4 h-4 mr-2" />
                        Deposit {asset.symbol}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
