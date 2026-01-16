import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Panel, Button, StatusBadge, Layout } from '../components';
import { useStore } from '../store';
import { connect, requestCapability, invoke, initSDK, isInstalled, parseInvokeData } from '../sdk/octra';
import { 
  getQuote, 
  getEthToOctQuote,
  createIntentPayload, 
  createEthToOctIntentPayload,
  encodeIntentPayloadAsHex,
  submitIntent, 
  submitEthToOctIntent,
  waitForFulfillment, 
  waitForOctraTxConfirmation,
  waitForSepoliaTxConfirmation,
  fetchSwapHistory,
  getSepoliaBalance
} from '../sdk/intents';
import { SWAP_CIRCLE, SWAP_METHODS, ETH_NETWORK_LABEL } from '../config';
import type { SwapRecord, SwapStatus, SwapDirection } from '../types/intent';

/**
 * Format number tanpa scientific notation (e.g., 6e-7 → "0.0000006")
 * Penting untuk mengirim amount ke wallet
 */
function formatAmount(value: number): string {
  if (value === 0) return '0';
  
  // Gunakan toFixed dengan precision tinggi
  const fixed = value.toFixed(18);
  // Hapus trailing zeros dan decimal point jika tidak perlu
  return fixed.replace(/\.?0+$/, '');
}

/**
 * Format display amount dengan fixed decimals
 * Handle baik string maupun number dari backend
 */
function formatDisplayAmount(value: number | string, decimals: number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';
  return num.toFixed(decimals);
}

interface BalanceData {
  address: string;
  balance: number;
  network: string;
}

interface SendTxResult {
  success: boolean;
  txHash: string;
  from: string;
  to: string;
  amount: number | string;
}

