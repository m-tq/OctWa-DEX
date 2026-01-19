import { formatDisplayAmount } from '@/utils/format';
import { OCT_DECIMALS, ETH_DECIMALS } from '@/config/constants';
import type { Quote, SwapDirection } from '@/types/intent';

interface QuoteDisplayProps {
  quote: Quote | null;
  quoteLoading: boolean;
  quoteError: string | null;
  hasLiquidity: boolean;
  direction: SwapDirection;
}

/**
 * Get price impact severity for styling
 */
function getPriceImpactSeverity(impact: number): 'low' | 'medium' | 'high' {
  if (impact < 1) return 'low';
  if (impact < 3) return 'medium';
  return 'high';
}

export function QuoteDisplay({ 
  quote, 
  quoteLoading, 
  quoteError, 
  hasLiquidity,
  direction 
}: QuoteDisplayProps) {
  const isOctToEth = direction === 'OCT_TO_ETH';
  const outputDecimals = isOctToEth ? ETH_DECIMALS : OCT_DECIMALS;
  const outputAsset = isOctToEth ? 'ETH' : 'OCT';

  if (quoteError) {
    return (
      <div 
        className="p-2 bg-destructive/10 border border-destructive/30 text-xs text-destructive"
        role="alert"
      >
        {quoteError}
      </div>
    );
  }

  if (!hasLiquidity && quote) {
    return (
      <div 
        className="p-2 bg-yellow-500/10 border border-yellow-500/30 text-xs text-yellow-400"
        role="alert"
      >
        Insufficient liquidity for this swap
      </div>
    );
  }

  if (!quote && !quoteLoading) {
    return null;
  }

  const priceImpact = quote?.priceImpact ? Number(quote.priceImpact) : 0;
  const impactSeverity = getPriceImpactSeverity(priceImpact);
  const impactColor = {
    low: 'text-green-400',
    medium: 'text-yellow-400',
    high: 'text-red-400',
  }[impactSeverity];

  // USD prices
  const hasUsd = quote?.usd && Number(quote.usd.ethPrice) > 0;
  const octUsd = hasUsd ? Number(quote.usd!.octPrice) : 0;
  const estimatedOutUsd = hasUsd ? Number(quote.usd!.estimatedOutUsd) : 0;

  return (
    <div 
      className="p-2 bg-background border border-border text-xs space-y-1"
      aria-live="polite"
      aria-busy={quoteLoading}
    >
      {quoteLoading ? (
        <div className="text-muted">Loading quote...</div>
      ) : quote ? (
        <>
          <div className="flex justify-between">
            <span className="text-muted">You receive (est.)</span>
            <div className="text-right">
              <span className="text-foreground font-medium">
                {formatDisplayAmount(quote.estimatedOut, outputDecimals)} {outputAsset}
              </span>
              {hasUsd && estimatedOutUsd > 0 && (
                <span className="text-muted ml-1">(${estimatedOutUsd.toFixed(2)})</span>
              )}
            </div>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Min. received</span>
            <span className="text-foreground">
              {formatDisplayAmount(quote.minAmountOut, outputDecimals)} {outputAsset}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Rate</span>
            <div className="text-right">
              <span className="text-foreground">
                1 {isOctToEth ? 'OCT' : 'ETH'} = {formatDisplayAmount(quote.rate, 8)} {outputAsset}
              </span>
              {hasUsd && octUsd > 0 && (
                <span className="text-muted ml-1">(OCT ≈ ${octUsd.toFixed(4)})</span>
              )}
            </div>
          </div>
          {quote.priceImpact !== undefined && (
            <div className="flex justify-between">
              <span className="text-muted">Price Impact</span>
              <span className={impactColor}>
                {priceImpact < 0.01 ? '<0.01' : priceImpact.toFixed(2)}%
                {impactSeverity === 'high' && ' ⚠️'}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted">Slippage Tolerance</span>
            <span className="text-foreground">{Number(quote.slippageBps) / 100}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Fee</span>
            <span className="text-foreground">{Number(quote.feeBps) / 100}%</span>
          </div>
        </>
      ) : null}
    </div>
  );
}
