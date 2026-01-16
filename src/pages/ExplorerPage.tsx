import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';

/**
 * Format display amount dengan fixed decimals
 * Handle baik string maupun number dari backend
 */
function formatDisplayAmount(value: number | string, decimals: number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';
  return num.toFixed(decimals);
}

interface SwapData {
  id: string;
  direction: 'OCT_TO_ETH' | 'ETH_TO_OCT';
  status: string;
  sourceAddress: string;
  targetAddress: string;
  sourceTxHash?: string;
  targetTxHash?: string;
  amountIn: number;
  amountOut?: number;
  createdAt: number;
  fulfilledAt?: number;
}

interface ExplorerResponse {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  stats: {
    totalSwaps: number;
    fulfilled: number;
    pending: number;
    failed: number;
  };
  swaps: SwapData[];
}

const INTENTS_API_URL = import.meta.env.VITE_INTENTS_API_URL || 'http://localhost:3456';
const POLL_INTERVAL_MS = 5000; // 5 seconds

export function ExplorerPage() {
  const [data, setData] = useState<ExplorerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [directionFilter, setDirectionFilter] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const pollIntervalRef = useRef<number | null>(null);

  const fetchExplorer = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '15' });
      if (statusFilter) params.append('status', statusFilter);
      if (directionFilter) params.append('direction', directionFilter);
      
      const response = await fetch(`${INTENTS_API_URL}/explorer?${params}`);
      if (!response.ok) throw new Error('Failed to fetch');
      const result = await response.json();
      setData(result);
      setLastUpdated(new Date());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, directionFilter]);

  // Initial fetch
  useEffect(() => {
    fetchExplorer();
  }, [fetchExplorer]);

  // Auto-refresh polling
  useEffect(() => {
    if (autoRefresh) {
      pollIntervalRef.current = window.setInterval(() => {
        fetchExplorer(false); // Don't show loading spinner for auto-refresh
      }, POLL_INTERVAL_MS);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [autoRefresh, fetchExplorer]);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'FULFILLED': return 'bg-green-500/20 text-green-400';
      case 'PENDING': return 'bg-yellow-500/20 text-yellow-400';
      case 'FAILED':
      case 'REJECTED': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <svg width="36" height="36" viewBox="0 0 50 50" fill="none">
                <circle cx="25" cy="25" r="21" stroke="#0000db" strokeWidth="6" fill="none"/>
                <circle cx="25" cy="25" r="7" fill="#0000db"/>
                <path d="M15 25L20 20M20 20L20 24" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round"/>
                <path d="M35 25L30 30M30 30L30 26" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
              <div>
                <h1 className="text-base font-bold">OCTWA DEX</h1>
                <p className="text-xs text-muted">Explorer</p>
              </div>
            </Link>
          </div>
          <Link 
            to="/" 
            className="px-3 py-1.5 text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            ← Back to Swap
          </Link>
        </div>
      </header>

      {/* Stats */}
      {data?.stats && (
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="grid grid-cols-4 gap-3">
            <div className="p-3 bg-card border border-border">
              <div className="text-2xl font-bold text-foreground">{data.stats.totalSwaps}</div>
              <div className="text-xs text-muted">Total Swaps</div>
            </div>
            <div className="p-3 bg-card border border-border">
              <div className="text-2xl font-bold text-green-400">{data.stats.fulfilled}</div>
              <div className="text-xs text-muted">Fulfilled</div>
            </div>
            <div className="p-3 bg-card border border-border">
              <div className="text-2xl font-bold text-yellow-400">{data.stats.pending}</div>
              <div className="text-xs text-muted">Pending</div>
            </div>
            <div className="p-3 bg-card border border-border">
              <div className="text-2xl font-bold text-red-400">{data.stats.failed}</div>
              <div className="text-xs text-muted">Failed</div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 pb-3">
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-2 py-1.5 text-sm bg-card border border-border text-foreground"
          >
            <option value="">All Status</option>
            <option value="FULFILLED">Fulfilled</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
          </select>
          <select
            value={directionFilter}
            onChange={(e) => { setDirectionFilter(e.target.value); setPage(1); }}
            className="px-2 py-1.5 text-sm bg-card border border-border text-foreground"
          >
            <option value="">All Directions</option>
            <option value="OCT_TO_ETH">OCT → ETH</option>
            <option value="ETH_TO_OCT">ETH → OCT</option>
          </select>
          <button
            onClick={() => fetchExplorer()}
            disabled={loading}
            className="px-3 py-1.5 text-sm bg-secondary border border-border hover:bg-secondary/80 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
          
          {/* Auto-refresh toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 text-sm border flex items-center gap-2 transition-colors ${
              autoRefresh 
                ? 'bg-green-500/20 border-green-500/50 text-green-400 hover:bg-green-500/30' 
                : 'bg-secondary border-border text-muted hover:bg-secondary/80'
            }`}
          >
            {autoRefresh && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
            )}
            {autoRefresh ? 'Live' : 'Paused'}
          </button>

          <span className="text-xs text-muted ml-auto flex items-center gap-2">
            {lastUpdated && (
              <span>Updated: {lastUpdated.toLocaleTimeString()}</span>
            )}
            {data && <span>• {data.total} swaps</span>}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="max-w-7xl mx-auto px-4 pb-4">
        <div className="bg-card border border-border overflow-hidden">
          {error ? (
            <div className="p-8 text-center text-destructive">{error}</div>
          ) : loading && !data ? (
            <div className="p-8 text-center text-muted">Loading...</div>
          ) : data?.swaps.length === 0 ? (
            <div className="p-8 text-center text-muted">No swaps found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted">Intent</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted">Time</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted">Direction</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted">Status</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted">Amount In</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted">Amount Out</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted">From</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted">To</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data?.swaps.map((swap) => {
                    const isOctToEth = swap.direction === 'OCT_TO_ETH';
                    
                    return (
                      <tr key={swap.id} className="hover:bg-secondary/30">
                        <td className="px-3 py-2">
                          <Link 
                            to={`/intent/${swap.id}`}
                            className="text-xs text-primary hover:underline font-mono"
                          >
                            {swap.id.slice(0, 8)}...
                          </Link>
                        </td>
                        <td className="px-3 py-2 text-xs text-muted whitespace-nowrap">
                          {formatTime(swap.createdAt)}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`text-xs px-1.5 py-0.5 ${isOctToEth ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                            {isOctToEth ? 'OCT→ETH' : 'ETH→OCT'}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span className={`text-xs px-1.5 py-0.5 ${getStatusColor(swap.status)}`}>
                            {swap.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">
                          {formatDisplayAmount(swap.amountIn, isOctToEth ? 4 : 6)} {isOctToEth ? 'OCT' : 'ETH'}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">
                          {swap.amountOut ? `${formatDisplayAmount(swap.amountOut, isOctToEth ? 6 : 4)} ${isOctToEth ? 'ETH' : 'OCT'}` : '-'}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-muted" title={swap.sourceAddress}>
                          {truncateAddress(swap.sourceAddress)}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-muted" title={swap.targetAddress}>
                          {truncateAddress(swap.targetAddress)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="max-w-7xl mx-auto px-4 pb-6">
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="px-3 py-1 text-sm bg-secondary border border-border disabled:opacity-50 hover:bg-secondary/80"
            >
              ← Prev
            </button>
            <span className="text-sm text-muted px-3">
              Page {page} of {data.totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
              disabled={page === data.totalPages || loading}
              className="px-3 py-1 text-sm bg-secondary border border-border disabled:opacity-50 hover:bg-secondary/80"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Spacer to push footer down */}
      <div className="flex-1" />

      {/* Footer - Fixed at bottom */}
      <footer className="border-t border-border">
        <div className="max-w-7xl mx-auto px-4 py-3 text-center">
          <p className="text-xs text-muted flex items-center justify-center gap-2">
            OCTWA DEX Explorer
            {autoRefresh && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                  </span>
                  Live updates every 5s
                </span>
              </>
            )}
          </p>
        </div>
      </footer>
    </div>
  );
}
