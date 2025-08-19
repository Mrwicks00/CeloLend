import { ethers } from "ethers";

// Token addresses for Celo/Alfajores
export const TOKEN_ADDRESSES = {
  alfajores: {
    CELO: "0x0000000000000000000000000000000000000000", // Native token
    cUSD: "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1",
    cEUR: "0x10c892A6EC43a53E45D0B916B4b7D383B1b78C0F",
    cREAL: "0xE4D517785D091D3c54818832dB6094bcc2744545",
  },
  celo: {
    CELO: "0x0000000000000000000000000000000000000000",
    cUSD: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
    cEUR: "0xD8763CBa276a3738E6DE85b4b3b5F1d2D7fC3F5d",
    cREAL: "0xe8537a3d056DA446677B9E9d6c5dB704Eaab4787",
  },
};

// Token symbols mapping
export const TOKEN_SYMBOLS = {
  "0x0000000000000000000000000000000000000000": "CELO",
  "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1": "cUSD",
  "0x10c892A6EC43a53E45D0B916B4b7D383B1b78C0F": "cEUR",
  "0xE4D517785D091D3c54818832dB6094bcc2744545": "cREAL",
  "0x765DE816845861e75A25fCA122bb6898B8B1282a": "cUSD",
  "0xD8763CBa276a3738E6DE85b4b3b5F1d2D7fC3F5d": "cEUR",
  "0xe8537a3d056DA446677B9E9d6c5dB704Eaab4787": "cREAL",
};

// Token decimals
export const TOKEN_DECIMALS = {
  CELO: 18,
  cUSD: 18,
  cEUR: 18,
  cREAL: 18,
};

// Format bigint to human readable string
export function formatTokenAmount(
  amount: bigint,
  tokenAddress: string,
  decimals: number = 18
): string {
  const symbol =
    TOKEN_SYMBOLS[tokenAddress as keyof typeof TOKEN_SYMBOLS] || "Unknown";
  const formattedAmount = ethers.formatUnits(amount, decimals);

  // Format with appropriate decimal places
  const num = parseFloat(formattedAmount);
  if (num >= 1000) {
    return `${num.toLocaleString(undefined, {
      maximumFractionDigits: 2,
    })} ${symbol}`;
  } else if (num >= 1) {
    return `${num.toFixed(2)} ${symbol}`;
  } else {
    return `${num.toFixed(6)} ${symbol}`;
  }
}

