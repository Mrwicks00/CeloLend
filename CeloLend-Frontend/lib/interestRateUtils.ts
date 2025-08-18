// lib/interestRateUtils.ts
export interface LoanParameters {
    creditScore: number;
    loanAmount: number;
    loanTerm: number; // in months
    collateralRatio: number;
    collateralType: string;
  }
  
  export interface RateResponse {
    success: boolean;
    interestRate: number;
    rateInBasisPoints: number;
    breakdown: {
      baseRate: number;
      creditRisk: number;
      termRisk: number;
      marketConditions: number;
      collateralDiscount: number;
      sizeAdjustment: number;
      finalRate: number;
    };
    calculatedAt: string;
  }
  
  export async function calculateInterestRate(params: LoanParameters): Promise<RateResponse> {
    try {
      const response = await fetch('/api/calculate-rate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const data: RateResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Error calculating interest rate:', error);
      throw new Error('Failed to calculate interest rate');
    }
  }
  
  // Format interest rate for display
  export function formatInterestRate(rate: number): string {
    return `${rate.toFixed(2)}%`;
  }
  
  // Convert annual rate to monthly rate
  export function getMonthlyRate(annualRate: number): number {
    return annualRate / 12;
  }
  
  // Calculate monthly payment amount
  export function calculateMonthlyPayment(
    principal: number,
    annualRate: number,
    termInMonths: number
  ): number {
    const monthlyRate = annualRate / 100 / 12;
    const payment = principal * 
      (monthlyRate * Math.pow(1 + monthlyRate, termInMonths)) /
      (Math.pow(1 + monthlyRate, termInMonths) - 1);
    
    return payment;
  }
  
  // Calculate total interest over loan term
  export function calculateTotalInterest(
    principal: number,
    annualRate: number,
    termInMonths: number
  ): number {
    const monthlyPayment = calculateMonthlyPayment(principal, annualRate, termInMonths);
    const totalPayments = monthlyPayment * termInMonths;
    return totalPayments - principal;
  }
  
  // Get risk level based on interest rate
  export function getRiskLevel(interestRate: number): {
    level: string;
    color: string;
    description: string;
  } {
    if (interestRate <= 8) {
      return {
        level: 'Low',
        color: 'green',
        description: 'Excellent credit profile'
      };
    } else if (interestRate <= 15) {
      return {
        level: 'Medium',
        color: 'yellow',
        description: 'Good credit profile'
      };
    } else if (interestRate <= 25) {
      return {
        level: 'High',
        color: 'orange',
        description: 'Fair credit profile'
      };
    } else {
      return {
        level: 'Very High',
        color: 'red',
        description: 'Poor credit profile'
      };
    }
  }
  