import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, TrendingUp, TrendingDown } from "lucide-react";
import { useSupportedTokens, TokenInfo } from "@/hooks/useSupportedTokens";
import { getTokenImage } from "@/lib/utils";
import Image from "next/image";

interface TokenBalanceCardProps {
  token: TokenInfo;
  showPrice?: boolean;
  showBalance?: boolean;
  className?: string;
}

export function TokenBalanceCard({
  token,
  showPrice = true,
  showBalance = true,
  className = "",
}: TokenBalanceCardProps) {
  const balanceValue =
    parseFloat(token.balanceFormatted) * parseFloat(token.priceFormatted);

  return (
    <Card className={`${className}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full overflow-hidden">
              <Image
                src={getTokenImage(token.symbol)}
                alt={token.symbol}
                width={32}
                height={32}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold">{token.symbol}</h3>
                {token.isMentoStablecoin && (
                  <Badge variant="secondary" className="text-xs">
                    Stable
                  </Badge>
                )}
              </div>
              {showPrice && (
                <p className="text-sm text-muted-foreground">
                  ${parseFloat(token.priceFormatted).toFixed(4)}
                </p>
              )}
            </div>
          </div>

          {showBalance && (
            <div className="text-right">
              <div className="flex items-center space-x-1 text-sm font-medium">
                <Wallet className="w-3 h-3" />
                <span>{parseFloat(token.balanceFormatted).toFixed(4)}</span>
              </div>
              {showPrice && (
                <p className="text-sm text-muted-foreground">
                  ${balanceValue.toFixed(2)}
                </p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface TokenBalanceGridProps {
  className?: string;
  showPrices?: boolean;
  showBalances?: boolean;
}

export function TokenBalanceGrid({
  className = "",
  showPrices = true,
  showBalances = true,
}: TokenBalanceGridProps) {
  const { tokens, loading, error } = useSupportedTokens();

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`p-4 bg-red-500/10 border border-red-500/20 rounded-lg ${className}`}
      >
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (tokens.length === 0) {
    return (
      <div className={`p-4 bg-muted rounded-lg ${className}`}>
        <p className="text-muted-foreground">No supported tokens found</p>
      </div>
    );
  }

  const totalValue = tokens.reduce((sum, token) => {
    return (
      sum +
      parseFloat(token.balanceFormatted) * parseFloat(token.priceFormatted)
    );
  }, 0);

  return (
    <div className={`space-y-4 ${className}`}>
      {showBalances && (
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Tokens</h3>
          {/* {showPrices && (
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total Value</p>
              <p className="text-lg font-bold">${totalValue.toFixed(2)}</p>
            </div>
          )} */}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tokens.map((token) => (
          <TokenBalanceCard
            key={token.address}
            token={token}
            showPrice={showPrices}
            showBalance={showBalances}
          />
        ))}
      </div>
    </div>
  );
}
