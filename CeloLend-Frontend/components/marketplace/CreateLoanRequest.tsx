"use client";

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
  Plus,
  X,
  Lightbulb,
} from "lucide-react";
import { useMarketplaceData } from "@/hooks/useMarketplaceData";
import { useWallet } from "@/contexts/WalletContext";
import { useSelfProtocol } from "@/contexts/SelfProtocolContext";
import { useSupportedTokens } from "@/hooks/useSupportedTokens";
import { useLoanLimits } from "@/hooks/useLoanLimits";
import { formatTokenAmount } from "@/lib/contracts/contractHelpers";
import { useLoanData } from "@/hooks/useLoanData";
import { getTokenImage } from "@/lib/utils";
import Image from "next/image";
import {
  calculateInterestRate,
  type RateResponse,
} from "@/lib/interestRateUtils";
import { getContractAddress } from "@/lib/contracts/addresses";
import { ethers } from "ethers";
import { toast } from "react-toastify";

interface CollateralToken {
  token: string;
  amount: string;
}

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
  const { userStats } = useLoanData();
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
    loanToken: ethers.ZeroAddress,
    purpose: "",
  });

  const [collateralTokens, setCollateralTokens] = useState<CollateralToken[]>([
    { token: ethers.ZeroAddress, amount: "" },
  ]);

  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calculatedRate, setCalculatedRate] = useState<number | null>(null);
  const [rateBreakdown, setRateBreakdown] = useState<
    RateResponse["breakdown"] | null
  >(null);
  const [approvalStatus, setApprovalStatus] = useState<{
    needsApproval: boolean;
    isApproving: boolean;
    approved: boolean;
  }>({ needsApproval: false, isApproving: false, approved: false });

  // Get selected tokens info
  const selectedLoanToken = tokens.find(
    (t) => t.address === formData.loanToken
  );

  const selectedCollateralTokens = collateralTokens
    .map((collateral) => tokens.find((t) => t.address === collateral.token))
    .filter(Boolean);

  // Handle input changes
  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setError(null);
    setCalculatedRate(null);
  };

  const handleCollateralChange = (
    index: number,
    field: "token" | "amount",
    value: string
  ) => {
    setCollateralTokens((prev) => {
      const newTokens = [...prev];
      newTokens[index] = { ...newTokens[index], [field]: value };
      return newTokens;
    });
    setError(null);
    setCalculatedRate(null);
  };

  const addCollateralToken = () => {
    if (collateralTokens.length < 5) {
      setCollateralTokens((prev) => [
        ...prev,
        { token: ethers.ZeroAddress, amount: "" },
      ]);
    }
  };

  const removeCollateralToken = (index: number) => {
    if (collateralTokens.length > 1) {
      setCollateralTokens((prev) => prev.filter((_, i) => i !== index));
    }
  };

  // Calculate total collateral value and individual token values
  const collateralCalculations = (() => {
    if (!selectedLoanToken || !formData.amount) {
      return {
        totalCollateralValue: 0,
        totalCollateralUSD: 0,
        loanValueUSD: 0,
        ratio: 0,
        tokenDetails: [],
      };
    }

    try {
      const loanAmount = parseFloat(formData.amount);
      const loanPrice = parseFloat(selectedLoanToken.priceFormatted || "0");
      const loanValueUSD = loanAmount * loanPrice;

      let totalCollateralValue = 0;
      let totalCollateralUSD = 0;
      const tokenDetails = [];

      // Loop through ALL collateral tokens and sum them up
      for (const collateral of collateralTokens) {
        if (
          collateral.amount &&
          collateral.token &&
          parseFloat(collateral.amount) > 0
        ) {
          const tokenMeta = tokens.find((t) => t.address === collateral.token);
          if (tokenMeta && tokenMeta.priceFormatted) {
            const collateralAmount = parseFloat(collateral.amount);
            const collateralPrice = parseFloat(tokenMeta.priceFormatted);
            const collateralValueUSD = collateralAmount * collateralPrice;

            totalCollateralValue += collateralAmount;
            totalCollateralUSD += collateralValueUSD;

            tokenDetails.push({
              symbol: tokenMeta.symbol,
              amount: collateralAmount,
              price: collateralPrice,
              valueUSD: collateralValueUSD,
              balance: tokenMeta.balance || 0,
              balanceUSD: Number(tokenMeta.balance || 0) * collateralPrice,
            });
          }
        }
      }

      const ratio =
        loanValueUSD > 0 ? (totalCollateralUSD / loanValueUSD) * 100 : 0;

      return {
        totalCollateralValue,
        totalCollateralUSD,
        loanValueUSD,
        ratio,
        tokenDetails,
      };
    } catch {
      return {
        totalCollateralValue: 0,
        totalCollateralUSD: 0,
        loanValueUSD: 0,
        ratio: 0,
        tokenDetails: [],
      };
    }
  })();

  // Generate collateral suggestions for multiple tokens
  const generateCollateralSuggestions = () => {
    if (!selectedLoanToken || !formData.amount || !tokens.length) return [];

    const loanAmount = parseFloat(formData.amount);
    const loanPrice = parseFloat(selectedLoanToken.priceFormatted || "0");
    if (loanAmount <= 0 || loanPrice <= 0) return [];

    const loanValueUSD = loanAmount * loanPrice;
    const requiredCollateralUSD = loanValueUSD * 1.5; // 150% requirement

    // Get available tokens (excluding loan token)
    const availableTokens = tokens.filter(
      (t) => t.address !== formData.loanToken
    );

    // Generate suggestions for different token combinations
    const suggestions = [];

    // Single token suggestions
    for (const token of availableTokens.slice(0, 3)) {
      if (token.priceFormatted) {
        const tokenPrice = parseFloat(token.priceFormatted);
        const requiredAmount = requiredCollateralUSD / tokenPrice;
        suggestions.push({
          type: "single",
          tokens: [
            {
              symbol: token.symbol,
              amount: requiredAmount.toFixed(6),
              address: token.address,
            },
          ],
          totalUSD: requiredCollateralUSD,
          description: `Use ${token.symbol} as collateral`,
        });
      }
    }

    // Two token suggestions (split 60/40)
    if (availableTokens.length >= 2) {
      const token1 = availableTokens[0];
      const token2 = availableTokens[1];
      if (token1.priceFormatted && token2.priceFormatted) {
        const price1 = parseFloat(token1.priceFormatted);
        const price2 = parseFloat(token2.priceFormatted);
        const amount1 = (requiredCollateralUSD * 0.6) / price1;
        const amount2 = (requiredCollateralUSD * 0.4) / price2;

        suggestions.push({
          type: "dual",
          tokens: [
            {
              symbol: token1.symbol,
              amount: amount1.toFixed(6),
              address: token1.address,
            },
            {
              symbol: token2.symbol,
              amount: amount2.toFixed(6),
              address: token2.address,
            },
          ],
          totalUSD: requiredCollateralUSD,
          description: `Split between ${token1.symbol} and ${token2.symbol}`,
        });
      }
    }

    return suggestions;
  };

  const collateralSuggestions = generateCollateralSuggestions();

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

  const collateralStatus = getCollateralStatus(collateralCalculations.ratio);

  // Validation
  const validateLoanAmount = (amount: string): string | null => {
    if (!amount || parseFloat(amount) <= 0) {
      return "Loan amount must be greater than 0";
    }
    return null;
  };

  const validateCollateral = (): string | null => {
    if (!collateralTokens.length) {
      return "At least one collateral token is required";
    }

    // Check if at least one token has valid amount
    const hasValidCollateral = collateralTokens.some(
      (collateral) =>
        collateral.token && // Just check token exists
        collateral.amount &&
        parseFloat(collateral.amount) > 0
    );

    if (!hasValidCollateral) {
      return "At least one collateral token with valid amount is required";
    }

    if (collateralCalculations.ratio < 150) {
      return `Total collateral ratio must be at least 150%. Current: ${collateralCalculations.ratio.toFixed(
        1
      )}%`;
    }
    return null;
  };

  const loanAmountError = validateLoanAmount(formData.amount);
  const collateralError = validateCollateral();

  // Calculate interest rate using the API
  const calculateRate = async () => {
    if (!formData.amount || !formData.duration || !collateralTokens.length) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const loanAmount = parseFloat(formData.amount);
      const loanPrice = parseFloat(selectedLoanToken?.priceFormatted || "0");

      if (loanAmount <= 0 || loanPrice <= 0) return null;

      const loanValueUSD = loanAmount * loanPrice;
      const collateralRatio =
        collateralCalculations.totalCollateralUSD / loanValueUSD;

      // Call the API to calculate interest rate
      const response = await fetch("/api/calculate-rate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          creditScore: userStats?.creditScore || 50,
          loanAmount,
          loanTerm: parseInt(formData.duration),
          collateralRatio,
          collateralType: "Multi-Collateral",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to calculate rate");
      }

      const rateResult = await response.json();
      setCalculatedRate(rateResult.interestRate);
      setRateBreakdown(rateResult.breakdown);
      setError(null);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to calculate rate"
      );
    }
  };

  // Check if approval is needed for collateral tokens
  const checkApprovalNeeded = useCallback(async () => {
    if (!collateralTokens.length || !isConnected) {
      return;
    }

    let needsApproval = false;
    for (const collateral of collateralTokens) {
      if (
        collateral.token !== ethers.ZeroAddress &&
        collateral.amount &&
        parseFloat(collateral.amount) > 0
      ) {
        try {
          const tokenMeta = tokens.find((t) => t.address === collateral.token);
          if (tokenMeta) {
            const collateralAmount = ethers.parseUnits(
              collateral.amount,
              tokenMeta.decimals
            );

            const result = await checkTokenAllowance(
              collateral.token,
              collateralAmount,
              getContractAddress("CeloLend")
            );

            if (!result.approved) {
              needsApproval = true;
              break;
            }
          }
        } catch (error) {
          console.error("Error checking approval:", error);
        }
      }
    }

    setApprovalStatus({
      needsApproval,
      isApproving: false,
      approved: !needsApproval,
    });
  }, [collateralTokens, isConnected, tokens, checkTokenAllowance]);

  // Check approval when collateral tokens change
  useEffect(() => {
    if (collateralTokens.length > 0) {
      checkApprovalNeeded();
    }
  }, [collateralTokens]);

  const handleApprove = async () => {
    setApprovalStatus((prev) => ({ ...prev, isApproving: true }));
    setError(null);

    try {
      // Approve all non-native tokens that need approval
      for (const collateral of collateralTokens) {
        if (collateral.token !== ethers.ZeroAddress && collateral.amount) {
          const tokenMeta = tokens.find((t) => t.address === collateral.token);
          if (tokenMeta) {
            toast.info(`Approving ${tokenMeta.symbol}...`, {
              autoClose: 2000,
            });

            await approveToken(
              collateral.token,
              getContractAddress("CeloLend")
            );
          }
        }
      }

      setApprovalStatus({
        needsApproval: false,
        isApproving: false,
        approved: true,
      });

      toast.success("All tokens approved successfully!", {
        autoClose: 4000,
      });
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Failed to approve tokens";
      setError(errorMsg);
      setApprovalStatus((prev) => ({ ...prev, isApproving: false }));
      toast.error(`Approval failed: ${errorMsg}`, {
        autoClose: 7000,
      });
    }
  };

  const handleSubmit = async () => {
    if (!isConnected) {
      setError("Please connect your wallet");
      return;
    }

    if (!isVerified) {
      setError("Please complete identity verification first");
      return;
    }

    if (loanAmountError || collateralError) {
      setError("Please fix the validation errors above");
      return;
    }

    if (approvalStatus.needsApproval) {
      setError("Please approve all collateral tokens first");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      // Prepare arrays for smart contract
      const collateralTokenAddresses = collateralTokens
        .filter((c) => c.amount && parseFloat(c.amount) > 0) // Same filter as amounts
        .map((c) => c.token);

      const collateralAmounts = collateralTokens
        .filter((c) => c.amount && parseFloat(c.amount) > 0) // Filter by valid amount instead
        .map((c) => {
          const tokenMeta = tokens.find((t) => t.address === c.token);
          // Ensure c.amount is a valid string representation of a number
          const cleanAmount = parseFloat(c.amount || "0").toString();
          return ethers.parseUnits(cleanAmount, tokenMeta?.decimals || 18);
        });

      // Calculate total native token value
      let totalNativeValue = BigInt(0);
      for (let i = 0; i < collateralTokens.length; i++) {
        if (
          collateralTokens[i].token === ethers.ZeroAddress &&
          collateralTokens[i].amount
        ) {
          const cleanAmount = parseFloat(
            collateralTokens[i].amount || "0"
          ).toString();
          const amount = ethers.parseUnits(cleanAmount, 18);
          totalNativeValue += amount;
        }
      }
      const cleanLoanAmount = parseFloat(formData.amount || "0").toString();
      const amount = ethers.parseUnits(
        cleanLoanAmount,
        selectedLoanToken?.decimals || 18
      );

      const duration = BigInt(parseInt(formData.duration) * 24 * 3600);
      const interestRateValue = Math.floor(
        calculatedRate || (typeof rate === "number" ? rate : 1500)
      );
      const interestRate = BigInt(interestRateValue);

      await createLoanRequest(
        amount,
        formData.loanToken,
        interestRate,
        duration,
        collateralTokenAddresses,
        collateralAmounts,
        { value: totalNativeValue }
      );

      toast.success("Loan request created successfully!");

      // Reset form
      setFormData({
        amount: "",
        duration: "",
        loanToken: ethers.ZeroAddress,
        purpose: "",
      });
      setCollateralTokens([{ token: ethers.ZeroAddress, amount: "" }]);
      setCalculatedRate(null);
      setRateBreakdown(null);
    } catch (error) {
      const errorMsg =
        error instanceof Error
          ? error.message
          : "Failed to create loan request";
      setError(errorMsg);
      toast.error(errorMsg, { autoClose: 7000 });
    } finally {
      setIsCreating(false);
    }
  };

  if (!isConnected) {
    return (
      <Card className="w-full max-w-4xl mx-auto bg-gradient-to-br from-yellow-50 to-orange-100 border-2 border-yellow-200">
        <CardContent className="p-8 text-center">
          <Wallet className="w-12 h-12 mx-auto mb-4 text-yellow-600" />
          <h2 className="text-xl font-semibold mb-2 text-yellow-900">
            Wallet Required
          </h2>
          <p className="text-yellow-700">
            Connect your wallet to create a loan request
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!isVerified) {
    return (
      <Card className="w-full max-w-4xl mx-auto bg-gradient-to-br from-red-50 to-pink-100 border-2 border-red-200">
        <CardContent className="p-8 text-center">
          <Shield className="w-12 h-12 mx-auto mb-4 text-red-600" />
          <h2 className="text-xl font-semibold mb-2 text-red-900">
            Verification Required
          </h2>
          <p className="text-red-700">
            Please complete identity verification before creating loan requests
          </p>
          <div className="mt-4">
            <Badge
              variant="outline"
              className="text-sm border-red-400 text-red-800"
            >
              Status: {verificationStatus}
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 p-4">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-red-500 via-red-600 to-red-700 bg-clip-text text-transparent crypto-heading">
          Create Loan Request
        </h1>
        <p className="text-muted-foreground mt-3 text-base font-medium">
          Configure your loan with automated interest rates and instant
          collateral calculation
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form - Left Side */}
        <div className="lg:col-span-2 space-y-6">
          {/* Loan Details Card */}
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
                <div className="space-y-3">
                  <Label className="text-base font-semibold crypto-body">
                    Loan Token
                  </Label>
                  <Select
                    value={formData.loanToken}
                    onValueChange={(val) => handleInputChange("loanToken", val)}
                    disabled={!isConnected || !isVerified || tokensLoading}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Choose token to borrow" />
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
                              <span className="font-medium">
                                {token.symbol}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              $
                              {parseFloat(token.priceFormatted || "0").toFixed(
                                2
                              )}
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
                        {parseFloat(
                          selectedLoanToken.balanceFormatted || "0"
                        ).toFixed(4)}{" "}
                        {selectedLoanToken.symbol}
                      </span>
                      <span>
                        $
                        {(
                          parseFloat(
                            selectedLoanToken.balanceFormatted || "0"
                          ) *
                          parseFloat(selectedLoanToken.priceFormatted || "0")
                        ).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <Label className="text-base font-semibold crypto-body">
                    Loan Amount
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) =>
                      handleInputChange("amount", e.target.value)
                    }
                    disabled={!isConnected || !isVerified}
                    className="h-12"
                  />
                  {loanAmountError && (
                    <p className="text-sm text-red-600">{loanAmountError}</p>
                  )}
                  <p className="text-xs text-blue-700">
                    Min: {minLoanAmountFormatted} | Max:{" "}
                    {maxLoanAmountFormatted}
                  </p>
                  {selectedLoanToken && formData.amount && (
                    <div className="text-base font-bold text-green-600 bg-green-50 px-3 py-2 rounded-lg border border-green-200">
                      ≈ $
                      {(
                        parseFloat(formData.amount) *
                        parseFloat(selectedLoanToken.priceFormatted || "0")
                      ).toFixed(2)}{" "}
                      USD
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <Label className="text-base font-semibold crypto-body flex items-center space-x-2">
                    <Clock className="w-4 h-4" />
                    <span>Duration (Days)</span>
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    max="365"
                    placeholder="30"
                    value={formData.duration}
                    onChange={(e) =>
                      handleInputChange("duration", e.target.value)
                    }
                    disabled={!isConnected || !isVerified}
                    className="h-12"
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-base font-semibold crypto-body">
                    Purpose (Optional)
                  </Label>
                  <Input
                    placeholder="What will you use this loan for?"
                    value={formData.purpose}
                    onChange={(e) =>
                      handleInputChange("purpose", e.target.value)
                    }
                    disabled={!isConnected || !isVerified}
                    className="h-12"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Collateral Card */}
          <Card className="card-crypto-success shadow-xl">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center space-x-2 text-xl crypto-title">
                <Shield className="w-6 h-6 text-green-700" />
                <span className="font-bold">Collateral Tokens</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground font-medium">
                Secure your loan with multiple collateral tokens
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium text-green-900">
                  Collateral Tokens
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addCollateralToken}
                  disabled={collateralTokens.length >= 5}
                  className="border-green-500 text-green-600 hover:bg-green-50"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Token
                </Button>
              </div>

              {collateralTokens.map((collateral, index) => (
                <div
                  key={index}
                  className="grid grid-cols-3 gap-3 items-end p-4 bg-white rounded-lg border border-green-200"
                >
                  <div className="space-y-2">
                    <Label className="text-green-900 font-semibold">
                      Token
                    </Label>
                    <Select
                      value={collateral.token}
                      onValueChange={(val) =>
                        handleCollateralChange(index, "token", val)
                      }
                    >
                      <SelectTrigger className="border-green-300 focus:border-green-500 focus:ring-green-500">
                        <SelectValue placeholder="Select token" />
                      </SelectTrigger>
                      <SelectContent>
                        {tokens.map((token) => (
                          <SelectItem key={token.address} value={token.address}>
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
                              <span>{token.symbol}</span>
                              <span className="text-xs text-gray-500">
                                ($
                                {parseFloat(
                                  token.priceFormatted || "0"
                                ).toFixed(4)}
                                )
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-green-900 font-semibold">
                      Amount
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={collateral.amount}
                      onChange={(e) =>
                        handleCollateralChange(index, "amount", e.target.value)
                      }
                      className="border-green-300 focus:border-green-500 focus:ring-green-500"
                    />
                    {collateral.token && (
                      <p className="text-xs text-green-700">
                        Balance:{" "}
                        {formatTokenAmount(
                          BigInt(
                            tokens.find((t) => t.address === collateral.token)
                              ?.balance || 0
                          ),
                          tokens.find((t) => t.address === collateral.token)
                            ?.address || "",
                          tokens.find((t) => t.address === collateral.token)
                            ?.decimals || 18
                        )}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    {collateralTokens.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeCollateralToken(index)}
                        className="text-red-600 hover:text-red-700 border-red-300"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              {/* Collateral Summary */}
              <div className="bg-white p-4 rounded-lg border border-green-200">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-green-700 font-medium">
                      Total Collateral Value
                    </p>
                    <p className="text-lg font-bold text-green-900">
                      ${collateralCalculations.totalCollateralUSD.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-green-700 font-medium">Loan Value</p>
                    <p className="text-lg font-bold text-blue-900">
                      ${collateralCalculations.loanValueUSD.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between p-3 bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg">
                  <span className="text-sm font-medium text-green-900">
                    Collateral Ratio
                  </span>
                  <Badge className={`${collateralStatus.bgColor} text-white`}>
                    {collateralCalculations.ratio.toFixed(1)}% -{" "}
                    {collateralStatus.label}
                  </Badge>
                </div>

                {collateralError && (
                  <p className="text-sm text-red-600 mt-2">{collateralError}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {collateralSuggestions.length > 0 && (
            <Card className="shadow-lg border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-lg">
                  <Lightbulb className="w-5 h-5 text-blue-600" />
                  <span className="font-bold text-blue-900">
                    Smart Suggestions
                  </span>
                </CardTitle>
                <p className="text-sm text-blue-700 font-medium">
                  Optimize your collateral strategy
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {collateralSuggestions.slice(0, 3).map((suggestion, idx) => (
                    <div
                      key={idx}
                      className="bg-white p-4 rounded-lg border border-blue-200 hover:border-blue-400 transition-colors cursor-pointer group"
                      onClick={() => {
                        // Auto-fill collateral based on suggestion
                        const newTokens = suggestion.tokens.map(
                          (token, tokenIdx) => ({
                            token: token.address,
                            amount: token.amount,
                          })
                        );
                        // Pad with empty slots if needed
                        while (newTokens.length < collateralTokens.length) {
                          newTokens.push({
                            token: ethers.ZeroAddress,
                            amount: "",
                          });
                        }
                        setCollateralTokens(newTokens);
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">
                          {suggestion.type === "single"
                            ? "Single Token"
                            : "Multi-Token"}
                        </span>
                        <div className="w-2 h-2 rounded-full bg-green-400"></div>
                      </div>

                      <div className="space-y-1 mb-3">
                        {suggestion.tokens.map((token, tokenIdx) => (
                          <div
                            key={tokenIdx}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="font-semibold text-gray-700">
                              {token.symbol}
                            </span>
                            <span className="text-gray-600 font-mono">
                              {parseFloat(token.amount).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-blue-100">
                        <span className="text-xs text-blue-600 font-medium">
                          Total Value
                        </span>
                        <span className="text-sm font-bold text-green-600">
                          ${suggestion.totalUSD.toFixed(0)}
                        </span>
                      </div>

                      <div className="mt-1 text-center">
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                          150% Ratio
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {collateralSuggestions.length > 3 && (
                  <div className="text-center pt-2">
                    <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                      View {collateralSuggestions.length - 3} more suggestions
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Rate Calculation Card */}
          <Card className="card-crypto-purple shadow-xl">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center space-x-2 text-xl crypto-title">
                <Calculator className="w-6 h-6 text-purple-700" />
                <span className="font-bold">Interest Rate Calculation</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={calculateRate}
                disabled={
                  !formData.amount ||
                  !formData.duration ||
                  !collateralTokens.length
                }
                className="border-purple-500 text-purple-600 hover:bg-purple-50"
              >
                <Calculator className="w-4 h-4 mr-2" />
                Calculate Rate
              </Button>

              {calculatedRate && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg">
                    <span className="font-medium text-purple-900">
                      Calculated Interest Rate
                    </span>
                    <span className="text-2xl font-bold text-purple-600">
                      {calculatedRate.toFixed(2)}%
                    </span>
                  </div>

                  {rateBreakdown && (
                    <div className="space-y-2 text-sm bg-white p-4 rounded-lg border border-purple-200">
                      <div className="flex justify-between">
                        <span className="text-purple-700">Base Rate:</span>
                        <span className="font-medium">
                          {rateBreakdown.baseRate.toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-purple-700">Credit Risk:</span>
                        <span className="font-medium">
                          {(rateBreakdown.creditRisk / 100).toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-purple-700">Term Risk:</span>
                        <span className="font-medium">
                          {(rateBreakdown.termRisk / 100).toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-purple-700">
                          Market Conditions:
                        </span>
                        <span className="font-medium">
                          {(rateBreakdown.marketConditions / 100).toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-purple-700">
                          Collateral Discount:
                        </span>
                        <span className="font-medium text-green-600">
                          {(rateBreakdown.collateralDiscount / 100).toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-purple-700">
                          Size Adjustment:
                        </span>
                        <span className="font-medium">
                          {rateBreakdown.sizeAdjustment >= 0 ? "+" : ""}
                          {(rateBreakdown.sizeAdjustment / 100).toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Token Approval Card */}
          {approvalStatus.needsApproval && (
            <Card className="border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-t-lg">
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5" />
                  <span>Token Approval Required</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="bg-gradient-to-r from-yellow-100 to-orange-100 border border-yellow-300 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-900 mb-2">
                    Approval Required
                  </h4>
                  <p className="text-sm text-yellow-800 mb-3">
                    You need to approve the smart contract to spend your
                    collateral tokens.
                  </p>
                  <Button
                    onClick={handleApprove}
                    disabled={approvalStatus.isApproving}
                    className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white"
                  >
                    {approvalStatus.isApproving
                      ? "Approving..."
                      : "Approve All Tokens"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Submit Button */}
          <Card className="card-crypto-primary shadow-xl">
            <CardContent className="p-6">
              <Button
                onClick={handleSubmit}
                disabled={
                  isCreating ||
                  !!loanAmountError ||
                  !!collateralError ||
                  approvalStatus.needsApproval
                }
                className="w-full h-12 text-lg bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
              >
                {isCreating ? "Creating..." : "Create Loan Request"}
              </Button>
              {error && (
                <p className="text-sm text-red-600 mt-2 text-center">{error}</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Summary Sidebar - Right Side */}
        <div className="space-y-6">
          {/* Loan Summary Card */}
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
                          parseFloat(selectedLoanToken.priceFormatted || "0")
                        ).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {formData.duration && (
                    <div className="flex justify-between items-center p-3 bg-white/60 rounded-lg">
                      <span className="text-sm font-medium text-muted-foreground">
                        Duration
                      </span>
                      <span className="font-semibold">
                        {formData.duration} days
                      </span>
                    </div>
                  )}

                  {collateralCalculations.totalCollateralUSD > 0 && (
                    <div className="flex justify-between items-center p-3 bg-white/60 rounded-lg">
                      <span className="text-sm font-medium text-muted-foreground">
                        Total Collateral
                      </span>
                      <div className="text-right">
                        <div className="font-semibold">
                          $
                          {collateralCalculations.totalCollateralUSD.toFixed(2)}
                        </div>
                        <div className="text-sm font-bold text-blue-600">
                          {collateralCalculations.ratio.toFixed(1)}% ratio
                        </div>
                      </div>
                    </div>
                  )}

                  {collateralCalculations.ratio > 0 && (
                    <div className="flex justify-between items-center p-3 bg-white/60 rounded-lg">
                      <span className="text-sm font-medium text-muted-foreground">
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
                      <span className="text-sm font-medium text-muted-foreground">
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

                    {/* Token Approval Button */}
                    {approvalStatus.needsApproval && (
                      <Button
                        onClick={handleApprove}
                        disabled={approvalStatus.isApproving}
                        variant="outline"
                        className="w-full border-yellow-500 text-yellow-700 hover:bg-yellow-50"
                      >
                        {approvalStatus.isApproving
                          ? "Approving Token..."
                          : "Approve All Tokens"}
                      </Button>
                    )}

                    {/* Approval Status Indicator */}
                    {approvalStatus.approved && (
                      <div className="flex items-center justify-center p-2 bg-green-50 rounded-lg border border-green-200">
                        <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                        <span className="text-sm font-medium text-green-700">
                          All Tokens Approved
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
                        approvalStatus.needsApproval
                      }
                      className="w-full h-12 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 font-semibold text-base tracking-wide"
                    >
                      {isCreating
                        ? "Creating Request..."
                        : "Create Loan Request"}
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
                    <strong>Collateral:</strong> Multiple tokens supported
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
