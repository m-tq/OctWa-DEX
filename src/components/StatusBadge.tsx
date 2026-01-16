interface StatusBadgeProps {
  status: 'success' | 'error' | 'pending' | 'idle';
  label: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const styles = {
    success: 'bg-primary/15 text-blue-400 border-primary/30',
    error: 'bg-destructive/15 text-red-400 border-destructive/30',
    pending: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    idle: 'bg-secondary text-muted border-border',
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium border ${styles[status]}`}>{label}</span>
  );
}
