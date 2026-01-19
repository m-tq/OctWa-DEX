interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div 
      className={`animate-pulse bg-secondary/50 ${className}`}
      aria-hidden="true"
    />
  );
}

export function SkeletonText({ lines = 1, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
          key={i} 
          className={`h-4 ${i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full'}`} 
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = '' }: SkeletonProps) {
  return (
    <div className={`bg-card border border-border p-4 ${className}`} aria-hidden="true">
      <Skeleton className="h-4 w-1/3 mb-3" />
      <Skeleton className="h-8 w-full mb-2" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

export function SwapFormSkeleton() {
  return (
    <div className="space-y-3" aria-label="Loading swap form">
      <div className="bg-card border border-border p-4">
        <Skeleton className="h-4 w-24 mb-3" />
        <div className="flex gap-2">
          <Skeleton className="flex-1 h-10" />
          <Skeleton className="w-16 h-10" />
        </div>
      </div>
      <div className="flex justify-center">
        <Skeleton className="w-8 h-8" />
      </div>
      <div className="bg-card border border-border p-4">
        <Skeleton className="h-4 w-24 mb-3" />
        <Skeleton className="h-10 w-full" />
      </div>
      <Skeleton className="h-10 w-full" />
    </div>
  );
}
