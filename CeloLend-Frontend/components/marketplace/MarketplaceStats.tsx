import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MarketplaceStats as Stats } from "@/hooks/useMarketplaceData";
import { formatTokenAmount } from "@/lib/contracts/contractHelpers";

interface MarketplaceStatsProps {
  stats: Stats | null;
  loading?: boolean;
}

export function MarketplaceStats({
  stats,
  loading = false,
}: MarketplaceStatsProps) {
  if (loading) {
    return (
      <Card className="border-0 shadow-lg bg-card">
        <CardHeader>
          <CardTitle className="text-xl text-card-foreground">
            Market Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="text-center">
                <div className="h-8 bg-muted rounded animate-pulse mb-2"></div>
                <div className="h-4 bg-muted rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card className="border-0 shadow-lg bg-card">
        <CardHeader>
          <CardTitle className="text-xl text-card-foreground">
            Market Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            No market data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg bg-card">
      <CardHeader>
        <CardTitle className="text-xl text-card-foreground">
          Market Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">
              {formatTokenAmount(stats.totalActiveRequests)}
            </p>
            <p className="text-sm text-muted-foreground">
              Active Loan Requests
            </p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">
              {formatTokenAmount(stats.totalFundedAmount)}
            </p>
            <p className="text-sm text-muted-foreground">Total Funded Amount</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">
              {stats.averageInterestRate.toFixed(1)}%
            </p>
            <p className="text-sm text-muted-foreground">Avg Interest Rate</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">
              {stats.totalRequests}
            </p>
            <p className="text-sm text-muted-foreground">Total Requests</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
