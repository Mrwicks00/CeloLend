import { useCallback, useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { useContract } from "@/contexts/ContractContext";
import { useWallet } from "@/contexts/WalletContext";
import { useSupportedTokens } from "@/hooks/useSupportedTokens";
import {
  calculateHealthFactor,
  getHealthFactorStatus,
  TOKEN_SYMBOLS,
} from "@/lib/contracts/contractHelpers";

export type CollateralAsset = {
  id: string;
  symbol: string;
  name: string;
  type: "crypto" | "rwa" | "stablecoin";
  balance: number;
  valueUSD: number;
  priceUSD: number;
  priceChange24h: number;
  utilizationRatio: number;
  maxLTV: number;
  liquidationThreshold: number;
  isActive: boolean;
  lastUpdated: string;
};

export type CollateralPosition = {
  id: string;
  assetSymbol: string;
  depositedAmount: number;
  currentValue: number;
  utilizationRatio: number;
  healthFactor: number;
  loanAmount: number;
  liquidationPrice: number;
  status: "healthy" | "warning" | "danger";
};

export function useCollateralData() {
  const { address, isConnected } = useWallet();
  const { collateralVault, celoLend, priceOracle } = useContract();
  const { tokens } = useSupportedTokens();

  const [assets, setAssets] = useState<CollateralAsset[]>([]);
  const [positions, setPositions] = useState<CollateralPosition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tokenMetaByAddress = useMemo(() => {
    const map: Record<
      string,
      { symbol: string; price: number; decimals: number }
    > = {};
    for (const t of tokens) {
      map[t.address.toLowerCase()] = {
        symbol: t.symbol,
        price: parseFloat(t.priceFormatted || "0"),
        decimals: t.decimals || 18,
      };
    }
    return map;
  }, [tokens]);

  const refresh = useCallback(async () => {
    if (!isConnected || !address || !collateralVault || !celoLend) return;
    setLoading(true);
    setError(null);

    try {
      // Get user's collateral details: arrays of tokens, amounts, loanIds
      const result = await collateralVault.getUserCollateralDetails(address);
      const tokensArr: string[] = result[0];
      const amountsArr: bigint[] = result[1];
      const loanIdsArr: bigint[] = result[2];

      // Aggregate assets by token
      const aggregate: Record<string, { amount: number; valueUSD: number }> =
        {};
      const newPositions: CollateralPosition[] = [];

      for (let i = 0; i < tokensArr.length; i++) {
        const tokenAddr = (tokensArr[i] || ethers.ZeroAddress).toLowerCase();
        const rawCollateralAmount = amountsArr[i] || 0n;
        const amount = Number(
          ethers.formatUnits(
            rawCollateralAmount,
            tokenMetaByAddress[tokenAddr]?.decimals || 18
          )
        );
        const meta = tokenMetaByAddress[tokenAddr];
        const price = meta?.price ?? 0;
        const symbol =
          meta?.symbol ||
          TOKEN_SYMBOLS[tokensArr[i] as keyof typeof TOKEN_SYMBOLS] ||
          "Token";

        // Fetch loan info for utilization and health
        let loanAmount = 0;
        let collateralRatioBps = 0;
        let liquidationThresholdBps = 8000; // default 80%
        try {
          const loanId = loanIdsArr[i];
          const loan = await celoLend.getLoanRequest(loanId);
          const loanTokenAddr = (
            loan.tokenAddress || ethers.ZeroAddress
          ).toLowerCase();
          const loanTokenMeta = tokenMetaByAddress[loanTokenAddr];
          const rawLoanAmount = loan.amount as bigint;
          const loanAmountNum = Number(
            ethers.formatUnits(rawLoanAmount, loanTokenMeta?.decimals || 18)
          );
          loanAmount = loanAmountNum;
          const isFunded = Boolean(loan.isFunded);
          const isActive = Boolean(loan.isActive);

          // On-chain collateral ratio (basis points)
          if (priceOracle) {
            try {
              collateralRatioBps = Number(
                await priceOracle.calculateCollateralRatio(
                  tokensArr[i],
                  rawCollateralAmount,
                  loan.tokenAddress,
                  rawLoanAmount
                )
              );
            } catch {}
          }

          // Get liquidation threshold bps from vault mapping if available
          try {
            const lt = await collateralVault.liquidationThresholds(
              tokensArr[i]
            );
            liquidationThresholdBps = Number(lt);
          } catch {}

          // Compute utilization from ratio (loan/collateral)
          const utilizationRatio =
            collateralRatioBps > 0
              ? Math.min(100, 1000000 / collateralRatioBps)
              : 0;
          // Health factor = ratio / threshold
          const healthFactor =
            collateralRatioBps > 0 && liquidationThresholdBps > 0
              ? collateralRatioBps / liquidationThresholdBps
              : 0;

          // Approximate USD values from token meta (display only)
          const collateralValueUSD = amount * price;
          const loanValueUSD = loanAmountNum * (loanTokenMeta?.price ?? 0);
          const statusMeta = getHealthFactorStatus(healthFactor);

          newPositions.push({
            id: loanId.toString(),
            assetSymbol: symbol,
            depositedAmount: amount,
            currentValue: Number(collateralValueUSD.toFixed(2)),
            utilizationRatio: Number(utilizationRatio.toFixed(2)),
            healthFactor: Number(healthFactor.toFixed(2)),
            loanAmount: Number(loanValueUSD.toFixed(2)),
            liquidationPrice: 0,
            status:
              statusMeta.status === "safe"
                ? "healthy"
                : statusMeta.status === "moderate"
                ? "warning"
                : "danger",
            // @ts-expect-error expose extra details for UI tooltips
            _details: {
              collateralRatioPct: (collateralRatioBps / 100).toFixed(2),
              liquidationThresholdPct: (liquidationThresholdBps / 100).toFixed(
                2
              ),
            },
            // @ts-expect-error expose flags for UI actions
            _flags: {
              isFunded,
              canCancel: !isFunded && isActive,
            },
          });
        } catch {
          // If loan fetch fails, still account the asset
        }

        if (!aggregate[tokenAddr])
          aggregate[tokenAddr] = { amount: 0, valueUSD: 0 };
        aggregate[tokenAddr].amount += amount;
        aggregate[tokenAddr].valueUSD += amount * price;
      }

      const newAssets: CollateralAsset[] = Object.entries(aggregate).map(
        ([addr, data], idx) => {
          const meta = tokenMetaByAddress[addr];
          const symbol = meta?.symbol || "Token";
          return {
            id: `${idx}`,
            symbol,
            name: symbol,
            type: symbol.startsWith("c") ? "stablecoin" : "crypto",
            balance: Number(data.amount.toFixed(6)),
            valueUSD: Number(data.valueUSD.toFixed(2)),
            priceUSD: meta?.price ?? 0,
            priceChange24h: 0,
            utilizationRatio: 0,
            maxLTV: 0.75,
            liquidationThreshold: 0.8,
            isActive: true,
            lastUpdated: new Date().toISOString(),
          };
        }
      );

      setAssets(newAssets);
      setPositions(newPositions);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to fetch collateral data"
      );
      setAssets([]);
      setPositions([]);
    } finally {
      setLoading(false);
    }
  }, [isConnected, address, collateralVault, celoLend, tokenMetaByAddress]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { assets, positions, loading, error, refresh };
}
