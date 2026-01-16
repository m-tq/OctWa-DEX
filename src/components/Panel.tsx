import { ReactNode } from 'react';

interface PanelProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export function Panel({ title, children, className = '' }: PanelProps) {
  return (
    <div className={`bg-card border border-border ${className}`}>
      <div className="px-3 py-2 border-b border-border">
        <h2 className="text-sm font-medium text-foreground uppercase tracking-wider">{title}</h2>
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}
