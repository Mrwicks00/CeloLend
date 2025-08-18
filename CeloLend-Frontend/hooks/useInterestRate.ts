import { useState, useEffect, useCallback } from 'react';
import { calculateInterestRate, LoanParameters, RateResponse } from '../lib/interestRateUtils';

export function useInterestRate() {
  const [rate, setRate] = useState<RateResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateRate = useCallback(async (params: LoanParameters) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await calculateInterestRate(params);
      setRate(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate rate');
      setRate(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setRate(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    rate,
    loading,
    error,
    calculateRate,
    reset
  };
}