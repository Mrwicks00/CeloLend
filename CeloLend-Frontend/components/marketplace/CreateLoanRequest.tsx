import { useState, useEffect, useCallback } from "react";
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
import { calculateInterestRate, type RateResponse } from "@/lib/interestRateUtils";
import { getContractAddress } from "@/lib/contracts/addresses";
import { ethers } from "ethers";
import { toast } from "react-toastify";

export function CreateLoanRequest() {
  const {
    createLoanRequest,
    checkTokenAllowance,
    approveToken,
    rate,
    rateLoading,
  } = useMarketplaceData();
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
  const [rateBreakdown, setRateBreakdown] = useState<RateResponse["breakdown"] | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<{
    needsApproval: boolean;
    isApproving: boolean;
    approved: boolean;
  }>({ needsApproval: false, isApproving: false, approved: false });

  // Get selected tokens info
  const selectedLoanToken = tokens.find(
    (t) => t.address === formData.loanToken
  );
  const selectedCollateralToken = tokens.find(
    (t) => t.address === formData.collateralToken
  );

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => {
      const newData = { ...prev, [field]: value };

      // Auto-fill collateral at 150% when loan amount changes
      if (
        field === "amount" &&
        value &&
        selectedLoanToken &&
        selectedCollateralToken
      ) {
        const loanAmount = parseFloat(value);
        const loanPrice = parseFloat(selectedLoanToken.priceFormatted);
        const collateralPrice = parseFloat(
          selectedCollateralToken.priceFormatted
        );

        if (loanAmount > 0 && loanPrice > 0 && collateralPrice > 0) {
          // Calculate 150% collateral requirement
          const loanValueUSD = loanAmount * loanPrice;
          const requiredCollateralValueUSD = loanValueUSD * 1.5; // 150%
          const requiredCollateralAmount =
            requiredCollateralValueUSD / collateralPrice;

          newData.collateralAmount = requiredCollateralAmount.toFixed(6);
        }
      }

      // Auto-fill collateral when collateral token changes and loan amount exists
      if (field === "collateralToken" && formData.amount && selectedLoanToken) {
        const newCollateralToken = tokens.find((t) => t.address === value);
        if (newCollateralToken) {
          const loanAmount = parseFloat(formData.amount);
          const loanPrice = parseFloat(selectedLoanToken.priceFormatted);
          const collateralPrice = parseFloat(newCollateralToken.priceFormatted);

          if (loanAmount > 0 && loanPrice > 0 && collateralPrice > 0) {
            // Calculate 150% collateral requirement
            const loanValueUSD = loanAmount * loanPrice;
            const requiredCollateralValueUSD = loanValueUSD * 1.5; // 150%
            const requiredCollateralAmount =
              requiredCollateralValueUSD / collateralPrice;

            newData.collateralAmount = requiredCollateralAmount.toFixed(6);
          }
        }
      }

      return newData;
    });
    setError(null);
    setCalculatedRate(null);
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
        color: "text-green-600",
        bgColor: "bg-green-500",
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
      color: "text-red-600",
      bgColor: "bg-red-500",
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
      setRateBreakdown(rateResult.breakdown);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to calculate rate"
      );
    }
  };

  // Check if approval is needed for collateral token
  const checkApprovalNeeded = useCallback(async () => {
    if (
      !selectedCollateralToken ||
      !formData.collateralAmount ||
      !isConnected
    ) {
      return;
    }

    // Skip for native token
    if (formData.collateralToken === ethers.ZeroAddress) {
      setApprovalStatus({
        needsApproval: false,
        isApproving: false,
        approved: true,
      });
      return;
    }

    try {
      const collateralAmount = ethers.parseUnits(
        formData.collateralAmount,
        selectedCollateralToken.decimals
      );

      // Check if approval is needed (this will return current status)
      const result = await checkTokenAllowance(
        formData.collateralToken,
        collateralAmount,
        getContractAddress("CeloLend") // CeloLend contract address
      );

      setApprovalStatus({
        needsApproval: !result.approved,
        isApproving: false,
        approved: result.approved,
      });
    } catch (error) {
      console.error("Error checking approval:", error);
    }
  }, [
    selectedCollateralToken,
    formData.collateralAmount,
    formData.collateralToken,
    isConnected,
    checkTokenAllowance,
  ]);

  // Check approval when collateral token or amount changes
  useEffect(() => {
    if (formData.collateralToken && formData.collateralAmount) {
      checkApprovalNeeded();
    }
  }, [
    formData.collateralToken,
    formData.collateralAmount,
    checkApprovalNeeded,
  ]);

  const handleApprove = async () => {
    if (!selectedCollateralToken || !formData.collateralAmount) return;

    setApprovalStatus((prev) => ({ ...prev, isApproving: true }));
    setError(null);

    try {
      toast.info(`Approving ${selectedCollateralToken.symbol}...`, {
        autoClose: 2000,
      });

      await approveToken(
        formData.collateralToken,
        getContractAddress("CeloLend")
      );

      setApprovalStatus({
        needsApproval: false,
        isApproving: false,
        approved: true,
      });

      toast.success(
        `${selectedCollateralToken.symbol} approved successfully!`,
        {
          autoClose: 4000,
        }
      );
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Failed to approve token";
      setError(errorMsg);
      setApprovalStatus((prev) => ({ ...prev, isApproving: false }));
      toast.error(`Approval failed: ${errorMsg}`, {
        autoClose: 7000,
      });
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
      toast.info("Creating loan request...", { autoClose: 2000 });

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

      toast.success(
        `Loan request created successfully! ${formData.amount} ${selectedLoanToken.symbol} requested.`,
        { autoClose: 7000 }
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
      setApprovalStatus({
        needsApproval: false,
        isApproving: false,
        approved: false,
      });
    } catch (error) {
      const errorMsg =
        error instanceof Error
          ? error.message
          : "Failed to create loan request";
      setError(errorMsg);
      toast.error(`Failed to create loan request: ${errorMsg}`, {
        autoClose: 7000,
      });
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
          <h1 className="text-4xl font-bold bg-gradient-to-r from-red-500 via-red-600 to-red-700 bg-clip-text text-transparent crypto-heading">
            Create Loan Request
          </h1>
          <p className="text-muted-foreground mt-3 text-base font-medium">
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
        <Card className="card-crypto-info shadow-xl">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-2 text-xl crypto-title">
              <DollarSign className="w-6 h-6 text-blue-700" />
              <span className="font-bold">Loan Details</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground font-medium">
              Configure your loan parameters
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Loan Token */}
              <div className="space-y-3">
                <Label className="text-base font-semibold crypto-body">
                  Loan Token
                </Label>
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
                            <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                              <span className="text-white text-xs font-bold">
                                {token.symbol.charAt(0)}
                              </span>
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
                <Label className="text-base font-semibold crypto-body">
                  Loan Amount
                </Label>
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
                  <div className="text-base font-bold text-green-600 bg-green-50 px-3 py-2 rounded-lg border border-green-200">
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
              <Label className="text-base font-semibold crypto-body flex items-center space-x-2">
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
        <Card className="card-crypto-success shadow-xl">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-2 text-xl crypto-title">
              <Shield className="w-6 h-6 text-green-700" />
              <span className="font-bold">Collateral</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground font-medium">
              Secure your loan with collateral
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Collateral Token */}
              <div className="space-y-3">
                <Label className="text-base font-semibold crypto-body">
                  Collateral Token
                </Label>
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
                            <div className="w-6 h-6 rounded-full bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center">
                              <span className="text-white text-xs font-bold">
                                {token.symbol.charAt(0)}
                              </span>
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
                <Label className="text-base font-semibold crypto-body">
                  Collateral Amount
                </Label>
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
                  <div className="text-base font-bold text-blue-600 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
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

            {/* Collateral Info */}
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
                <div className="text-xs text-muted-foreground">
                  {currentCollateralRatio > 150
                    ? "✅ Higher collateral may reduce your interest rate"
                    : "⚠️ Minimum 150% collateral required"}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 3. Additional Details Card */}
        <Card className="card-crypto-purple shadow-xl">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-2 text-xl crypto-title">
              <Info className="w-6 h-6 text-purple-700" />
              <span className="font-bold">Loan Purpose</span>
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
        <Card className="sticky top-6 shadow-xl border-0 card-crypto-primary">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-2 crypto-title">
              <TrendingUp className="w-5 h-5 text-red-700" />
              <span className="font-bold">Loan Summary</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedLoanToken && formData.amount ? (
              <>
                <div className="flex justify-between items-center p-3 bg-white/60 rounded-lg">
                  <span className="text-sm font-medium text-muted-foreground">
                    Loan Amount
                  </span>
                  <div className="text-right">
                    <div className="font-semibold">
                      {formData.amount} {selectedLoanToken.symbol}
                    </div>
                    <div className="text-sm font-bold text-green-600">
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
                      <div className="text-sm font-bold text-blue-600">
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

                {rateBreakdown && (
                  <div className="p-3 rounded-lg border bg-white/70 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Base Rate</span>
                      <span className="font-medium">{rateBreakdown.baseRate.toFixed(2)}%</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Credit Risk</span>
                      <span className="font-medium">+{rateBreakdown.creditRisk.toFixed(2)}%</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Term Risk</span>
                      <span className="font-medium">+{rateBreakdown.termRisk.toFixed(2)}%</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Market Conditions</span>
                      <span className="font-medium">+{rateBreakdown.marketConditions.toFixed(2)}%</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Collateral Discount</span>
                      <span className="font-medium text-green-600">{rateBreakdown.collateralDiscount.toFixed(2)}%</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Size Adjustment</span>
                      <span className="font-medium">{rateBreakdown.sizeAdjustment >= 0 ? "+" : ""}{rateBreakdown.sizeAdjustment.toFixed(2)}%</span>
                    </div>
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

                  {/* Token Approval Button */}
                  {formData.collateralToken !== ethers.ZeroAddress &&
                    approvalStatus.needsApproval && (
                      <Button
                        onClick={handleApprove}
                        disabled={approvalStatus.isApproving}
                        variant="outline"
                        className="w-full border-yellow-500 text-yellow-700 hover:bg-yellow-50"
                      >
                        {approvalStatus.isApproving
                          ? "Approving Token..."
                          : `Approve ${
                              selectedCollateralToken?.symbol || "Token"
                            }`}
                      </Button>
                    )}

                  {/* Approval Status Indicator */}
                  {formData.collateralToken !== ethers.ZeroAddress &&
                    approvalStatus.approved && (
                      <div className="flex items-center justify-center p-2 bg-green-50 rounded-lg border border-green-200">
                        <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                        <span className="text-sm font-medium text-green-700">
                          {selectedCollateralToken?.symbol} Approved
                        </span>
                      </div>
                    )}

                  <Button
                    onClick={handleSubmit}
                    disabled={
                      !isConnected ||
                      !isVerified ||
                      isCreating ||
                      !calculatedRate ||
                      (formData.collateralToken !== ethers.ZeroAddress &&
                        !approvalStatus.approved)
                    }
                    className="w-full h-12 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 font-semibold text-base tracking-wide"
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
        <Card className="border-0 bg-gradient-to-br from-gray-50 to-slate-100 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-lg crypto-title">
              <Info className="w-5 h-5 text-gray-700" />
              <span className="font-bold">Platform Info</span>
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
