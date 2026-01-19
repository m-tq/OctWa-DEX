import type { SwapDirection } from '@/types/intent';

interface DirectionToggleProps {
  direction: SwapDirection;
  onChange: (direction: SwapDirection) => void;
  disabled?: boolean;
}

export function DirectionToggle({ direction, onChange, disabled }: DirectionToggleProps) {
  return (
    <div 
      className="flex gap-1 p-1 bg-secondary rounded" 
      role="tablist" 
      aria-label="Swap direction"
    >
      <button
        role="tab"
        aria-selected={direction === 'OCT_TO_ETH'}
        onClick={() => onChange('OCT_TO_ETH')}
        disabled={disabled}
        className={`flex-1 py-1.5 px-2 text-sm font-medium rounded transition-colors ${
          direction === 'OCT_TO_ETH' 
            ? 'bg-background text-foreground shadow' 
            : 'text-muted hover:text-foreground'
        } disabled:opacity-50`}
      >
        OCT → ETH
      </button>
      <button
        role="tab"
        aria-selected={direction === 'ETH_TO_OCT'}
        onClick={() => onChange('ETH_TO_OCT')}
        disabled={disabled}
        className={`flex-1 py-1.5 px-2 text-sm font-medium rounded transition-colors ${
          direction === 'ETH_TO_OCT' 
            ? 'bg-background text-foreground shadow' 
            : 'text-muted hover:text-foreground'
        } disabled:opacity-50`}
      >
        ETH → OCT
      </button>
    </div>
  );
}
