import type { SwapStatus as SwapStatusType, SwapDirection } from '@/types/intent';

interface SwapStatusProps {
  status: SwapStatusType;
  direction: SwapDirection;
}

const statusLabels: Record<SwapDirection, Record<SwapStatusType, string>> = {
  OCT_TO_ETH: {
    idle: '',
    quoting: 'Getting quote...',
    signing: 'Signing Intent...',
    sending: 'Sending OCT to Escrow...',
    confirming: 'Waiting for Octra Confirmation...',
    submitting: 'Submitting to Backend...',
    polling: 'Waiting for ETH...',
    fulfilled: 'Completed!',
    failed: 'Failed',
  },
  ETH_TO_OCT: {
    idle: '',
    quoting: 'Getting quote...',
    signing: 'Signing Intent...',
    sending: 'Sending ETH to Escrow...',
    confirming: 'Waiting for Sepolia Confirmation...',
    submitting: 'Submitting to Backend...',
    polling: 'Waiting for OCT...',
    fulfilled: 'Completed!',
    failed: 'Failed',
  },
};

export function SwapStatus({ status, direction }: SwapStatusProps) {
  const label = statusLabels[direction][status];
  
  if (!label) return null;

  const isSuccess = status === 'fulfilled';
  const isError = status === 'failed';
  const isPending = !isSuccess && !isError;

  return (
    <div 
      className={`p-3 border text-sm flex items-center gap-2 ${
        isSuccess 
          ? 'bg-green-500/10 border-green-500/30 text-green-400'
          : isError
          ? 'bg-destructive/10 border-destructive/30 text-destructive'
          : 'bg-primary/10 border-primary/30 text-primary'
      }`}
      role="status"
      aria-live="polite"
    >
      {isPending && (
        <svg 
          className="animate-spin w-4 h-4" 
          viewBox="0 0 24 24" 
          fill="none"
          aria-hidden="true"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {isSuccess && <span aria-hidden="true">✓</span>}
      {isError && <span aria-hidden="true">✗</span>}
      <span>{label}</span>
    </div>
  );
}
