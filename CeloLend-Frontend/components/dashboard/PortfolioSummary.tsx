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
    <Card className="mb-8 overflow-hidden relative bg-card">
      <CardContent className="p-8 relative z-10">
        <div className="flex items-center justify-between">
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <div className="w-20 h-20 rounded-3xl overflow-hidden bg-gray-50">
                <Image
                  src="/portfolio.jpg"
                  alt="Portfolio"
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h2 className="text-3xl font-iphone-black text-foreground mb-2">
                  Portfolio Value
                </h2>
                <p className="text-lg font-iphone text-foreground">
                  {tokenCount} active token{tokenCount !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-baseline space-x-3">
                <span className="text-6xl font-iphone-black text-foreground">
                  $
                  {totalPortfolioValue.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
                <TrendingUp className="w-10 h-10 text-foreground" />
              </div>
              <p className="text-xl font-iphone text-foreground">
                Total Portfolio Worth
              </p>
            </div>
          </div>

          <div className="text-right space-y-6">
            <div className="bg-card p-6 rounded-3xl shadow-lg">
              <div className="flex items-center space-x-3 mb-3">
                <DollarSign className="w-6 h-6 text-foreground" />
                <span className="text-base font-iphone-bold text-foreground">
                  USD Value
                </span>
              </div>
              <p className="text-3xl font-iphone-black text-foreground">
                $
                {totalPortfolioValue.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>

            <div className="bg-card p-6 rounded-3xl shadow-lg">
              <div className="flex items-center space-x-3 mb-3">
                <Wallet className="w-6 h-6 text-foreground" />
                <span className="text-base font-iphone-bold text-foreground">
                  Tokens
                </span>
              </div>
              <p className="text-3xl font-iphone-black text-foreground">
                {tokenCount}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
