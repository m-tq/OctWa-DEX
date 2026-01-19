import { Panel, Button, StatusBadge } from '@/components';
import { useStore } from '@/store';

interface AuthorizeStepProps {
  onAuthorize: () => void;
  loading: boolean;
}

export function AuthorizeStep({ onAuthorize, loading }: AuthorizeStepProps) {
  const { connection } = useStore();

  return (
    <Panel title="Authorize DEX">
      <div className="space-y-3">
        <StatusBadge status="success" label="CONNECTED" />
        <div className="p-2 bg-background border border-border">
          <div className="text-xs text-muted mb-0.5">Connected Address</div>
          <code className="text-xs text-foreground break-all">{connection?.walletPubKey}</code>
        </div>
        <p className="text-sm text-muted">Authorize the DEX to create swap intents.</p>
        <Button onClick={onAuthorize} loading={loading} disabled={loading}>
          {loading ? 'Authorizing...' : 'Authorize DEX'}
        </Button>
      </div>
    </Panel>
  );
}
