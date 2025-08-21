"use client";

import { useState } from "react";
import { useCollateralData } from "@/hooks/useCollateralData";
import { useMarketplaceData } from "@/hooks/useMarketplaceData";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "react-toastify";
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
} from "lucide-react";

type CollateralAsset = ReturnType<typeof useCollateralData>["assets"][number];
type CollateralPosition = ReturnType<
  typeof useCollateralData
>["positions"][number];

export default function CollateralPage() {
  const [selectedAsset, setSelectedAsset] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState<Record<string, boolean>>({});
  const {
    assets: collateralAssets,
    positions: collateralPositions,
    loading,
    error,
    refresh,
  } = useCollateralData();
  const { cancelLoanRequest } = useMarketplaceData();

  // Live data replaces mock arrays (assets and positions come from useCollateralData)

  const totalCollateralValue = collateralAssets.reduce(
    (sum, asset) => sum + asset.valueUSD,
    0
  );
  const totalUtilized = collateralPositions.reduce(
    (sum, pos) => sum + pos.loanAmount,
    0
  );
  const averageHealthFactor =
    collateralPositions.reduce((sum, pos) => sum + pos.healthFactor, 0) /
    collateralPositions.length;

  const handleRefreshPrices = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleCancel = async (loanId: string) => {
    if (cancelling[loanId]) return;
    setCancelling((prev) => ({ ...prev, [loanId]: true }));
    toast.info("Cancelling request...", { autoClose: 2000 });
    try {
      await cancelLoanRequest(loanId);
      toast.success("Loan request cancelled", { autoClose: 4000 });
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast.error(`Cancellation failed: ${msg}`, { autoClose: 6000 });
    } finally {
      setCancelling((prev) => {
        const next = { ...prev };
        delete next[loanId];
        return next;
      });
    }
  };

  const getAssetIcon = (type: string) => {
    switch (type) {
      case "crypto":
        return <Coins className="w-5 h-5" />;
      case "rwa":
        return <Building className="w-5 h-5" />;
      case "stablecoin":
        return <Shield className="w-5 h-5" />;
      default:
        return <Gem className="w-5 h-5" />;
    }
  };

  const getHealthFactorColor = (factor: number) => {
    if (factor >= 2) return "text-green-600";
    if (factor >= 1.5) return "text-yellow-600";
    return "text-red-600";
  };

  const getHealthFactorBadge = (factor: number) => {
    if (factor >= 2)
      return <Badge className="bg-green-100 text-green-800">Healthy</Badge>;
    if (factor >= 1.5)
      return <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>;
    return <Badge className="bg-red-100 text-red-800">At Risk</Badge>;
  };

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
              <p className="text-xs text-muted-foreground">
                Available:{" "}
                {collateralAssets.find((a) => a.symbol === selectedAsset)
                  ?.balance || 0}{" "}
                {selectedAsset}
              </p>
            )}
          </div>

          <div className="p-3 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-900 text-sm mb-1">
              Deposit Benefits
            </h4>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• Increase your borrowing capacity</li>
              <li>• Improve your health factor</li>
              <li>• Access better loan terms</li>
            </ul>
          </div>

          <Button className="btn-primary text-white w-full">
            Deposit {selectedAsset}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

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
                      {getAssetIcon(
                        collateralAssets.find(
                          (a) => a.symbol === pos.assetSymbol
                        )?.type || "crypto"
                      )}
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
              <p className="text-xs text-muted-foreground">
                Deposited:{" "}
                {collateralPositions.find(
                  (p) => p.assetSymbol === selectedAsset
                )?.depositedAmount || 0}{" "}
                {selectedAsset}
              </p>
            )}
          </div>

          <div className="p-3 bg-yellow-50 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-yellow-900 text-sm mb-1">
                  Withdrawal Warning
                </h4>
                <p className="text-xs text-yellow-800">
                  Withdrawing collateral may reduce your health factor and
                  borrowing capacity.
                </p>
              </div>
            </div>
          </div>

          <Button className="btn-primary text-white w-full">
            Withdraw {selectedAsset}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Collateral Management
              </h1>
              <p className="text-muted-foreground">
                Manage your tokenized assets and collateral positions
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={handleRefreshPrices}
                disabled={refreshing}
                className="border-[#B03060] text-[#B03060] hover:bg-[#B03060] hover:text-white bg-transparent"
                title="Refresh on-chain collateral and loan data"
              >
                <RefreshCw
                  className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh Prices
              </Button>
              {/* Deposit not supported in MVP */}
            </div>
          </div>

          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {error && (
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6 text-red-600">{error}</CardContent>
              </Card>
            )}
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Total Collateral Value
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                      ${totalCollateralValue.toLocaleString()}
                    </p>
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
                    <p className="text-sm font-medium text-muted-foreground">
                      Total Utilized
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                      ${totalUtilized.toLocaleString()}
                    </p>
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
                    <p className="text-sm font-medium text-muted-foreground">
                      Available to Borrow
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                      $
                      {(
                        totalCollateralValue * 0.75 -
                        totalUtilized
                      ).toLocaleString()}
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
                    <p className="text-sm font-medium text-muted-foreground">
                      Avg Health Factor
                    </p>
                    <p
                      className={`text-2xl font-bold ${getHealthFactorColor(
                        averageHealthFactor
                      )}`}
                    >
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
                <h2 className="text-xl font-semibold">
                  Active Collateral Positions
                </h2>
                {/* No per-loan withdraw here; cancel available on unfunded requests */}
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                {loading && collateralPositions.length === 0 && (
                  <div className="text-muted-foreground">
                    Loading positions...
                  </div>
                )}
                {collateralPositions.map((position) => {
                  const asset = collateralAssets.find(
                    (a) => a.symbol === position.assetSymbol
                  );
                  return (
                    <Card key={position.id} className="border-0 shadow-lg">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-[#B03060] to-[#C85062] rounded-lg flex items-center justify-center">
                              {getAssetIcon(asset?.type || "crypto")}
                              <span className="text-white text-xs font-bold ml-1">
                                {position.assetSymbol}
                              </span>
                            </div>
                            <div>
                              <CardTitle className="text-lg">
                                {asset?.name}
                              </CardTitle>
                              <p className="text-sm text-muted-foreground">
                                {position.depositedAmount}{" "}
                                {position.assetSymbol}
                              </p>
                            </div>
                          </div>
                          {getHealthFactorBadge(position.healthFactor)}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">
                              Current Value
                            </p>
                            <p className="font-semibold">
                              ${position.currentValue.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Loan Amount</p>
                            <p className="font-semibold">
                              ${position.loanAmount.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">
                              Health Factor
                            </p>
                            <p
                              className={`font-semibold ${getHealthFactorColor(
                                position.healthFactor
                              )}`}
                              title={`Collateral ratio: ${
                                // @ts-ignore optional debug field
                                position._details?.collateralRatioPct ?? "-"
                              }% | Liquidation threshold: ${
                                // @ts-ignore optional debug field
                                position._details?.liquidationThresholdPct ??
                                "-"
                              }%`}
                            >
                              {position.healthFactor.toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">
                              Liquidation Price
                            </p>
                            <p className="font-semibold">
                              ${position.liquidationPrice.toLocaleString()}
                            </p>
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-muted-foreground">
                              Utilization
                            </span>
                            <span className="font-medium">
                              {position.utilizationRatio}%
                            </span>
                          </div>
                          <Progress
                            value={position.utilizationRatio}
                            className="h-2"
                          />
                        </div>

                        {/* Actions: show Cancel for unfunded active requests */}
                        {(position as any)._flags?.canCancel === true && (
                          <div className="flex">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCancel(position.id)}
                              disabled={Boolean(cancelling[position.id])}
                              className="w-full border-[#B03060] text-[#B03060] hover:bg-[#B03060] hover:text-white bg-transparent"
                            >
                              {cancelling[position.id]
                                ? "Cancelling..."
                                : "Cancel Request"}
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="assets" className="space-y-6">
              <h2 className="text-xl font-semibold">
                Available Collateral Assets
              </h2>

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
                            <CardTitle className="text-lg">
                              {asset.symbol}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                              {asset.name}
                            </p>
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
                          <p className="text-muted-foreground">Balance</p>
                          <p className="font-semibold">
                            {asset.balance} {asset.symbol}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Value</p>
                          <p className="font-semibold">
                            ${asset.valueUSD.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Price</p>
                          <div className="flex items-center space-x-1">
                            <p className="font-semibold">
                              ${asset.priceUSD.toLocaleString()}
                            </p>
                            <div
                              className={`flex items-center ${
                                asset.priceChange24h >= 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {asset.priceChange24h >= 0 ? (
                                <TrendingUp className="w-3 h-3" />
                              ) : (
                                <TrendingDown className="w-3 h-3" />
                              )}
                              <span className="text-xs ml-1">
                                {Math.abs(asset.priceChange24h)}%
                              </span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Max LTV</p>
                          <p className="font-semibold">{asset.maxLTV}%</p>
                        </div>
                      </div>

                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>Utilization</span>
                          <span>{asset.utilizationRatio}%</span>
                        </div>
                        <Progress
                          value={asset.utilizationRatio}
                          className="h-1.5"
                        />
                      </div>

                      <div className="text-xs text-gray-500">
                        Last updated:{" "}
                        {new Date(asset.lastUpdated).toLocaleTimeString()}
                      </div>

                      {/* Deposit action removed (not supported) */}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
