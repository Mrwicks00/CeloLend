"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Wallet, TrendingUp, DollarSign } from "lucide-react";
import { useSupportedTokens } from "@/hooks/useSupportedTokens";
import Image from "next/image";

export function PortfolioSummary() {
  const { tokens, loading } = useSupportedTokens();

  if (loading) {
    return (
      <Card className="border-0 shadow-2xl bg-gradient-to-r from-primary/10 to-accent/10 mb-8">
        <CardContent className="p-8">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
            <div className="h-12 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalPortfolioValue = tokens.reduce((sum, token) => {
    return (
      sum +
      parseFloat(token.balanceFormatted || "0") *
        parseFloat(token.priceFormatted || "0")
    );
  }, 0);

  const tokenCount = tokens.filter(
    (token) => parseFloat(token.balanceFormatted || "0") > 0
  ).length;

  return (
    <Card className="border-0 shadow-2xl bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 mb-8 overflow-hidden relative">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5"></div>
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/20 to-transparent rounded-full -translate-y-16 translate-x-16"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-accent/20 to-transparent rounded-full translate-y-12 -translate-x-12"></div>

      <CardContent className="p-8 relative z-10">
        <div className="flex items-center justify-between">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg">
                <Image
                  src="/portfolio.jpg"
                  alt="Portfolio"
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  Portfolio Value
                </h2>
                <p className="text-muted-foreground font-medium">
                  {tokenCount} active token{tokenCount !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline space-x-2">
                <span className="text-5xl font-black bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  $
                  {totalPortfolioValue.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
                <TrendingUp className="w-8 h-8 text-green-500" />
              </div>
              <p className="text-lg text-muted-foreground font-medium">
                Total Portfolio Worth
              </p>
            </div>
          </div>

          <div className="text-right space-y-4">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
              <div className="flex items-center space-x-2 mb-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                <span className="text-sm font-semibold text-green-700">
                  USD Value
                </span>
              </div>
              <p className="text-2xl font-bold text-green-700">
                $
                {totalPortfolioValue.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Wallet className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-semibold text-blue-700">
                  Tokens
                </span>
              </div>
              <p className="text-2xl font-bold text-blue-700">{tokenCount}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
