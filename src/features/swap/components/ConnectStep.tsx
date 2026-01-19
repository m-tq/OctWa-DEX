import { Panel, Button } from '@/components';

interface ConnectStepProps {
  onConnect: () => void;
  loading: boolean;
}

export function ConnectStep({ onConnect, loading }: ConnectStepProps) {
  return (
    <Panel title="Connect Wallet">
      <div className="space-y-3">
        <p className="text-sm text-muted">Connect your Octra wallet to access the DEX.</p>
        <div className="p-2 bg-background border border-border text-xs text-muted">
          <p className="font-medium text-foreground mb-1">About Intent-based Swaps:</p>
          <ul className="space-y-0.5" role="list">
            <li>• Sign a swap intent (not a transaction)</li>
            <li>• Swap OCT ⇄ ETH bidirectionally</li>
            <li>• Assets escrowed until delivery confirmed</li>
          </ul>
        </div>
        <Button onClick={onConnect} loading={loading} disabled={loading}>
          {loading ? 'Connecting...' : 'Connect Wallet'}
        </Button>
      </div>
    </Panel>
  );
}
