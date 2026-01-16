import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getOctraTxUrl, getSepoliaTxUrl } from '../config';

interface IntentDetail {
  intentId: string;
  direction: 'OCT_TO_ETH' | 'ETH_TO_OCT';
  status: string;
  sourceAddress: string;
  targetAddress: string;
  sourceTxHash?: string;
  targetTxHash?: string;
  amountIn: number;
  amountOut?: number;
}

const INTENTS_API_URL = import.meta.env.VITE_INTENTS_API_URL || 'http://localhost:3456';

export function IntentDetailPage() {
  const { intentId } = useParams<{ intentId: string }>();
  const [intent, setIntent] = useState<IntentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchIntent = async () => {
      if (!intentId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`${INTENTS_API_URL}/swap/${intentId}`);
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Intent not found');
          }
          throw new Error('Failed to fetch intent');
        }
        const data = await response.json();
        setIntent(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchIntent();
  }, [intentId]);

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'FULFILLED': return 'bg-green-500 text-white';
      case 'PENDING': case 'OPEN': return 'bg-yellow-500 text-black';
      case 'FAILED': case 'REJECTED': return 'bg-red-500 text-white';
      case 'EXPIRED': return 'bg-gray-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const isOctToEth = intent?.direction === 'OCT_TO_ETH';
  const sourceLabel = isOctToEth ? 'OCT' : 'ETH';
  const targetLabel = isOctToEth ? 'ETH' : 'OCT';
  const sourceChain = isOctToEth ? 'Octra' : 'Sepolia';
  const targetChain = isOctToEth ? 'Sepolia' : 'Octra';
  const sourceTxUrl = intent?.sourceTxHash 
    ? (isOctToEth ? getOctraTxUrl(intent.sourceTxHash) : getSepoliaTxUrl(intent.sourceTxHash))
    : null;
  const targetTxUrl = intent?.targetTxHash
    ? (isOctToEth ? getSepoliaTxUrl(intent.targetTxHash) : getOctraTxUrl(intent.targetTxHash))
    : null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <svg width="36" height="36" viewBox="0 0 50 50" fill="none">
                <circle cx="25" cy="25" r="21" stroke="#0000db" strokeWidth="6" fill="none"/>
                <circle cx="25" cy="25" r="7" fill="#0000db"/>
              </svg>
              <div>
                <h1 className="text-base font-bold">OCTWA DEX</h1>
                <p className="text-xs text-muted">Intent Details</p>
              </div>
            </Link>
          </div>
          <div className="flex gap-2">
            <Link 
              to="/explorer" 
              className="px-3 py-1.5 text-sm bg-secondary border border-border hover:bg-secondary/80 transition-colors"
            >
              Explorer
            </Link>
            <Link 
              to="/" 
              className="px-3 py-1.5 text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Swap
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-3 text-muted">Loading intent...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">❌</div>
            <p className="text-destructive font-medium">{error}</p>
            <Link to="/explorer" className="text-primary hover:underline text-sm mt-2 inline-block">
              ← Back to Explorer
            </Link>
          </div>
        ) : intent ? (
          <div className="space-y-6">
            {/* Intent ID & Status */}
            <div className="text-center">
              <div className="text-xs text-muted mb-1">Intent ID</div>
              <div className="font-mono text-sm bg-card border border-border px-4 py-2 inline-block">
                {intent.intentId}
              </div>
              <div className="mt-3">
                <span className={`px-3 py-1 text-sm font-medium ${getStatusColor(intent.status)}`}>
                  {intent.status}
                </span>
              </div>
            </div>

            {/* Visual Flow */}
            <div className="bg-card border border-border p-6">
              <div className="flex items-center justify-between gap-4">
                {/* Source */}
                <div className="flex-1 text-center">
                  <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center text-2xl font-bold ${
                    isOctToEth ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
                  }`}>
                    {sourceLabel}
                  </div>
                  <div className="mt-2 text-lg font-bold">
                    {intent.amountIn.toFixed(isOctToEth ? 4 : 6)} {sourceLabel}
                  </div>
                  <div className="text-xs text-muted">{sourceChain}</div>
                </div>

                {/* Arrow */}
                <div className="flex flex-col items-center gap-1">
                  <div className="text-3xl text-primary">→</div>
                  <div className="text-xs text-muted">Swap</div>
                </div>

                {/* Target */}
                <div className="flex-1 text-center">
                  <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center text-2xl font-bold ${
                    isOctToEth ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {targetLabel}
                  </div>
                  <div className="mt-2 text-lg font-bold">
                    {intent.amountOut ? `${intent.amountOut.toFixed(isOctToEth ? 6 : 4)} ${targetLabel}` : '—'}
                  </div>
                  <div className="text-xs text-muted">{targetChain}</div>
                </div>
              </div>
            </div>

            {/* Transaction Details */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Source Transaction */}
              <div className={`p-4 border ${intent.sourceTxHash ? 'bg-green-500/5 border-green-500/30' : 'bg-card border-border'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                    intent.sourceTxHash ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'
                  }`}>
                    {intent.sourceTxHash ? '✓' : '1'}
                  </div>
                  <div className="font-medium">Source Transaction</div>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted">Chain:</span>
                    <span className="ml-2">{sourceChain}</span>
                  </div>
                  <div>
                    <span className="text-muted">From:</span>
                    <div className="font-mono text-xs mt-1 break-all">{intent.sourceAddress}</div>
                  </div>
                  <div>
                    <span className="text-muted">Amount:</span>
                    <span className="ml-2 font-medium">{intent.amountIn.toFixed(isOctToEth ? 4 : 6)} {sourceLabel}</span>
                  </div>
                  {intent.sourceTxHash ? (
                    <div>
                      <span className="text-muted">Tx Hash:</span>
                      <a 
                        href={sourceTxUrl || '#'} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="block font-mono text-xs mt-1 text-primary hover:underline break-all"
                      >
                        {intent.sourceTxHash}
                        <svg className="w-3 h-3 inline-block ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  ) : (
                    <div className="text-muted italic">Pending...</div>
                  )}
                </div>
              </div>

              {/* Target Transaction */}
              <div className={`p-4 border ${intent.targetTxHash ? 'bg-green-500/5 border-green-500/30' : 'bg-card border-border'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                    intent.targetTxHash ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'
                  }`}>
                    {intent.targetTxHash ? '✓' : '2'}
                  </div>
                  <div className="font-medium">Target Transaction</div>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted">Chain:</span>
                    <span className="ml-2">{targetChain}</span>
                  </div>
                  <div>
                    <span className="text-muted">To:</span>
                    <div className="font-mono text-xs mt-1 break-all">{intent.targetAddress}</div>
                  </div>
                  <div>
                    <span className="text-muted">Amount:</span>
                    <span className="ml-2 font-medium">
                      {intent.amountOut ? `${intent.amountOut.toFixed(isOctToEth ? 6 : 4)} ${targetLabel}` : '—'}
                    </span>
                  </div>
                  {intent.targetTxHash ? (
                    <div>
                      <span className="text-muted">Tx Hash:</span>
                      <a 
                        href={targetTxUrl || '#'} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="block font-mono text-xs mt-1 text-primary hover:underline break-all"
                      >
                        {intent.targetTxHash}
                        <svg className="w-3 h-3 inline-block ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  ) : (
                    <div className="text-muted italic">
                      {intent.status === 'FULFILLED' ? 'Processing...' : 'Waiting for fulfillment...'}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Back Link */}
            <div className="text-center pt-4">
              <Link to="/explorer" className="text-primary hover:underline text-sm">
                ← Back to Explorer
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
