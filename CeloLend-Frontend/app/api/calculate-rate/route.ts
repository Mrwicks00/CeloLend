// app/api/calculate-rate/route.ts
import { NextRequest, NextResponse } from "next/server";

interface RateRequest {
  creditScore: number;
  loanAmount: number;
  loanTerm: number; // in months
  collateralRatio: number;
  collateralType: string;
}

class InterestRateCalculator {
  // Platform parameters (tune these for your strategy)
  private baseRate = 8.0; // 8% base annual rate
  private alpha = 15.0; // Credit score impact coefficient
  private beta = 2.0; // Loan term coefficient
  private gamma = 5.0; // Market conditions coefficient
  private delta = 3.0; // Collateral ratio coefficient

  // Market state (in production, fetch from external sources)
  private utilizationRate = 0.65; // 65% platform utilization
  private marketVolatility = 0.1; // 10% volatility factor

  calculateInterestRate(data: RateRequest): number {
    const {
      creditScore, // 0-100
      loanAmount, // in tokens
      loanTerm, // in months
      collateralRatio, // collateral value / loan amount
      collateralType,
    } = data;

    // 1. Normalize credit score (0-1, where 1 is best)
    const normalizedCreditScore = Math.min(creditScore / 100, 1);

    // 2. Credit risk component - lower credit score = higher rate
    const creditRiskRate = this.alpha * (1 - normalizedCreditScore);

    // 3. Term risk component - longer terms = higher rate
    const termRiskRate = this.beta * Math.log(1 + loanTerm / 12);

    // 4. Market conditions - utilization rate affects pricing
    const marketRate = this.gamma * this.utilizationRate;

    // 5. Collateral adjustment - better collateral = lower rate
    const collateralDiscount = this._getCollateralDiscount(
      collateralType,
      collateralRatio
    );

    // 6. Loan size adjustment - larger loans may get better rates
    const sizeAdjustment = this._getLoanSizeAdjustment(loanAmount);

    // Calculate final rate
    let finalRate =
      this.baseRate +
      creditRiskRate +
      termRiskRate +
      marketRate -
      collateralDiscount +
      sizeAdjustment;

    // Apply volatility factor
    finalRate += (Math.random() - 0.5) * this.marketVolatility;

    // Ensure reasonable bounds (2% minimum, 50% maximum)
    finalRate = Math.max(2.0, Math.min(50.0, finalRate));

    return Math.round(finalRate * 100) / 100; // Round to 2 decimal places
  }

  private _getCollateralDiscount(
    collateralType: string,
    ratio: number
  ): number {
    // Different collateral types have different risk profiles
    const collateralRiskFactors: { [key: string]: number } = {
      XLO: 1.0, // Native token (testnet), lowest risk
      CELO: 1.0, // Native token (mainnet), lowest risk
      cUSD: 0.8, // Mento stablecoin, low risk
      cEUR: 0.9, // Mento stablecoin, low risk
      cREAL: 0.85, // Mento stablecoin, low risk
      USDC: 0.75, // USDC stablecoin, very low risk
      NATIVE: 1.0, // Native token (address(0)), lowest risk
    };

    const riskFactor = collateralRiskFactors[collateralType] || 1.0;

    // Enhanced collateral discount - more aggressive reduction for higher ratios
    let baseDiscount = 0;
    
    if (ratio >= 1.5) { // 150% minimum
      // Base discount for meeting minimum
      baseDiscount = this.delta * 0.5; // 1.5% base discount
      
      // Additional discount for higher collateral
      const excessRatio = ratio - 1.5;
      
      if (excessRatio > 0) {
        // Up to 3% additional discount for very high collateral
        const additionalDiscount = Math.min(3.0, excessRatio * 6); // 6% discount per 1 ratio point above 1.5
        baseDiscount += additionalDiscount;
      }
    }

    return Math.max(0, baseDiscount / riskFactor);
  }

  private _getLoanSizeAdjustment(amount: number): number {
    // Larger loans get slightly better rates (economies of scale)
    if (amount >= 10000) return -0.5; // -0.5% for loans >= 10K
    if (amount >= 5000) return -0.25; // -0.25% for loans >= 5K
    if (amount >= 1000) return 0; // No adjustment for medium loans
    return 0.5; // +0.5% for small loans < 1K
  }

  // Get rate breakdown for transparency
  getRateBreakdown(data: RateRequest) {
    const normalizedCreditScore = Math.min(data.creditScore / 100, 1);
    const creditRiskRate = this.alpha * (1 - normalizedCreditScore);
    const termRiskRate = this.beta * Math.log(1 + data.loanTerm / 12);
    const marketRate = this.gamma * this.utilizationRate;
    const collateralDiscount = this._getCollateralDiscount(
      data.collateralType,
      data.collateralRatio
    );
    const sizeAdjustment = this._getLoanSizeAdjustment(data.loanAmount);

    return {
      baseRate: this.baseRate,
      creditRisk: creditRiskRate,
      termRisk: termRiskRate,
      marketConditions: marketRate,
      collateralDiscount: -collateralDiscount,
      sizeAdjustment: sizeAdjustment,
      finalRate: this.calculateInterestRate(data),
    };
  }
}

const calculator = new InterestRateCalculator();

export async function POST(request: NextRequest) {
  try {
    const body: RateRequest = await request.json();

    // Validate input
    if (
      !body.creditScore ||
      !body.loanAmount ||
      !body.loanTerm ||
      !body.collateralRatio
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (body.creditScore < 0 || body.creditScore > 100) {
      return NextResponse.json(
        { error: "Credit score must be between 0 and 100" },
        { status: 400 }
      );
    }

    // Calculate interest rate
    const interestRate = calculator.calculateInterestRate(body);
    const breakdown = calculator.getRateBreakdown(body);

    return NextResponse.json({
      success: true,
      interestRate,
      rateInBasisPoints: Math.round(interestRate * 100), // For smart contract
      breakdown,
      calculatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error calculating interest rate:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET method for health check
export async function GET() {
  return NextResponse.json({
    message: "Interest Rate API is running",
    timestamp: new Date().toISOString(),
  });
}
