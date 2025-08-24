"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  Minus,
  Eye,
  Shield,
  Coins,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Clock,
  Wallet,
  Info,
} from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";
import { useContract } from "@/contexts/ContractContext";
import { useSupportedTokens } from "@/hooks/useSupportedTokens";
import { useMarketplaceData } from "@/hooks/useMarketplaceData";
import { useCollateralData } from "@/hooks/useCollateralData";
import { getContractAddress } from "@/lib/contracts/addresses";
import { ethers } from "ethers";
import { toast } from "react-toastify";

interface CollateralPosition {
  id: string;
  assetSymbol: string;
  depositedAmount: number;
  currentValue: number;
  utilizationRatio: number;
  healthFactor: number;
  loanAmount: number;
  liquidationPrice: number;
  status: "healthy" | "warning" | "danger";
  // Additional properties needed by the UI
  loanId: string;
  loanToken: string;
  collateralTokens: Array<{
    token: string;
    amount: number;
    symbol: string;
  }>;
  totalCollateralValue: number;
  canCancel: boolean;
  canAddCollateral: boolean;
  canWithdrawExcess: boolean;
}

export default function CollateralPage() {
  const { address, isConnected } = useWallet();
  const { celoLend, collateralVault, priceOracle } = useContract();
  const { tokens: supportedTokens } = useSupportedTokens();
  const { addCollateral, withdrawExcessCollateral, cancelLoanRequest } =
    useMarketplaceData();
  const { positions, loading, refresh } = useCollateralData();

  const [selectedAsset, setSelectedAsset] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [addingMap, setAddingMap] = useState<
    Record<string, { token: string; amount: string; loading: boolean }>
  >({});
  const [cancelling, setCancelling] = useState<Record<string, boolean>>({});

  // Calculate average health factor
  const averageHealthFactor =
    positions.length > 0
      ? positions.reduce(
          (sum: number, pos: CollateralPosition) => sum + pos.healthFactor,
          0
        ) / positions.length
      : 0;

  const getHealthFactorColor = (healthFactor: number) => {
    if (healthFactor >= 2.0) return "text-green-600";
    if (healthFactor >= 1.5) return "text-yellow-600";
    if (healthFactor >= 1.2) return "text-orange-600";
    return "text-red-600";
  };

  const getHealthFactorBadge = (healthFactor: number) => {
    if (healthFactor >= 2.0)
      return <Badge className="bg-green-100 text-green-800">Excellent</Badge>;
    if (healthFactor >= 1.5)
      return <Badge className="bg-yellow-100 text-yellow-800">Good</Badge>;
    if (healthFactor >= 1.2)
      return <Badge className="bg-orange-100 text-orange-800">Warning</Badge>;
    return <Badge className="bg-red-100 text-red-800">Danger</Badge>;
  };

  const getAssetIcon = (type: string) => {
    switch (type) {
      case "crypto":
        return <Coins className="w-4 h-4" />;
      case "stablecoin":
        return <DollarSign className="w-4 h-4" />;
      case "nft":
        return <Shield className="w-4 h-4" />;
      default:
        return <Coins className="w-4 h-4" />;
    }
  };

  const handleCancel = async (loanId: string) => {
    try {
      setCancelling((prev) => ({ ...prev, [loanId]: true }));
      await cancelLoanRequest(loanId);
      toast.success("Loan request cancelled successfully");
      await refresh();
    } catch (error: any) {
      toast.error(error?.message || "Failed to cancel loan request");
    } finally {
      setCancelling((prev) => ({ ...prev, [loanId]: false }));
    }
  };

  const handleAddCollateral = async (
    loanId: string,
    token: string,
    amount: string
  ) => {
    if (!token || !amount) {
      toast.error("Select token and enter amount");
      return;
    }

    try {
      setAddingMap((prev) => ({
        ...prev,
        [loanId]: { ...prev[loanId], loading: true },
      }));

      const tokenMeta = supportedTokens.find((t) => t.address === token);
      const decimals = tokenMeta?.decimals ?? 18;
      const amountBig = ethers.parseUnits(amount, decimals);

      // Check and approve token if needed
      if (token !== ethers.ZeroAddress) {
        const spender = getContractAddress("CeloLend");
        // Note: We'll need to implement checkTokenAllowance and approveToken in useMarketplaceData
        // For now, we'll assume approval is handled
      }

      await addCollateral(loanId, token, amountBig);
      toast.success("Collateral added successfully");

      // Reset form and refresh data
      setAddingMap((prev) => ({
        ...prev,
        [loanId]: { token: "", amount: "", loading: false },
      }));
      await refresh();
    } catch (error: any) {
      toast.error(error?.message || "Failed to add collateral");
      setAddingMap((prev) => ({
        ...prev,
        [loanId]: { ...prev[loanId], loading: false },
      }));
    }
  };

  const handleWithdrawExcess = async (
    loanId: string,
    token: string,
    amount: string
  ) => {
    if (!token || !amount) {
      toast.error("Select token and enter amount");
      return;
    }

    try {
      setAddingMap((prev) => ({
        ...prev,
        [`w_${loanId}`]: { ...prev[`w_${loanId}`], loading: true },
      }));

      const tokenMeta = supportedTokens.find((t) => t.address === token);
      const decimals = tokenMeta?.decimals ?? 18;
      const amountBig = ethers.parseUnits(amount, decimals);

      await withdrawExcessCollateral(loanId, token, amountBig);
      toast.success("Excess collateral withdrawn successfully");

      // Reset form and refresh data
      setAddingMap((prev) => ({
        ...prev,
        [`w_${loanId}`]: { token: "", amount: "", loading: false },
      }));
      await refresh();
    } catch (error: any) {
      toast.error(error?.message || "Failed to withdraw excess collateral");
      setAddingMap((prev) => ({
        ...prev,
        [`w_${loanId}`]: { ...prev[`w_${loanId}`], loading: false },
      }));
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Wallet className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Wallet Required</h2>
            <p className="text-muted-foreground">
              Connect your wallet to view your collateral positions
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Collateral Management</h1>
          <p className="text-muted-foreground">
            Manage your loan collateral and monitor your positions
          </p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Collateral Value
                  </p>
                  <p className="text-2xl font-bold">
                    $
                    {positions
                      .reduce(
                        (sum: number, pos: CollateralPosition) =>
                          sum + pos.currentValue,
                        0
                      )
                      .toLocaleString()}
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-[#B03060] to-[#C85062] rounded-lg flex items-center justify-center">
                  <Shield className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Active Loans
                  </p>
                  <p className="text-2xl font-bold">{positions.length}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-[#B03060] to-[#C85062] rounded-lg flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
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
            <TabsTrigger value="positions">Loan Positions</TabsTrigger>
            <TabsTrigger value="info">How It Works</TabsTrigger>
          </TabsList>

          <TabsContent value="positions" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Your Loan Positions</h2>
            </div>

            <div className="grid lg:grid-cols-1 gap-6">
              {loading && positions.length === 0 && (
                <div className="text-muted-foreground">
                  Loading positions...
                </div>
              )}

              {!loading && positions.length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Shield className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">
                      No Collateral Positions
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      You don't have any active loan positions with collateral
                      yet.
                    </p>
                    <Button asChild>
                      <a href="/marketplace">Create Loan Request</a>
                    </Button>
                  </CardContent>
                </Card>
              )}

              {positions.map((position: CollateralPosition) => (
                <Card key={position.loanId} className="border-0 shadow-lg">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#B03060] to-[#C85062] rounded-lg flex items-center justify-center">
                          <Coins className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">
                            Loan #{position.loanId}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {position.loanAmount} {position.loanToken}
                          </p>
                        </div>
                      </div>
                      {getHealthFactorBadge(position.healthFactor)}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Collateral Tokens */}
                    <div>
                      <h4 className="font-medium mb-2">Collateral Tokens</h4>
                      <div className="space-y-2">
                        {position.collateralTokens.map((collateral, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2 bg-muted rounded"
                          >
                            <div className="flex items-center space-x-2">
                              <Coins className="w-4 h-4 text-muted-foreground" />
                              <span className="font-medium">
                                {collateral.symbol}
                              </span>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">
                                {collateral.amount.toFixed(4)}{" "}
                                {collateral.symbol}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                ${collateral.amount.toLocaleString()}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    {/* Position Metrics */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">
                          Total Collateral Value
                        </p>
                        <p className="font-semibold">
                          ${position.totalCollateralValue.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Loan Amount</p>
                        <p className="font-semibold">
                          ${position.loanAmount.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Health Factor</p>
                        <p
                          className={`font-semibold ${getHealthFactorColor(
                            position.healthFactor
                          )}`}
                        >
                          {position.healthFactor.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Utilization</p>
                        <p className="font-semibold">
                          {position.utilizationRatio}%
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

                    {/* Actions */}
                    <div className="space-y-3">
                      {/* Cancel Request (for unfunded loans) */}
                      {position.canCancel && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCancel(position.loanId)}
                          disabled={cancelling[position.loanId]}
                          className="w-full border-[#B03060] text-[#B03060] hover:bg-[#B03060] hover:text-white bg-transparent"
                        >
                          {cancelling[position.loanId]
                            ? "Cancelling..."
                            : "Cancel Request"}
                        </Button>
                      )}

                      {/* Add Collateral */}
                      {position.canAddCollateral && (
                        <div className="grid grid-cols-3 gap-2">
                          <Select
                            value={addingMap[position.loanId]?.token || ""}
                            onValueChange={(val) =>
                              setAddingMap((prev) => ({
                                ...prev,
                                [position.loanId]: {
                                  token: val,
                                  amount: prev[position.loanId]?.amount || "",
                                  loading: false,
                                },
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Token" />
                            </SelectTrigger>
                            <SelectContent>
                              {supportedTokens.map((t) => (
                                <SelectItem key={t.address} value={t.address}>
                                  {t.symbol}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            placeholder="Amount"
                            value={addingMap[position.loanId]?.amount || ""}
                            onChange={(e) =>
                              setAddingMap((prev) => ({
                                ...prev,
                                [position.loanId]: {
                                  token: prev[position.loanId]?.token || "",
                                  amount: e.target.value,
                                  loading: false,
                                },
                              }))
                            }
                          />
                          <Button
                            size="sm"
                            onClick={() =>
                              handleAddCollateral(
                                position.loanId,
                                addingMap[position.loanId]?.token || "",
                                addingMap[position.loanId]?.amount || ""
                              )
                            }
                            disabled={addingMap[position.loanId]?.loading}
                            className="btn-primary text-white"
                          >
                            {addingMap[position.loanId]?.loading
                              ? "Adding..."
                              : "Add"}
                          </Button>
                        </div>
                      )}

                      {/* Withdraw Excess Collateral */}
                      {position.canWithdrawExcess && (
                        <div className="grid grid-cols-3 gap-2">
                          <Select
                            value={
                              addingMap[`w_${position.loanId}`]?.token || ""
                            }
                            onValueChange={(val) =>
                              setAddingMap((prev) => ({
                                ...prev,
                                [`w_${position.loanId}`]: {
                                  token: val,
                                  amount:
                                    prev[`w_${position.loanId}`]?.amount || "",
                                  loading: false,
                                },
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Token" />
                            </SelectTrigger>
                            <SelectContent>
                              {position.collateralTokens.map((collateral) => (
                                <SelectItem
                                  key={collateral.token}
                                  value={collateral.token}
                                >
                                  {collateral.symbol}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            placeholder="Amount"
                            value={
                              addingMap[`w_${position.loanId}`]?.amount || ""
                            }
                            onChange={(e) =>
                              setAddingMap((prev) => ({
                                ...prev,
                                [`w_${position.loanId}`]: {
                                  token:
                                    prev[`w_${position.loanId}`]?.token || "",
                                  amount: e.target.value,
                                  loading: false,
                                },
                              }))
                            }
                          />
                          <Button
                            size="sm"
                            onClick={() =>
                              handleWithdrawExcess(
                                position.loanId,
                                addingMap[`w_${position.loanId}`]?.token || "",
                                addingMap[`w_${position.loanId}`]?.amount || ""
                              )
                            }
                            disabled={
                              addingMap[`w_${position.loanId}`]?.loading
                            }
                            className="btn-primary text-white"
                          >
                            {addingMap[`w_${position.loanId}`]?.loading
                              ? "Withdrawing..."
                              : "Withdraw"}
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="info" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Info className="w-5 h-5" />
                  <span>How Multi-Collateral Works</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <h4 className="font-semibold">Creating a Loan</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>
                      • Choose the token you want to borrow (e.g., cUSD, CELO)
                    </li>
                    <li>
                      • Select ONE initial collateral token (e.g., CELO, cUSD)
                    </li>
                    <li>
                      • Set the collateral amount (minimum 150% of loan value)
                    </li>
                    <li>• Submit your loan request</li>
                  </ul>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="font-semibold">Adding More Collateral</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>
                      • After creating a loan, you can add different collateral
                      tokens
                    </li>
                    <li>• Each loan can have multiple collateral types</li>
                    <li>
                      • All collateral unlocks when the loan is fully repaid
                    </li>
                    <li>• Adding collateral improves your health factor</li>
                  </ul>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="font-semibold">Health Factor & Safety</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>
                      • Health Factor = Total Collateral Value ÷ Loan Amount
                    </li>
                    <li>• Keep it above 1.5 for safety</li>
                    <li>• Below 1.2 = risk of liquidation</li>
                    <li>
                      • You can withdraw excess collateral if health factor
                      allows
                    </li>
                  </ul>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="font-semibold">Important Notes</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Collateral is locked when you create the loan</li>
                    <li>
                      • You can't withdraw collateral until the loan is repaid
                    </li>
                    <li>• Adding more collateral can improve loan terms</li>
                    <li>• Monitor your health factor regularly</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
