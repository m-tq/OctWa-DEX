import { Link } from 'react-router-dom';
import { useStore } from '@/store';
import { StatusBadge } from '@/components';
import { formatDisplayAmount, formatTimeOnly } from '@/utils/format';
import { OCT_DECIMALS, ETH_DECIMALS } from '@/config/constants';

export function SwapHistory() {
  const { swaps } = useStore();

  if (swaps.length === 0) {
    return (
      <div className="text-center py-6">
        <div className="text-muted text-sm">No swaps yet</div>
        <div className="text-muted text-xs mt-0.5">Your swap history will appear here</div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-foreground mb-2">Swap History</h3>
      <ul className="space-y-2" role="list" aria-label="Swap history">
        {swaps.map((swap) => {
          const isOctToEth = swap.direction === 'OCT_TO_ETH' || swap.payload.fromAsset === 'OCT';
          const intentId = swap.intentId || swap.id;
          
          return (
            <li key={swap.id}>
              <Link 
                to={`/intent/${intentId}`}
                className="block p-2 bg-background border border-border hover:border-primary/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <StatusBadge
                    status={
                      swap.status === 'fulfilled' ? 'success' :
                      swap.status === 'failed' ? 'error' : 'pending'
                    }
                    label={swap.status.toUpperCase()}
                  />
                  <time className="text-xs text-muted" dateTime={new Date(swap.createdAt).toISOString()}>
                    {formatTimeOnly(swap.createdAt)}
                  </time>
                </div>
                <div className="text-sm text-foreground">
                  {isOctToEth 
                    ? `${formatDisplayAmount(swap.payload.amountIn, OCT_DECIMALS)} OCT → ${formatDisplayAmount(swap.amountOut || swap.payload.minAmountOut, ETH_DECIMALS)} ETH`
                    : `${formatDisplayAmount(swap.payload.amountIn, ETH_DECIMALS)} ETH → ${formatDisplayAmount(swap.amountOut || swap.payload.minAmountOut, OCT_DECIMALS)} OCT`
                  }
                </div>
                <div className="text-xs text-muted mt-0.5 font-mono truncate">
                  ID: {intentId.slice(0, 8)}...
                </div>
                
                {swap.error && (
                  <div className="text-xs text-destructive mt-1" role="alert">{swap.error}</div>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
