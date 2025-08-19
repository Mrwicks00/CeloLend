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
import { AlertCircle, Calculator, Info } from "lucide-react";
import { useMarketplaceData } from "@/hooks/useMarketplaceData";
import { useWallet } from "@/contexts/WalletContext";
import { useSelfProtocol } from "@/contexts/SelfProtocolContext";
import { formatTokenAmount } from "@/lib/contracts/contractHelpers";
import { calculateInterestRate } from "@/lib/interestRateUtils";
import { ethers } from "ethers";

export function CreateLoanRequest() {
  const { createLoanRequest, rate, rateLoading } = useMarketplaceData();
  const { address, isConnected } = useWallet();
  const { isVerified, verificationStatus } = useSelfProtocol();

  // Debug logging
  console.log("CreateLoanRequest: Verification status:", {
    isVerified,
    verificationStatus,
    address,
  });

  const [formData, setFormData] = useState({
    amount: "",
    duration: "",
    collateralAmount: "",
    collateralType: "CELO",
    purpose: "",
  });
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calculatedRate, setCalculatedRate] = useState<number | null>(null);

  const collateralTypes = [
    { value: "CELO", label: "CELO", risk: "Low" },
    { value: "cUSD", label: "cUSD", risk: "Low" },
    { value: "cEUR", label: "cEUR", risk: "Low" },
    { value: "cREAL", label: "cREAL", risk: "Low" },
    { value: "USDC", label: "USDC", risk: "Very Low" },
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const calculateRate = async () => {
    if (!formData.amount || !formData.duration || !formData.collateralAmount) {
      setError("Please fill in all required fields");
      return;
    }

    try {
      const amount = ethers.parseEther(formData.amount);
      const duration = BigInt(parseInt(formData.duration) * 24 * 3600); // Convert days to seconds
      const collateralAmount = ethers.parseEther(formData.collateralAmount);

      // Calculate interest rate using the algorithm
      const loanParams = {
        creditScore: 50, // Default, will be fetched from contract
        loanAmount: Number(ethers.formatEther(amount)),
        loanTerm: Number(duration) / (24 * 3600), // Convert seconds to months
        collateralRatio:
          Number(ethers.formatEther(collateralAmount)) /
          Number(ethers.formatEther(amount)),
        collateralType: formData.collateralType,
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
    if (!isConnected) {
      setError("Please connect your wallet");
      return;
    }

    if (!isVerified) {
      setError("Please complete identity verification first");
      return;
    }

    if (
      !formData.amount ||
      !formData.duration ||
      !formData.collateralAmount ||
      !formData.purpose
    ) {
      setError("Please fill in all required fields");
      return;
    }

    if (!calculatedRate) {
      setError("Please calculate the interest rate first");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const amount = ethers.parseEther(formData.amount);
      const duration = BigInt(parseInt(formData.duration) * 24 * 3600); // Convert days to seconds
      const collateralAmount = ethers.parseEther(formData.collateralAmount);

      await createLoanRequest(
        amount,
        duration,
        collateralAmount,
        formData.collateralType,
        formData.purpose
      );

      // Reset form
      setFormData({
        amount: "",
        duration: "",
        collateralAmount: "",
        collateralType: "CELO",
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

  const getRiskLevel = (collateralType: string) => {
    const collateral = collateralTypes.find((c) => c.value === collateralType);
    return collateral?.risk || "Medium";
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "Very Low":
        return "bg-green-500/10 text-green-400";
      case "Low":
        return "bg-blue-500/10 text-blue-400";
      case "Medium":
        return "bg-yellow-500/10 text-yellow-400";
      case "High":
        return "bg-red-500/10 text-red-400";
      default:
        return "bg-gray-500/10 text-gray-400";
    }
  };

  return (
    <Card className="border-0 shadow-lg bg-card">
      <CardHeader>
        <CardTitle className="text-xl text-card-foreground">
          Create Loan Request
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Request a loan with collateral and get an automated interest rate
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isConnected && (
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <div className="flex items-center space-x-2 text-yellow-600">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">
                Please connect your wallet to create a loan request
              </span>
            </div>
          </div>
        )}

        {isConnected && !isVerified && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <div className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">
                Please complete identity verification before requesting a loan
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Loan Amount (CELO)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => handleInputChange("amount", e.target.value)}
              disabled={!isConnected || !isVerified}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Duration (Days)</Label>
            <Input
              id="duration"
              type="number"
              placeholder="30"
              value={formData.duration}
              onChange={(e) => handleInputChange("duration", e.target.value)}
              disabled={!isConnected || !isVerified}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="collateralAmount">Collateral Amount</Label>
            <Input
              id="collateralAmount"
              type="number"
              placeholder="0.00"
              value={formData.collateralAmount}
              onChange={(e) =>
                handleInputChange("collateralAmount", e.target.value)
              }
              disabled={!isConnected || !isVerified}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="collateralType">Collateral Type</Label>
            <Select
              value={formData.collateralType}
              onValueChange={(value) =>
                handleInputChange("collateralType", value)
              }
              disabled={!isConnected || !isVerified}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {collateralTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center justify-between w-full">
                      <span>{type.label}</span>
                      <Badge
                        variant="secondary"
                        className={`ml-2 ${getRiskColor(type.risk)}`}
                      >
                        {type.risk}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="purpose">Loan Purpose</Label>
          <Textarea
            id="purpose"
            placeholder="Describe what you'll use the loan for..."
            value={formData.purpose}
            onChange={(e) => handleInputChange("purpose", e.target.value)}
            disabled={!isConnected || !isVerified}
            rows={3}
          />
        </div>

        {calculatedRate && (
          <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Calculator className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">
                  Calculated Interest Rate
                </span>
              </div>
              <span className="text-lg font-bold text-primary">
                {calculatedRate.toFixed(2)}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Based on your credit score, loan amount, duration, and collateral
            </p>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <div className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={calculateRate}
            disabled={!isConnected || !isVerified || rateLoading || isCreating}
            className="flex items-center space-x-2"
          >
            <Calculator className="w-4 h-4" />
            <span>{rateLoading ? "Calculating..." : "Calculate Rate"}</span>
          </Button>

          <Button
            onClick={handleSubmit}
            disabled={
              !isConnected || !isVerified || isCreating || !calculatedRate
            }
            className="flex-1"
          >
            {isCreating ? "Creating Request..." : "Create Loan Request"}
          </Button>
        </div>

        <div className="p-4 bg-muted rounded-lg">
          <div className="flex items-start space-x-2">
            <Info className="w-4 h-4 text-muted-foreground mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">
                How interest rates are calculated:
              </p>
              <ul className="space-y-1 text-xs">
                <li>• Base rate: 8% annual</li>
                <li>• Credit score impact: Lower scores = higher rates</li>
                <li>• Duration risk: Longer terms = higher rates</li>
                <li>• Collateral discount: Better collateral = lower rates</li>
                <li>
                  • Market conditions: Platform utilization affects pricing
                </li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