// Format USD value
export function formatUSDValue(amount: bigint, decimals: number = 18): string {
  const formattedAmount = ethers.formatUnits(amount, decimals);
  const num = parseFloat(formattedAmount);
  return `$${num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// Format percentage
export function formatPercentage(rate: bigint, decimals: number = 2): string {
  const percentage = Number(ethers.formatUnits(rate, 2)); // Assuming rate is in basis points
  return `${percentage.toFixed(decimals)}%`;
}

// Format interest rate from basis points
export function formatInterestRate(rateBps: bigint): string {
  const rate = Number(ethers.formatUnits(rateBps, 2));
  return `${rate.toFixed(2)}%`;
}

// Format address for display
export function formatAddress(address: string, length: number = 6): string {
  if (!address) return "Unknown";
  return `${address.slice(0, length)}...${address.slice(-length)}`;
}

// Calculate days remaining from timestamp
export function calculateDaysRemaining(endTime: bigint): number {
  const now = BigInt(Math.floor(Date.now() / 1000));
  const remaining = Number(endTime - now);
  return Math.max(0, Math.ceil(remaining / 86400)); // 86400 seconds in a day
}

// Calculate health factor (simplified)
export function calculateHealthFactor(
  collateralValue: bigint,
  borrowedAmount: bigint,
  liquidationThreshold: number = 0.8
): number {
  if (borrowedAmount === BigInt(0)) return 999; // No debt
  const ratio = Number(collateralValue) / Number(borrowedAmount);
  return ratio / liquidationThreshold;
}

// Get health factor status
export function getHealthFactorStatus(healthFactor: number): {
  status: "safe" | "moderate" | "at-risk";
  color: string;
  label: string;
} {
  if (healthFactor >= 2.0) {
    return { status: "safe", color: "text-green-400", label: "Safe" };
  } else if (healthFactor >= 1.5) {
    return { status: "moderate", color: "text-yellow-400", label: "Moderate" };
  } else {
    return { status: "at-risk", color: "text-red-400", label: "At Risk" };
  }
}

// Calculate earned interest
export function calculateEarnedInterest(
  principal: bigint,
  rateBps: bigint,
  startTime: bigint,
  endTime?: bigint
): bigint {
  const now = endTime || BigInt(Math.floor(Date.now() / 1000));
  const timeElapsed = now - startTime;

  // Interest = Principal * Rate * Time / (365 days * 10000 basis points)
  const interest =
    (principal * rateBps * timeElapsed) / (BigInt(365) * BigInt(24) * BigInt(3600) * BigInt(10000));
  return interest;
}

// Validate loan amount
export function validateLoanAmount(
  amount: string,
  minAmount: bigint,
  maxAmount: bigint
): {
  isValid: boolean;
  error?: string;
} {
  try {
    const amountBigInt = ethers.parseEther(amount);

    if (amountBigInt < minAmount) {
      return {
        isValid: false,
        error: `Minimum loan amount is ${ethers.formatEther(minAmount)}`,
      };
    }

    if (amountBigInt > maxAmount) {
      return {
        isValid: false,
        error: `Maximum loan amount is ${ethers.formatEther(maxAmount)}`,
      };
    }

    return { isValid: true };
  } catch {
    return { isValid: false, error: "Invalid amount" };
  }
}

// Get token info
export function getTokenInfo(tokenAddress: string) {
  const symbol = TOKEN_SYMBOLS[tokenAddress as keyof typeof TOKEN_SYMBOLS];
  const decimals = symbol
    ? TOKEN_DECIMALS[symbol as keyof typeof TOKEN_DECIMALS]
    : 18;

  return {
    symbol,
    decimals,
    address: tokenAddress,
  };
}

// Parse loan request from contract
export function parseLoanRequest(loanData: any) {
  return {
    id: Number(loanData.id),
    borrower: loanData.borrower,
    amount: loanData.amount,
    tokenAddress: loanData.tokenAddress,
    interestRate: loanData.interestRate,
    duration: loanData.duration,
    collateralAmount: loanData.collateralAmount,
    collateralToken: loanData.collateralToken,
    isActive: loanData.isActive,
    isFunded: loanData.isFunded,
    createdAt: loanData.createdAt,
  };
}

// Credit score utilities
export function getCreditScoreTier(score: number): {
  tier: 'excellent' | 'good' | 'fair' | 'poor' | 'very-poor'
  label: string
  color: string
  description: string
} {
  if (score >= 90) {
    return {
      tier: 'excellent',
      label: 'Excellent',
      color: 'bg-green-500/10 text-green-400',
      description: 'Consistent successful borrower with no defaults'
    }
  }
  if (score >= 75) {
    return {
      tier: 'good',
      label: 'Good',
      color: 'bg-blue-500/10 text-blue-400',
      description: 'Mostly successful with few or no defaults'
    }
  }
  if (score >= 50) {
    return {
      tier: 'fair',
      label: 'Fair',
      color: 'bg-yellow-500/10 text-yellow-400',
      description: 'New user or mixed repayment history'
    }
  }
  if (score >= 25) {
    return {
      tier: 'poor',
      label: 'Poor',
      color: 'bg-orange-500/10 text-orange-400',
      description: 'Some defaults affecting score'
    }
  }
  return {
    tier: 'very-poor',
    label: 'Very Poor',
    color: 'bg-red-500/10 text-red-400',
    description: 'Multiple defaults, high risk'
  }
}

// Calculate credit score based on loan history (for display purposes)
export function calculateDisplayCreditScore(
  completedLoans: number,
  defaultedLoans: number,
  baseScore: number = 50
): number {
  // This is a simplified calculation for display
  // The actual calculation happens on-chain in the CreditScore contract
  
  let score = baseScore;
  
  // Add points for successful loans
  score += completedLoans * 5;
  
  // Subtract points for defaults
  score -= defaultedLoans * 15;
  
  // Ensure score stays within bounds
  return Math.max(0, Math.min(100, score));
}
