import { useState, useEffect } from 'react';
import { LoanParameters } from '../lib/interestRateUtils';
import {useInterestRate} from "./useInterestRate"

export function useDynamicRate(params: LoanParameters | null, debounceMs: number = 1000) {
  const { rate, loading, calculateRate } = useInterestRate();
  const [debouncedParams, setDebouncedParams] = useState(params);

  // Debounce parameter changes
  useEffect(() => {
    if (!params) return;

    const timer = setTimeout(() => {
      setDebouncedParams(params);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [params, debounceMs]);

  // Calculate rate when debounced params change
  useEffect(() => {
    if (debouncedParams && 
        debouncedParams.creditScore > 0 && 
        debouncedParams.loanAmount > 0 && 
        debouncedParams.loanTerm > 0 &&
        debouncedParams.collateralRatio > 0) {
      calculateRate(debouncedParams);
    }
  }, [debouncedParams, calculateRate]);

  return { rate, loading };
}