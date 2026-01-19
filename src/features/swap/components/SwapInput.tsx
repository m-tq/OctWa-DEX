import { formatDisplayAmount } from '@/utils/format';
import { OCT_DECIMALS, ETH_DECIMALS } from '@/config/constants';

interface SwapInputProps {
  label: string;
  chainLabel: string;
  asset: 'OCT' | 'ETH';
  value: string;
  onChange?: (value: string) => void;
  balance: number;
  balanceLoading: boolean;
  onRefreshBalance?: () => void;
  onMax?: () => void;
  disabled?: boolean;
  readOnly?: boolean;
}

export function SwapInput({
  label,
  chainLabel,
  asset,
  value,
  onChange,
  balance,
  balanceLoading,
  onRefreshBalance,
  onMax,
  disabled,
  readOnly,
}: SwapInputProps) {
  const decimals = asset === 'OCT' ? OCT_DECIMALS : ETH_DECIMALS;
  const inputId = `swap-input-${asset.toLowerCase()}`;

  return (
    <div className="p-3 bg-background border-b border-border">
      <div className="flex justify-between mb-1">
        <label htmlFor={inputId} className="text-xs text-muted">
          {label} ({chainLabel})
        </label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted" aria-live="polite">
            Bal: {balanceLoading ? '...' : formatDisplayAmount(balance, decimals)}
          </span>
          {onRefreshBalance && (
            <button
              type="button"
              onClick={onRefreshBalance}
              disabled={balanceLoading}
              className="text-muted hover:text-foreground disabled:opacity-50"
              title="Refresh balance"
              aria-label="Refresh balance"
            >
              <svg 
                className={`w-3 h-3 ${balanceLoading ? 'animate-spin' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}
        </div>
      </div>
      <div className="flex gap-2 items-center">
        <input
          id={inputId}
          type="number"
          value={value}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          placeholder="0.0"
          min="0"
          step="0.000001"
          disabled={disabled}
          readOnly={readOnly}
          aria-describedby={`${inputId}-balance`}
          className="flex-1 bg-transparent text-lg font-bold text-foreground outline-none border-none focus:ring-0 disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <span className="text-sm font-medium text-foreground px-2 py-0.5 bg-secondary">
          {asset}
        </span>
      </div>
      {onMax && !readOnly && (
        <button
          type="button"
          onClick={onMax}
          disabled={disabled}
          className="text-xs text-primary mt-1 hover:underline disabled:opacity-50"
        >
          MAX
        </button>
      )}
      <span id={`${inputId}-balance`} className="sr-only">
        Available balance: {formatDisplayAmount(balance, decimals)} {asset}
      </span>
    </div>
  );
}