function SwapHistory() {
  const { swaps } = useStore();

  if (swaps.length === 0) {
    return (
      <div className="text-center py-6">
        <div className="text-muted text-sm">No swaps yet</div>
        <div className="text-muted text-xs mt-0.5">Your swap history will appear here</div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-foreground mb-2">Swap History</h3>
      {swaps.map((swap) => {
        const isOctToEth = swap.direction === 'OCT_TO_ETH' || swap.payload.fromAsset === 'OCT';
        const intentId = swap.intentId || swap.id;
        
        return (
          <Link 
            key={swap.id} 
            to={`/intent/${intentId}`}
            className="block p-2 bg-background border border-border hover:border-primary/50 transition-colors"
          >
            <div className="flex items-center justify-between mb-1">
              <StatusBadge
                status={
                  swap.status === 'fulfilled' ? 'success' :
                  swap.status === 'failed' ? 'error' : 'pending'
                }
                label={swap.status.toUpperCase()}
              />
              <span className="text-xs text-muted">
                {new Date(swap.createdAt).toLocaleTimeString()}
              </span>
            </div>
            <div className="text-sm text-foreground">
              {isOctToEth 
                ? `${formatDisplayAmount(swap.payload.amountIn, 4)} OCT → ${formatDisplayAmount(swap.amountOut || swap.payload.minAmountOut, 6)} ETH`
                : `${formatDisplayAmount(swap.payload.amountIn, 6)} ETH → ${formatDisplayAmount(swap.amountOut || swap.payload.minAmountOut, 4)} OCT`
              }
            </div>
            <div className="text-xs text-muted mt-0.5 font-mono truncate">
              ID: {intentId.slice(0, 8)}...
            </div>
            
            {swap.error && (
              <div className="text-xs text-destructive mt-1">{swap.error}</div>
            )}
          </Link>
        );
      })}
    </div>
  );
}

export function SwapPage() {
  const store = useStore();
  const {
    connected,
    connection,
    capability,
    derivedEvmAddress,
    octBalance,
    balanceLoading,
    quote,
    quoteLoading,
    currentSwapStatus,
    _hasHydrated,
    setConnection,
    setCapability,
    setDerivedEvmAddress,
    setOctBalance,
    setBalanceLoading,
    setQuote,
    setQuoteLoading,
    setCurrentSwapStatus,
    addSwap,
    updateSwap,
    setSwaps,
    addError,
  } = store;

  const [loading, setLoading] = useState(false);
  const [amountIn, setAmountIn] = useState('');
  const [step, setStep] = useState<'connect' | 'authorize' | 'swap'>('connect');
  const [swapDirection, setSwapDirection] = useState<SwapDirection>('OCT_TO_ETH');
  const [ethBalance, setEthBalance] = useState<number | null>(null);
  const [ethBalanceLoading, setEthBalanceLoading] = useState(false);
  const [sdkInitialized, setSdkInitialized] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const initRef = useRef(false);

  // Initialize SDK on mount and restore Circle connection if persisted
  useEffect(() => {
    // Prevent double initialization in React StrictMode
    if (initRef.current) return;
    
    const initializeSDK = async () => {
      if (!_hasHydrated) return; // Wait for store hydration
      
      initRef.current = true;
      
      try {
        await initSDK();
        console.log('[SwapPage] SDK initialized, origin:', window.location.origin);
        
        // If we have persisted connection, reconnect to Circle
        if (connection?.circle) {
          console.log('[SwapPage] Restoring Circle connection:', connection.circle);
          try {
            await connect(connection.circle);
            console.log('[SwapPage] Circle connection restored');
            
            // Auto-request capability if not present (capability is not persisted)
            if (!capability) {
              console.log('[SwapPage] No capability, auto-requesting...');
              try {
                const cap = await requestCapability({
                  methods: [...SWAP_METHODS],
                  scope: 'write',
                  encrypted: false,
                  ttlSeconds: 7200,
                });
                setCapability(cap);
                console.log('[SwapPage] Capability obtained:', cap.id);
              } catch (capErr) {
                console.error('[SwapPage] Failed to get capability:', capErr);
                // User rejected or error - will show authorize step
              }
            }
          } catch (err) {
            console.error('[SwapPage] Failed to restore Circle connection:', err);
            // Clear persisted state if reconnect fails
            setConnection(null);
            setCapability(null);
          }
        }
        
        setSdkInitialized(true);
      } catch (err) {
        console.error('[SwapPage] Failed to initialize SDK:', err);
        initRef.current = false; // Allow retry on error
      }
    };
    
    initializeSDK();
  }, [_hasHydrated]); // Remove capability from deps to avoid re-running

  useEffect(() => {
    if (!_hasHydrated || !sdkInitialized) return; // Wait for hydration and SDK init
    
    if (!connected || connection?.circle !== SWAP_CIRCLE) {
      setStep('connect');
    } else if (!capability) {
      setStep('authorize');
    } else {
      setStep('swap');
    }
  }, [_hasHydrated, sdkInitialized, connected, connection, capability]);

  useEffect(() => {
    if (connection?.evmAddress) {
      setDerivedEvmAddress(connection.evmAddress);
    }
  }, [connection?.evmAddress, setDerivedEvmAddress]);

  const fetchOctBalance = useCallback(async () => {
    if (!capability || !sdkInitialized) return;
    console.log('[SwapPage] fetchOctBalance - capability:', capability.id, 'expiresAt:', capability.expiresAt);
    setBalanceLoading(true);
    try {
      const result = await invoke({
        capabilityId: capability.id,
        method: 'get_balance',
      });
      if (result.success && result.data) {
        const balanceData = parseInvokeData<BalanceData>(result.data);
        setOctBalance(balanceData.balance);
      }
    } catch (err) {
      const errorMsg = (err as Error).message;
      console.log('[SwapPage] fetchOctBalance error:', errorMsg);
      // If capability not found, clear it so user can re-authorize
      if (errorMsg.includes('not found') || errorMsg.includes('Capability')) {
        console.log('[SwapPage] Capability invalid, clearing for re-authorization...');
        setCapability(null);
      } else {
        addError('BALANCE_FAILED', errorMsg);
      }
    } finally {
      setBalanceLoading(false);
    }
  }, [capability, sdkInitialized, setOctBalance, setBalanceLoading, setCapability, addError]);

  // Fetch ETH balance via intents-api proxy
  const fetchEthBalance = useCallback(async () => {
    if (!derivedEvmAddress) return;
    setEthBalanceLoading(true);
    try {
      const balance = await getSepoliaBalance(derivedEvmAddress);
      setEthBalance(balance);
    } catch (err) {
      console.error('Failed to fetch ETH balance:', err);
    } finally {
      setEthBalanceLoading(false);
    }
  }, [derivedEvmAddress]);

  // Fetch swap history from backend
  const loadSwapHistory = useCallback(async () => {
    if (!connection?.walletPubKey) return;
    
    try {
      console.log('[SwapPage] Fetching swap history...');
      const history = await fetchSwapHistory(connection.walletPubKey);
      
      // Convert backend format to SwapRecord format
      const swapRecords: SwapRecord[] = history.swaps.map(s => ({
        id: s.id,
        direction: s.direction,
        payload: {
          version: 1,
          intentType: 'swap',
          fromAsset: s.payload.fromAsset as 'OCT' | 'ETH',
          toAsset: s.payload.toAsset as 'ETH' | 'OCT',
          amountIn: s.payload.amountIn,
          minAmountOut: s.payload.minAmountOut,
          targetChain: s.direction === 'OCT_TO_ETH' ? 'ethereum_sepolia' : 'octra_mainnet',
          targetAddress: s.payload.targetAddress,
          expiry: 0,
          nonce: '',
        },
        status: s.status as SwapStatus,
        sourceTxHash: s.sourceTxHash,
        targetTxHash: s.targetTxHash,
        amountOut: s.amountOut,
        createdAt: s.createdAt,
        fulfilledAt: s.fulfilledAt,
        error: s.error,
      }));
      
      setSwaps(swapRecords);
      console.log('[SwapPage] Loaded', swapRecords.length, 'swaps from history');
    } catch (err) {
      console.error('[SwapPage] Failed to load swap history:', err);
    }
  }, [connection?.walletPubKey, setSwaps]);

  // Check liquidity from quote response
  const quoteLiquidity = quote?.liquidity;
  const hasLiquidity = quoteLiquidity?.sufficient ?? true;

  useEffect(() => {
    if (capability && sdkInitialized) {
      fetchOctBalance();
      fetchEthBalance();
      loadSwapHistory();
    }
  }, [capability, sdkInitialized, fetchOctBalance, fetchEthBalance, loadSwapHistory]);

  const fetchQuote = useCallback(
    async (amount: number) => {
      if (!capability || amount <= 0) {
        setQuote(null);
        setQuoteError(null);
        return;
      }
      setQuoteLoading(true);
      setQuoteError(null);
      try {
        const newQuote = swapDirection === 'OCT_TO_ETH' 
          ? await getQuote(amount)
          : await getEthToOctQuote(amount);
        setQuote(newQuote);
        setQuoteError(null);
      } catch (err) {
        setQuote(null);
        const errorMsg = err instanceof Error ? err.message : 'Failed to get quote';
        setQuoteError(errorMsg);
        console.log('[SwapPage] Quote error:', errorMsg);
      } finally {
        setQuoteLoading(false);
      }
    },
    [capability, swapDirection, setQuote, setQuoteLoading]
  );

  useEffect(() => {
    const amount = parseFloat(amountIn);
    if (amount > 0) {
      const debounce = setTimeout(() => fetchQuote(amount), 300);
      return () => clearTimeout(debounce);
    } else {
      setQuote(null);
    }
  }, [amountIn, fetchQuote, setQuote]);

  // Reset amount when direction changes
  useEffect(() => {
    setAmountIn('');
    setQuote(null);
    setQuoteError(null);
  }, [swapDirection, setQuote]);

  const handleConnect = async () => {
    setLoading(true);
    try {
      await initSDK();
      if (!isInstalled()) {
        addError('NOT_INSTALLED', 'Please install Octra wallet extension');
        return;
      }
      const conn = await connect(SWAP_CIRCLE);
      setConnection(conn);
    } catch (err) {
      addError('CONNECTION_FAILED', (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthorize = async () => {
    setLoading(true);
    try {
      const cap = await requestCapability({
        methods: [...SWAP_METHODS],
        scope: 'write',
        encrypted: false,
        ttlSeconds: 7200,
      });
      setCapability(cap);
    } catch (err) {
      addError('AUTHORIZE_FAILED', (err as Error).message);
    } finally {
      setLoading(false);
    }
  };


  // OCT → ETH Swap Handler
  const handleOctToEthSwap = async () => {
    if (!capability || !quote || !derivedEvmAddress) return;

    const swapId = `swap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const payload = createIntentPayload(quote, derivedEvmAddress);
    
    const swapRecord: SwapRecord = {
      id: swapId,
      direction: 'OCT_TO_ETH',
      payload,
      status: 'signing',
      createdAt: Date.now(),
    };
    addSwap(swapRecord);
    setCurrentSwapStatus('signing');

    try {
      // Step 1: Sign intent
      setCurrentSwapStatus('signing');
      updateSwap(swapId, { status: 'signing' });
      
      const signResult = await invoke({
        capabilityId: capability.id,
        method: 'sign_intent',
        payload: new TextEncoder().encode(JSON.stringify(payload)),
      });
      if (!signResult.success) throw new Error('Failed to sign intent');

      // Step 2: Send OCT to escrow
      setCurrentSwapStatus('sending');
      updateSwap(swapId, { status: 'sending' });

      const txPayload = {
        to: quote.escrowAddress,
        amount: formatAmount(payload.amountIn),
        message: JSON.stringify({ payload }),
      };

      const sendResult = await invoke({
        capabilityId: capability.id,
        method: 'send_transaction',
        payload: new TextEncoder().encode(JSON.stringify(txPayload)),
      });
      if (!sendResult.success) throw new Error('Failed to send transaction to escrow');

      const txData = parseInvokeData<SendTxResult>(sendResult.data);
      const octraTxHash = txData.txHash;
      updateSwap(swapId, { sourceTxHash: octraTxHash, octraTxHash });

      // Step 3: Wait for Octra tx confirmation
      setCurrentSwapStatus('confirming');
      updateSwap(swapId, { status: 'confirming' });

      const confirmResult = await waitForOctraTxConfirmation(
        octraTxHash,
        (status) => console.log('[SWAP] Octra tx status:', status),
        { timeoutMs: 120000, pollIntervalMs: 5000 }
      );

      if (!confirmResult.confirmed) {
        const errorMsg = confirmResult.status === 'failed' 
          ? 'failed' 
          : confirmResult.status === 'epoch_missed'
          ? 'not included in block (epoch changed)'
          : 'not confirmed (timeout)';
        throw new Error(`Octra transaction ${errorMsg}`);
      }

      // Step 4: Submit to backend
      setCurrentSwapStatus('submitting');
      updateSwap(swapId, { status: 'submitting' });

      const submitResult = await submitIntent(octraTxHash);
      updateSwap(swapId, { intentId: submitResult.intentId });

      // Step 5: Poll for fulfillment
      setCurrentSwapStatus('polling');
      updateSwap(swapId, { status: 'polling' });

      const finalStatus = await waitForFulfillment(submitResult.intentId);

      if (finalStatus.status === 'FULFILLED') {
        setCurrentSwapStatus('fulfilled');
        updateSwap(swapId, {
          status: 'fulfilled',
          targetTxHash: finalStatus.targetTxHash,
          amountOut: finalStatus.amountOut,
          fulfilledAt: Date.now(),
        });
      } else {
        throw new Error(`Swap ${String(finalStatus.status).toLowerCase()}`);
      }

      setAmountIn('');
      setQuote(null);
      setTimeout(() => fetchOctBalance(), 2000);

    } catch (err) {
      setCurrentSwapStatus('failed');
      updateSwap(swapId, { status: 'failed', error: (err as Error).message });
      addError('SWAP_FAILED', (err as Error).message);
    } finally {
      setTimeout(() => setCurrentSwapStatus('idle'), 3000);
    }
  };

  // ETH → OCT Swap Handler
  const handleEthToOctSwap = async () => {
    if (!capability || !quote || !connection?.walletPubKey) return;

    const swapId = `swap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const payload = createEthToOctIntentPayload(quote, connection.walletPubKey);
    
    const swapRecord: SwapRecord = {
      id: swapId,
      direction: 'ETH_TO_OCT',
      payload,
      status: 'signing',
      createdAt: Date.now(),
    };
    addSwap(swapRecord);
    setCurrentSwapStatus('signing');

    try {
      // Step 1: Sign intent
      setCurrentSwapStatus('signing');
      updateSwap(swapId, { status: 'signing' });
      
      const signResult = await invoke({
        capabilityId: capability.id,
        method: 'sign_intent',
        payload: new TextEncoder().encode(JSON.stringify(payload)),
      });
      if (!signResult.success) throw new Error('Failed to sign intent');

      // Step 2: Send ETH to escrow with intent payload in data field
      setCurrentSwapStatus('sending');
      updateSwap(swapId, { status: 'sending' });

      // Encode intent payload as hex for tx.data
      const intentDataHex = encodeIntentPayloadAsHex(payload);
      
      const evmTxPayload = {
        to: quote.escrowAddress,
        amount: formatAmount(payload.amountIn),
        data: intentDataHex,
      };

      console.log('[SWAP] Sending ETH to escrow:', evmTxPayload);

      const sendResult = await invoke({
        capabilityId: capability.id,
        method: 'send_evm_transaction',
        payload: new TextEncoder().encode(JSON.stringify(evmTxPayload)),
      });
      if (!sendResult.success) throw new Error('Failed to send ETH transaction to escrow');

      const txData = parseInvokeData<SendTxResult>(sendResult.data);
      const sepoliaTxHash = txData.txHash;
      updateSwap(swapId, { sourceTxHash: sepoliaTxHash });

      // Step 3: Wait for Sepolia tx confirmation
      setCurrentSwapStatus('confirming');
      updateSwap(swapId, { status: 'confirming' });

      const confirmResult = await waitForSepoliaTxConfirmation(
        sepoliaTxHash,
        (status) => console.log('[SWAP] Sepolia tx status:', status),
        { timeoutMs: 120000, pollIntervalMs: 5000 }
      );

      if (!confirmResult.confirmed) {
        throw new Error(`Sepolia transaction ${confirmResult.status}`);
      }

      // Step 4: Submit to backend
      setCurrentSwapStatus('submitting');
      updateSwap(swapId, { status: 'submitting' });

      const submitResult = await submitEthToOctIntent(sepoliaTxHash);
      updateSwap(swapId, { intentId: submitResult.intentId });

      // Step 5: Poll for fulfillment
      setCurrentSwapStatus('polling');
      updateSwap(swapId, { status: 'polling' });

      const finalStatus = await waitForFulfillment(submitResult.intentId);

      if (finalStatus.status === 'FULFILLED') {
        setCurrentSwapStatus('fulfilled');
        updateSwap(swapId, {
          status: 'fulfilled',
          targetTxHash: finalStatus.targetTxHash,
          amountOut: finalStatus.amountOut,
          fulfilledAt: Date.now(),
        });
      } else {
        throw new Error(`Swap ${String(finalStatus.status).toLowerCase()}`);
      }

      setAmountIn('');
      setQuote(null);
      setTimeout(() => {
        fetchOctBalance();
        fetchEthBalance();
      }, 2000);

    } catch (err) {
      setCurrentSwapStatus('failed');
      updateSwap(swapId, { status: 'failed', error: (err as Error).message });
      addError('SWAP_FAILED', (err as Error).message);
    } finally {
      setTimeout(() => setCurrentSwapStatus('idle'), 3000);
    }
  };

  const handleSwap = () => {
    if (swapDirection === 'OCT_TO_ETH') {
      handleOctToEthSwap();
    } else {
      handleEthToOctSwap();
    }
  };

  const displayOctBalance = octBalance ?? 0;
  const displayEthBalance = ethBalance ?? 0;
  const currentBalance = swapDirection === 'OCT_TO_ETH' ? displayOctBalance : displayEthBalance;
  const isValidAmount = parseFloat(amountIn) > 0 && parseFloat(amountIn) <= currentBalance;
  
  const canSwap = quote && isValidAmount && hasLiquidity && !quoteError && (swapDirection === 'OCT_TO_ETH' ? derivedEvmAddress : connection?.walletPubKey) && currentSwapStatus === 'idle' && !loading;

  const getStatusLabel = (status: SwapStatus): string => {
    switch (status) {
      case 'signing': return 'Signing Intent...';
      case 'sending': return swapDirection === 'OCT_TO_ETH' ? 'Sending OCT to Escrow...' : 'Sending ETH to Escrow...';
      case 'confirming': return swapDirection === 'OCT_TO_ETH' ? 'Waiting for Octra Confirmation...' : 'Waiting for Sepolia Confirmation...';
      case 'submitting': return 'Submitting to Backend...';
      case 'polling': return swapDirection === 'OCT_TO_ETH' ? 'Waiting for ETH...' : 'Waiting for OCT...';
      case 'fulfilled': return 'Completed!';
      case 'failed': return 'Failed';
      default: return '';
    }
  };


  const mainContent = (
    <div className="space-y-3">
      {/* Loading state while hydrating */}
      {(!_hasHydrated || !sdkInitialized) && (
        <Panel title="Loading...">
          <div className="flex items-center justify-center py-6">
            <svg className="animate-spin w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="ml-2 text-muted text-sm">Initializing...</span>
          </div>
        </Panel>
      )}

      {_hasHydrated && sdkInitialized && step === 'connect' && (
        <Panel title="Connect Wallet">
          <div className="space-y-3">
            <p className="text-sm text-muted">Connect your Octra wallet to access the DEX.</p>
            <div className="p-2 bg-background border border-border text-xs text-muted">
              <p className="font-medium text-foreground mb-1">About Intent-based Swaps:</p>
              <ul className="space-y-0.5">
                <li>• Sign a swap intent (not a transaction)</li>
                <li>• Swap OCT ⇄ ETH bidirectionally</li>
                <li>• Assets escrowed until delivery confirmed</li>
              </ul>
            </div>
            <Button onClick={handleConnect} loading={loading} disabled={loading}>
              {loading ? 'Connecting...' : 'Connect Wallet'}
            </Button>
          </div>
        </Panel>
      )}

      {_hasHydrated && sdkInitialized && step === 'authorize' && (
        <Panel title="Authorize DEX">
          <div className="space-y-3">
            <StatusBadge status="success" label="CONNECTED" />
            <div className="p-2 bg-background border border-border">
              <div className="text-xs text-muted mb-0.5">Connected Address</div>
              <code className="text-xs text-foreground break-all">{connection?.walletPubKey}</code>
            </div>
            <p className="text-sm text-muted">Authorize the DEX to create swap intents.</p>
            <Button onClick={handleAuthorize} loading={loading} disabled={loading}>
              {loading ? 'Authorizing...' : 'Authorize DEX'}
            </Button>
          </div>
        </Panel>
      )}

      {_hasHydrated && sdkInitialized && step === 'swap' && (
        <>
          <Panel title={swapDirection === 'OCT_TO_ETH' 
            ? `Swap OCT → ETH${ETH_NETWORK_LABEL ? ` (${ETH_NETWORK_LABEL})` : ''}` 
            : `Swap${ETH_NETWORK_LABEL ? ` (${ETH_NETWORK_LABEL})` : ''} ETH → OCT`}>
            <div className="space-y-3">
              {/* Direction Toggle */}
              <div className="flex gap-1 p-1 bg-secondary rounded">
                <button
                  onClick={() => setSwapDirection('OCT_TO_ETH')}
                  disabled={currentSwapStatus !== 'idle'}
                  className={`flex-1 py-1.5 px-2 text-sm font-medium rounded transition-colors ${
                    swapDirection === 'OCT_TO_ETH' 
                      ? 'bg-background text-foreground shadow' 
                      : 'text-muted hover:text-foreground'
                  } disabled:opacity-50`}
                >
                  OCT → ETH
                </button>
                <button
                  onClick={() => setSwapDirection('ETH_TO_OCT')}
                  disabled={currentSwapStatus !== 'idle'}
                  className={`flex-1 py-1.5 px-2 text-sm font-medium rounded transition-colors ${
                    swapDirection === 'ETH_TO_OCT' 
                      ? 'bg-background text-foreground shadow' 
                      : 'text-muted hover:text-foreground'
                  } disabled:opacity-50`}
                >
                  ETH → OCT
                </button>
              </div>

              {/* From Input */}
              <div className="p-3 bg-background border border-border">
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-muted">
                    From ({swapDirection === 'OCT_TO_ETH' ? 'Octra' : 'Sepolia'})
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted">
                      Bal: {swapDirection === 'OCT_TO_ETH' 
                        ? (balanceLoading ? '...' : displayOctBalance.toLocaleString(undefined, { maximumFractionDigits: 6 }))
                        : (ethBalanceLoading ? '...' : displayEthBalance.toFixed(6))
                      }
                    </span>
                    <button
                      onClick={swapDirection === 'OCT_TO_ETH' ? fetchOctBalance : fetchEthBalance}
                      disabled={swapDirection === 'OCT_TO_ETH' ? balanceLoading : ethBalanceLoading}
                      className="text-muted hover:text-foreground disabled:opacity-50"
                      title="Refresh balance"
                    >
                      <svg 
                        className={`w-3 h-3 ${(swapDirection === 'OCT_TO_ETH' ? balanceLoading : ethBalanceLoading) ? 'animate-spin' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    value={amountIn}
                    onChange={(e) => setAmountIn(e.target.value)}
                    placeholder="0.0"
                    min="0"
                    step="0.000001"
                    disabled={currentSwapStatus !== 'idle'}
                    className="flex-1 bg-transparent text-lg font-bold text-foreground outline-none disabled:opacity-50"
                  />
                  <span className="text-sm font-medium text-foreground px-2 py-0.5 bg-secondary">
                    {swapDirection === 'OCT_TO_ETH' ? 'OCT' : 'ETH'}
                  </span>
                </div>
                <button
                  onClick={() => setAmountIn(currentBalance.toString())}
                  disabled={currentSwapStatus !== 'idle'}
                  className="text-xs text-primary mt-1 hover:underline disabled:opacity-50"
                >
                  MAX
                </button>
              </div>

              <div className="flex justify-center">
                <div className="p-1 bg-secondary text-foreground text-sm">↓</div>
              </div>

              {/* To Output */}
              <div className="p-3 bg-background border border-border">
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-muted">
                    To ({swapDirection === 'OCT_TO_ETH' ? 'Sepolia' : 'Octra'})
                  </span>
                  {quoteLoading && <span className="text-xs text-muted">Loading...</span>}
                </div>
                <div className="flex gap-2 items-center">
                  <div className="flex-1 text-lg font-bold text-foreground">
                    {quote ? quote.estimatedOut.toFixed(6) : '0.000000'}
                  </div>
                  <span className="text-sm font-medium text-foreground px-2 py-0.5 bg-secondary">
                    {swapDirection === 'OCT_TO_ETH' ? 'ETH' : 'OCT'}
                  </span>
                </div>
                <div className="mt-2 pt-2 border-t border-border">
                  <div className="text-xs text-muted mb-0.5">Recipient</div>
                  <div className="text-xs font-mono text-foreground break-all">
                    {swapDirection === 'OCT_TO_ETH' ? derivedEvmAddress : connection?.walletPubKey}
                  </div>
                </div>
              </div>

              {quote && (
                <div className="p-2 bg-card border border-border text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-muted">Rate</span>
                    <span className="text-foreground">
                      1 {swapDirection === 'OCT_TO_ETH' ? 'OCT' : 'ETH'} = {quote.rate} {swapDirection === 'OCT_TO_ETH' ? 'ETH' : 'OCT'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Fee</span>
                    <span className="text-foreground">{quote.feeBps / 100}%</span>
                  </div>
                  <div className="pt-1.5 border-t border-border">
                    <div className="text-muted mb-0.5">Escrow</div>
                    <div className="text-foreground font-mono break-all">{quote.escrowAddress}</div>
                  </div>
                </div>
              )}

              {/* Quote Error (min/max amount) */}
              {quoteError && (
                <div className="p-3 bg-destructive/10 border border-destructive/30 text-center">
                  <div className="text-sm font-medium text-destructive">
                    ⚠️ {quoteError}
                  </div>
                </div>
              )}

              {/* Liquidity Warning */}
              {quote && !hasLiquidity && (
                <div className="p-3 bg-destructive/10 border border-destructive/30 text-center">
                  <div className="text-sm font-medium text-destructive">
                    ⚠️ Insufficient Liquidity
                  </div>
                  <div className="text-xs text-destructive/80 mt-1">
                    Available: {quoteLiquidity?.available?.toFixed(6) ?? '?'} {swapDirection === 'OCT_TO_ETH' ? 'ETH' : 'OCT'}
                    <br />
                    Required: {quoteLiquidity?.required?.toFixed(6) ?? '?'} {swapDirection === 'OCT_TO_ETH' ? 'ETH' : 'OCT'}
                  </div>
                </div>
              )}

              {currentSwapStatus !== 'idle' && (
                <div className="p-2 bg-primary/10 border border-primary/20 text-center">
                  <div className="text-sm font-medium text-primary">
                    {getStatusLabel(currentSwapStatus)}
                  </div>
                </div>
              )}

              <Button 
                onClick={handleSwap} 
                loading={currentSwapStatus !== 'idle'} 
                disabled={!canSwap} 
                className="w-full"
              >
                {quoteError
                  ? 'Invalid Amount'
                  : quote && !hasLiquidity
                  ? 'Insufficient Liquidity'
                  : !isValidAmount
                  ? parseFloat(amountIn) > currentBalance
                    ? 'Insufficient Balance'
                    : 'Enter Amount'
                  : currentSwapStatus !== 'idle'
                  ? getStatusLabel(currentSwapStatus)
                  : swapDirection === 'OCT_TO_ETH'
                  ? `Swap ${formatDisplayAmount(quote?.amountIn ?? 0, 4)} OCT → ${formatDisplayAmount(quote?.estimatedOut ?? 0, 6)} ETH`
                  : `Swap ${formatDisplayAmount(quote?.amountIn ?? 0, 6)} ETH → ${formatDisplayAmount(quote?.estimatedOut ?? 0, 4)} OCT`}
              </Button>
            </div>
          </Panel>
        </>
      )}
    </div>
  );

  return (
    <Layout sidebar={<SwapHistory />}>
      {mainContent}
    </Layout>
  );
}
