import { useState, useCallback, useEffect } from 'react';
import { useStore } from '@/store';
import { invoke, parseInvokeData } from '@/sdk/octra';
import { getSepoliaBalance, fetchSwapHistory } from '@/sdk/intents';
import type { SwapRecord, SwapStatus } from '@/types/intent';

interface BalanceData {
  address: string;
  balance: number;
  network: string;
}

export function useBalances(sdkInitialized: boolean) {
  const {
    connection,
    capability,
    octBalance,
    balanceLoading,
    derivedEvmAddress,
    setOctBalance,
    setBalanceLoading,
    setCapability,
    setSwaps,
    addError,
  } = useStore();

  const [ethBalance, setEthBalance] = useState<number | null>(null);
  const [ethBalanceLoading, setEthBalanceLoading] = useState(false);

  const fetchOctBalance = useCallback(async () => {
    if (!capability || !sdkInitialized) return;
    
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
      console.log('[useBalances] fetchOctBalance error:', errorMsg);
      if (errorMsg.includes('not found') || errorMsg.includes('Capability')) {
        setCapability(null);
      } else {
        addError('BALANCE_FAILED', errorMsg);
      }
    } finally {
      setBalanceLoading(false);
    }
  }, [capability, sdkInitialized, setOctBalance, setBalanceLoading, setCapability, addError]);

  const fetchEthBalance = useCallback(async () => {
    if (!derivedEvmAddress) return;
    
    setEthBalanceLoading(true);
    try {
      const balance = await getSepoliaBalance(derivedEvmAddress);
      setEthBalance(balance);
    } catch (err) {
      console.error('[useBalances] Failed to fetch ETH balance:', err);
    } finally {
      setEthBalanceLoading(false);
    }
  }, [derivedEvmAddress]);

  const loadSwapHistory = useCallback(async () => {
    if (!connection?.walletPubKey) return;
    
    try {
      const history = await fetchSwapHistory(connection.walletPubKey);
      
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
    } catch (err) {
      console.error('[useBalances] Failed to load swap history:', err);
    }
  }, [connection?.walletPubKey, setSwaps]);

  // Auto-fetch when capability is ready
  useEffect(() => {
    if (capability && sdkInitialized) {
      fetchOctBalance();
      fetchEthBalance();
      loadSwapHistory();
    }
  }, [capability, sdkInitialized, fetchOctBalance, fetchEthBalance, loadSwapHistory]);

  return {
    octBalance: octBalance ?? 0,
    ethBalance: ethBalance ?? 0,
    balanceLoading,
    ethBalanceLoading,
    fetchOctBalance,
    fetchEthBalance,
    loadSwapHistory,
  };
}
