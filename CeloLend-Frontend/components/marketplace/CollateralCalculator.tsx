import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calculator, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { useSupportedTokens, TokenInfo } from "@/hooks/useSupportedTokens";
import { ethers } from "ethers";

interface CollateralCalculatorProps {
  loanToken?: TokenInfo;
  loanAmount: string;
  collateralToken?: TokenInfo;
  onCollateralChange?: (amount: string) => void;
}

export function CollateralCalculator({
  loanToken,
  loanAmount,
  collateralToken,
  onCollateralChange,
}: CollateralCalculatorProps) {
  const [minCollateralAmount, setMinCollateralAmount] = useState<string>("0");
  const [recommendedCollateralAmount, setRecommendedCollateralAmount] =
    useState<string>("0");
  const [collateralRatio, setCollateralRatio] = useState<number>(0);

  // Minimum collateral ratio is 150% (15000 basis points) from the contract
  const MIN_COLLATERAL_RATIO = 1.5;
  const RECOMMENDED_COLLATERAL_RATIO = 2.0; // 200% for safety

  useEffect(() => {
    if (
      !loanToken ||
      !collateralToken ||
      !loanAmount ||
      parseFloat(loanAmount) === 0
    ) {
      setMinCollateralAmount("0");
      setRecommendedCollateralAmount("0");
      setCollateralRatio(0);
      return;
    }

    try {
      const loanAmountNum = parseFloat(loanAmount);
      const loanPriceUSD = parseFloat(loanToken.priceFormatted);
      const collateralPriceUSD = parseFloat(collateralToken.priceFormatted);

      if (loanPriceUSD === 0 || collateralPriceUSD === 0) {
        setMinCollateralAmount("0");
        setRecommendedCollateralAmount("0");
        setCollateralRatio(0);
        return;
      }

      // Calculate loan value in USD
      const loanValueUSD = loanAmountNum * loanPriceUSD;

      // Calculate minimum collateral needed
      const minCollateralValueUSD = loanValueUSD * MIN_COLLATERAL_RATIO;
      const minCollateralAmount = minCollateralValueUSD / collateralPriceUSD;

      // Calculate recommended collateral
      const recommendedCollateralValueUSD =
        loanValueUSD * RECOMMENDED_COLLATERAL_RATIO;
      const recommendedCollateralAmount =
        recommendedCollateralValueUSD / collateralPriceUSD;

      setMinCollateralAmount(minCollateralAmount.toFixed(6));
      setRecommendedCollateralAmount(recommendedCollateralAmount.toFixed(6));

      // Calculate current ratio
      const currentCollateralValueUSD =
        recommendedCollateralAmount * collateralPriceUSD;
      const currentRatio = currentCollateralValueUSD / loanValueUSD;
      setCollateralRatio(currentRatio);
    } catch (error) {
      console.error("Error calculating collateral:", error);
      setMinCollateralAmount("0");
      setRecommendedCollateralAmount("0");
      setCollateralRatio(0);
    }
  }, [loanToken, collateralToken, loanAmount]); // Removed onCollateralChange from dependencies

  // Separate effect for auto-setting collateral amount to avoid infinite loop
  useEffect(() => {
    if (recommendedCollateralAmount !== "0" && onCollateralChange) {
      onCollateralChange(recommendedCollateralAmount);
    }
  }, [recommendedCollateralAmount]); // Only depend on the calculated amount, not the callback

  const getRatioStatus = (ratio: number) => {
    if (ratio >= RECOMMENDED_COLLATERAL_RATIO) return "excellent";
    if (ratio >= MIN_COLLATERAL_RATIO) return "good";
    return "insufficient";
  };

  const getRatioColor = (status: string) => {
    switch (status) {
      case "excellent":
        return "text-green-600 bg-green-50 border-green-200";
      case "good":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "insufficient":
        return "text-red-600 bg-red-50 border-red-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getRatioIcon = (status: string) => {
    switch (status) {
      case "excellent":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "good":
        return <CheckCircle className="w-4 h-4 text-yellow-600" />;
      case "insufficient":
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default:
        return <Info className="w-4 h-4 text-gray-600" />;
    }
  };

  if (!loanToken || !collateralToken) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 text-center text-muted-foreground">
          <Calculator className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>
            Select loan and collateral tokens to calculate collateral
            requirements
          </p>
        </CardContent>
      </Card>
    );
  }

  const ratioStatus = getRatioStatus(collateralRatio);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Calculator className="w-5 h-5" />
          <span>Collateral Calculator</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Collateral Requirements */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Minimum Required
            </label>
            <div className="flex items-center space-x-2">
              <span className="text-lg font-bold">
                {parseFloat(minCollateralAmount).toFixed(4)}
              </span>
              <span className="text-sm text-muted-foreground">
                {collateralToken.symbol}
              </span>
              <Badge variant="outline" className="text-xs">
                150%
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              $
              {(
                parseFloat(minCollateralAmount) *
                parseFloat(collateralToken.priceFormatted)
              ).toFixed(2)}{" "}
              USD
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Recommended
            </label>
            <div className="flex items-center space-x-2">
              <span className="text-lg font-bold text-green-600">
                {parseFloat(recommendedCollateralAmount).toFixed(4)}
              </span>
              <span className="text-sm text-muted-foreground">
                {collateralToken.symbol}
              </span>
              <Badge
                variant="outline"
                className="text-xs bg-green-50 text-green-600"
              >
                200%
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              $
              {(
                parseFloat(recommendedCollateralAmount) *
                parseFloat(collateralToken.priceFormatted)
              ).toFixed(2)}{" "}
              USD
            </p>
          </div>
        </div>

        {/* Current Ratio Status */}
        {collateralRatio > 0 && (
          <div
            className={`p-3 rounded-lg border ${getRatioColor(ratioStatus)}`}
          >
            <div className="flex items-center space-x-2">
              {getRatioIcon(ratioStatus)}
              <span className="font-medium">
                Collateral Ratio: {(collateralRatio * 100).toFixed(1)}%
              </span>
            </div>
            <p className="text-xs mt-1">
              {ratioStatus === "excellent" &&
                "Excellent! Your collateral is well above the minimum requirement."}
              {ratioStatus === "good" &&
                "Good! Your collateral meets the minimum requirement."}
              {ratioStatus === "insufficient" &&
                "Insufficient! You need more collateral to meet the 150% minimum."}
            </p>
          </div>
        )}

        {/* Information */}
        <div className="bg-muted p-3 rounded-lg">
          <h4 className="font-medium text-sm mb-2 flex items-center space-x-1">
            <Info className="w-4 h-4" />
            <span>Collateral Requirements</span>
          </h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Minimum 150% collateral ratio required</li>
            <li>
              • You can use any supported token as collateral: CELO, cUSD, cEUR,
              cREAL
            </li>
            <li>• Collateral is locked until loan is repaid</li>
            <li>
              • If collateral value drops below 150%, liquidation may occur
            </li>
            <li>
              • Higher ratios provide better protection against price volatility
            </li>
          </ul>
        </div>

        {/* Your Balance */}
        {collateralToken.balance > BigInt(0) && (
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>Your {collateralToken.symbol} Balance:</strong>{" "}
              {parseFloat(collateralToken.balanceFormatted).toFixed(4)}{" "}
              {collateralToken.symbol} ($
              {(
                parseFloat(collateralToken.balanceFormatted) *
                parseFloat(collateralToken.priceFormatted)
              ).toFixed(2)}
              )
            </p>
            {parseFloat(collateralToken.balanceFormatted) <
              parseFloat(recommendedCollateralAmount) && (
              <p className="text-xs text-red-600 mt-1">
                ⚠️ Insufficient balance for recommended collateral amount
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
