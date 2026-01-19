import { useState, useCallback, useEffect } from 'react';
import { useStore } from '@/store';
import { getQuote, getEthToOctQuote } from '@/sdk/intents';
import { QUOTE_DEBOUNCE_MS } from '@/config/constants';
import type { SwapDirection } from '@/types/intent';

export function useSwapQuote(swapDirection: SwapDirection) {
  const { capability, quote, quoteLoading, setQuote, setQuoteLoading } = useStore();
  
  const [amountIn, setAmountIn] = useState('');
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const fetchQuote = useCallback(
    async (amount: number) => {
      if (!capability || amount <= 0) {
        setQuote(null);
        setQuoteError(null);
        return;
      }
      
      setQuoteLoading(true);
      setQuoteError(null);
      
      try {
        const newQuote = swapDirection === 'OCT_TO_ETH' 
          ? await getQuote(amount)
          : await getEthToOctQuote(amount);
        setQuote(newQuote);
        setQuoteError(null);
      } catch (err) {
        setQuote(null);
        const errorMsg = err instanceof Error ? err.message : 'Failed to get quote';
        setQuoteError(errorMsg);
      } finally {
        setQuoteLoading(false);
      }
    },
    [capability, swapDirection, setQuote, setQuoteLoading]
  );

  // Debounced quote fetching
  useEffect(() => {
    const amount = parseFloat(amountIn);
    if (amount > 0) {
      const debounce = setTimeout(() => fetchQuote(amount), QUOTE_DEBOUNCE_MS);
      return () => clearTimeout(debounce);
    } else {
      setQuote(null);
    }
  }, [amountIn, fetchQuote, setQuote]);

  // Reset when direction changes
  useEffect(() => {
    setAmountIn('');
    setQuote(null);
    setQuoteError(null);
  }, [swapDirection, setQuote]);

  const hasLiquidity = quote?.liquidity?.sufficient ?? true;

  return {
    amountIn,
    setAmountIn,
    quote,
    quoteLoading,
    quoteError,
    hasLiquidity,
    fetchQuote,
  };
}
