import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  AlertCircle,
  Calculator,
  Info,
  Wallet,
  TrendingUp,
  Shield,
  Clock,
  DollarSign,
  Coins,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { useMarketplaceData } from "@/hooks/useMarketplaceData";
import { useWallet } from "@/contexts/WalletContext";
import { useSelfProtocol } from "@/contexts/SelfProtocolContext";
import { useSupportedTokens } from "@/hooks/useSupportedTokens";
import { useLoanLimits } from "@/hooks/useLoanLimits";
import { formatTokenAmount } from "@/lib/contracts/contractHelpers";
import { getTokenImage } from "@/lib/utils";
import Image from "next/image";
import { calculateInterestRate } from "@/lib/interestRateUtils";
import { ethers } from "ethers";

export function CreateLoanRequest() {
  const { createLoanRequest, rate, rateLoading } = useMarketplaceData();
  const { address, isConnected } = useWallet();
  const { isVerified, verificationStatus } = useSelfProtocol();
  const {
    tokens,
    loading: tokensLoading,
    error: tokensError,
  } = useSupportedTokens();
  const {
    minLoanAmountFormatted,
    maxLoanAmountFormatted,
    minCollateralRatioPercent,
    loading: limitsLoading,
    error: limitsError,
  } = useLoanLimits();

  const [formData, setFormData] = useState({
    amount: "",
    duration: "",
    collateralAmount: "",
    loanToken: ethers.ZeroAddress,
    collateralToken: ethers.ZeroAddress,
    purpose: "",
  });
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calculatedRate, setCalculatedRate] = useState<number | null>(null);

  // Get selected tokens info
  const selectedLoanToken = tokens.find(
    (t) => t.address === formData.loanToken
  );
  const selectedCollateralToken = tokens.find(
    (t) => t.address === formData.collateralToken
  );

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  // Calculate collateral ratio for visual indicator
  const currentCollateralRatio = (() => {
    if (
      !selectedLoanToken ||
      !selectedCollateralToken ||
      !formData.amount ||
      !formData.collateralAmount
    ) {
      return 0;
    }
    try {
      const loanValue =
        parseFloat(formData.amount) *
        parseFloat(selectedLoanToken.priceFormatted);
      const collateralValue =
        parseFloat(formData.collateralAmount) *
        parseFloat(selectedCollateralToken.priceFormatted);
      return loanValue > 0 ? (collateralValue / loanValue) * 100 : 0;
    } catch {
      return 0;
    }
  })();

  const getCollateralStatus = (ratio: number) => {
    if (ratio >= 200)
      return {
        status: "excellent",
        label: "Excellent",
        color: "text-black",
        bgColor: "bg-yellow-400",
        icon: CheckCircle,
      };
    if (ratio >= 150)
      return {
        status: "good",
        label: "Good",
        color: "text-yellow-600",
        bgColor: "bg-yellow-500",
        icon: CheckCircle,
      };
    return {
      status: "insufficient",
      label: "Insufficient",
      color: "text-black",
      bgColor: "bg-red-400",
      icon: AlertTriangle,
    };
  };

  const collateralStatus = getCollateralStatus(currentCollateralRatio);

  // Validation
  const validateLoanAmount = (amount: string): string | null => {
    if (!amount || parseFloat(amount) === 0) return null;
    const amountNum = parseFloat(amount);
    const minAmount = parseFloat(minLoanAmountFormatted);
    const maxAmount = parseFloat(maxLoanAmountFormatted);
    if (amountNum < minAmount) return `Min: ${minAmount} tokens`;
    if (amountNum > maxAmount) return `Max: ${maxAmount} tokens`;
    return null;
  };

  const loanAmountError = validateLoanAmount(formData.amount);

  const calculateRate = async () => {
    if (!formData.amount || !formData.duration || !formData.collateralAmount) {
      setError("Please fill in all required fields");
      return;
    }

    if (!selectedLoanToken || !selectedCollateralToken) {
      setError("Please select valid tokens");
      return;
    }

    try {
      const amount = ethers.parseUnits(
        formData.amount,
        selectedLoanToken.decimals
      );
      const duration = BigInt(parseInt(formData.duration) * 24 * 3600);
      const collateralAmount = ethers.parseUnits(
        formData.collateralAmount,
        selectedCollateralToken.decimals
      );

      const loanParams = {
        creditScore: 50,
        loanAmount: Number(
          ethers.formatUnits(amount, selectedLoanToken.decimals)
        ),
        loanTerm: Number(duration) / (24 * 3600),
        collateralRatio:
          Number(
            ethers.formatUnits(
              collateralAmount,
              selectedCollateralToken.decimals
            )
          ) / Number(ethers.formatUnits(amount, selectedLoanToken.decimals)),
        collateralType: selectedCollateralToken.symbol,
      };

      const rateResult = await calculateInterestRate(loanParams);
      setCalculatedRate(rateResult.interestRate);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to calculate rate"
      );
    }
  };

  const handleSubmit = async () => {
    if (!isConnected || !isVerified) return;
    if (
      !formData.amount ||
      !formData.duration ||
      !formData.collateralAmount ||
      !formData.purpose
    ) {
      setError("Please fill in all required fields");
      return;
    }
    if (!selectedLoanToken || !selectedCollateralToken) {
      setError("Please select valid tokens");
      return;
    }
    if (!calculatedRate) {
      setError("Please calculate the interest rate first");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const amount = ethers.parseUnits(
        formData.amount,
        selectedLoanToken.decimals
      );
      const duration = BigInt(parseInt(formData.duration) * 24 * 3600);
      const collateralAmount = ethers.parseUnits(
        formData.collateralAmount,
        selectedCollateralToken.decimals
      );

      await createLoanRequest(
        amount,
        formData.loanToken,
        duration,
        collateralAmount,
        formData.collateralToken,
        formData.purpose
      );

      setFormData({
        amount: "",
        duration: "",
        collateralAmount: "",
        loanToken: ethers.ZeroAddress,
        collateralToken: ethers.ZeroAddress,
        purpose: "",
      });
      setCalculatedRate(null);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to create loan request"
      );
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
      {/* Main Form Area */}
      <div className="lg:col-span-2 space-y-6">
        {/* Header */}
        <div className="text-center lg:text-left">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Create Loan Request
          </h1>
          <p className="text-muted-foreground mt-2">
            Configure your loan with automated interest rates and instant
            collateral calculation
          </p>
        </div>

        {/* Verification Status */}
        {!isConnected && (
          <Card className="border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-yellow-100 rounded-full">
                  <Wallet className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-yellow-800">
                    Wallet Required
                  </h3>
                  <p className="text-sm text-yellow-600">
                    Connect your wallet to start creating loan requests
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isConnected && !isVerified && (
          <Card className="border-red-200 bg-gradient-to-r from-red-50 to-pink-50">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-100 rounded-full">
                  <Shield className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-red-800">
                    Verification Required
                  </h3>
                  <p className="text-sm text-red-600">
                    Complete identity verification to access lending features
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Errors */}
        {(tokensError || limitsError) && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 text-red-700">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">Error</span>
              </div>
              <p className="text-sm text-red-600 mt-1">
                {tokensError || limitsError}
              </p>
            </CardContent>
          </Card>
        )}

        {/* 1. Loan Details Card */}
        <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-2 text-xl">
              <DollarSign className="w-6 h-6 text-blue-600" />
              <span>Loan Details</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Configure your loan parameters
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Loan Token */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Loan Token</Label>
                <Select
                  value={formData.loanToken}
                  onValueChange={(value) =>
                    handleInputChange("loanToken", value)
                  }
                  disabled={!isConnected || !isVerified || tokensLoading}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select token to borrow" />
                  </SelectTrigger>
                  <SelectContent>
                    {tokens.map((token) => (
                      <SelectItem key={token.address} value={token.address}>
                        <div className="flex items-center justify-between w-full pr-4">
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 rounded-full overflow-hidden">
                              <Image
                                src={getTokenImage(token.symbol)}
                                alt={token.symbol}
                                width={24}
                                height={24}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <span className="font-medium">{token.symbol}</span>
                            {token.isMentoStablecoin && (
                              <Badge variant="secondary" className="text-xs">
                                Stable
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            ${parseFloat(token.priceFormatted).toFixed(2)}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedLoanToken && (
                  <div className="flex items-center justify-between text-xs text-muted-foreground bg-white/50 p-2 rounded">
                    <span>
                      Balance:{" "}
                      {parseFloat(selectedLoanToken.balanceFormatted).toFixed(
                        4
                      )}{" "}
                      {selectedLoanToken.symbol}
                    </span>
                    <span>
                      $
                      {(
                        parseFloat(selectedLoanToken.balanceFormatted) *
                        parseFloat(selectedLoanToken.priceFormatted)
                      ).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              {/* Loan Amount */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Loan Amount</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => handleInputChange("amount", e.target.value)}
                  disabled={!isConnected || !isVerified}
                  className="h-12"
                />
                {loanAmountError && (
                  <div className="flex items-center space-x-2 text-xs text-red-600">
                    <AlertCircle className="w-3 h-3" />
                    <span>{loanAmountError}</span>
                  </div>
                )}
                {selectedLoanToken && formData.amount && (
                  <div className="text-xs text-muted-foreground bg-white/50 p-2 rounded">
                    ≈ $
                    {(
                      parseFloat(formData.amount) *
                      parseFloat(selectedLoanToken.priceFormatted)
                    ).toFixed(2)}{" "}
                    USD
                  </div>
                )}
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>Duration (Days)</span>
              </Label>
              <Input
                type="number"
                placeholder="30"
                value={formData.duration}
                onChange={(e) => handleInputChange("duration", e.target.value)}
                disabled={!isConnected || !isVerified}
                className="h-12"
              />
            </div>
          </CardContent>
        </Card>

        {/* 2. Collateral Card */}
        <Card className="shadow-lg border-0 bg-gradient-to-br from-green-50 to-emerald-50">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-2 text-xl">
              <Shield className="w-6 h-6 text-green-600" />
              <span>Collateral</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Secure your loan with collateral
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Collateral Token */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Collateral Token</Label>
                <Select
                  value={formData.collateralToken}
                  onValueChange={(value) =>
                    handleInputChange("collateralToken", value)
                  }
                  disabled={!isConnected || !isVerified || tokensLoading}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select collateral token" />
                  </SelectTrigger>
                  <SelectContent>
                    {tokens.map((token) => (
                      <SelectItem key={token.address} value={token.address}>
                        <div className="flex items-center justify-between w-full pr-4">
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 rounded-full overflow-hidden">
                              <Image
                                src={getTokenImage(token.symbol)}
                                alt={token.symbol}
                                width={24}
                                height={24}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <span className="font-medium">{token.symbol}</span>
                            <Badge variant="outline" className="text-xs">
                              Safe
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            ${parseFloat(token.priceFormatted).toFixed(2)}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedCollateralToken && (
                  <div className="flex items-center justify-between text-xs text-muted-foreground bg-white/50 p-2 rounded">
                    <span>
                      Balance:{" "}
                      {parseFloat(
                        selectedCollateralToken.balanceFormatted
                      ).toFixed(4)}{" "}
                      {selectedCollateralToken.symbol}
                    </span>
                    <span>
                      $
                      {(
                        parseFloat(selectedCollateralToken.balanceFormatted) *
                        parseFloat(selectedCollateralToken.priceFormatted)
                      ).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              {/* Collateral Amount */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Collateral Amount</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formData.collateralAmount}
                  onChange={(e) =>
                    handleInputChange("collateralAmount", e.target.value)
                  }
                  disabled={!isConnected || !isVerified}
                  className="h-12"
                />
                {selectedCollateralToken && formData.collateralAmount && (
                  <div className="text-xs text-muted-foreground bg-white/50 p-2 rounded">
                    ≈ $
                    {(
                      parseFloat(formData.collateralAmount) *
                      parseFloat(selectedCollateralToken.priceFormatted)
                    ).toFixed(2)}{" "}
                    USD
                  </div>
                )}
              </div>
            </div>

            {/* Collateral Ratio Visualization */}
            {currentCollateralRatio > 0 && (
              <div className="space-y-3 p-4 bg-white/50 rounded-lg border">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Collateral Ratio</span>
                  <div className="flex items-center space-x-2">
                    <collateralStatus.icon
                      className={`w-4 h-4 ${collateralStatus.color}`}
                    />
                    <span
                      className={`text-sm font-semibold ${collateralStatus.color}`}
                    >
                      {currentCollateralRatio.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <Progress
                  value={Math.min(currentCollateralRatio, 250)}
                  max={250}
                  className="h-3"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>150% Min</span>
                  <span>200% Safe</span>
                  <span>250%+</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 3. Additional Details Card */}
        <Card className="shadow-lg border-0">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-2 text-xl">
              <Info className="w-6 h-6 text-purple-600" />
              <span>Loan Purpose</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Describe what you'll use the loan for..."
              value={formData.purpose}
              onChange={(e) => handleInputChange("purpose", e.target.value)}
              disabled={!isConnected || !isVerified}
              rows={4}
              className="resize-none"
            />
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 text-red-700">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">{error}</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Summary Sidebar */}
      <div className="space-y-6">
        {/* Loan Summary */}
        <Card className="sticky top-6 shadow-xl border-0 bg-gradient-to-br from-purple-50 to-blue-50">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              <span>Loan Summary</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedLoanToken && formData.amount ? (
              <>
                <div className="flex justify-between items-center p-3 bg-white/60 rounded-lg">
                  <span className="text-sm text-muted-foreground">
                    Loan Amount
                  </span>
                  <div className="text-right">
                    <div className="font-semibold">
                      {formData.amount} {selectedLoanToken.symbol}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      $
                      {(
                        parseFloat(formData.amount) *
                        parseFloat(selectedLoanToken.priceFormatted)
                      ).toFixed(2)}
                    </div>
                  </div>
                </div>

                {formData.duration && (
                  <div className="flex justify-between items-center p-3 bg-white/60 rounded-lg">
                    <span className="text-sm text-muted-foreground">
                      Duration
                    </span>
                    <span className="font-semibold">
                      {formData.duration} days
                    </span>
                  </div>
                )}

                {selectedCollateralToken && formData.collateralAmount && (
                  <div className="flex justify-between items-center p-3 bg-white/60 rounded-lg">
                    <span className="text-sm text-muted-foreground">
                      Collateral
                    </span>
                    <div className="text-right">
                      <div className="font-semibold">
                        {formData.collateralAmount}{" "}
                        {selectedCollateralToken.symbol}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        $
                        {(
                          parseFloat(formData.collateralAmount) *
                          parseFloat(selectedCollateralToken.priceFormatted)
                        ).toFixed(2)}
                      </div>
                    </div>
                  </div>
                )}

                {currentCollateralRatio > 0 && (
                  <div className="flex justify-between items-center p-3 bg-white/60 rounded-lg">
                    <span className="text-sm text-muted-foreground">
                      Safety Level
                    </span>
                    <div className="flex items-center space-x-2">
                      <collateralStatus.icon
                        className={`w-4 h-4 ${collateralStatus.color}`}
                      />
                      <span
                        className={`font-semibold ${collateralStatus.color}`}
                      >
                        {collateralStatus.label}
                      </span>
                    </div>
                  </div>
                )}

                {calculatedRate && (
                  <div className="flex justify-between items-center p-3 bg-gradient-to-r from-green-100 to-blue-100 rounded-lg border">
                    <span className="text-sm text-muted-foreground">
                      Interest Rate
                    </span>
                    <span className="text-lg font-bold text-green-600">
                      {calculatedRate.toFixed(2)}%
                    </span>
                  </div>
                )}

                <Separator />

                <div className="space-y-3">
                  <Button
                    onClick={calculateRate}
                    disabled={
                      !isConnected || !isVerified || rateLoading || isCreating
                    }
                    variant="outline"
                    className="w-full"
                  >
                    <Calculator className="w-4 h-4 mr-2" />
                    {rateLoading ? "Calculating..." : "Calculate Rate"}
                  </Button>

                  <Button
                    onClick={handleSubmit}
                    disabled={
                      !isConnected ||
                      !isVerified ||
                      isCreating ||
                      !calculatedRate
                    }
                    className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    {isCreating ? "Creating Request..." : "Create Loan Request"}
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Coins className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">
                  Configure your loan details to see summary
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Platform Info */}
        <Card className="border-0 bg-gradient-to-br from-gray-50 to-slate-100">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <Info className="w-5 h-5 text-gray-600" />
              <span>Platform Info</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Min Loan:</span>
                <span className="font-medium">
                  {minLoanAmountFormatted} tokens
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Max Loan:</span>
                <span className="font-medium">
                  {maxLoanAmountFormatted} tokens
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Min Collateral:</span>
                <span className="font-medium">
                  {minCollateralRatioPercent}%
                </span>
              </div>
              <Separator className="my-2" />
              <div className="text-muted-foreground">
                <p>
                  <strong>Supported tokens:</strong> CELO, cUSD, cEUR, cREAL
                </p>
                <p>
                  <strong>Collateral:</strong> Any supported token
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
