import { useCallback } from 'react';
import { useStore } from '@/store';
import { invoke, parseInvokeData } from '@/sdk/octra';
import {
  createIntentPayload,
  createEthToOctIntentPayload,
  encodeIntentForOctraTx,
  encodeIntentPayloadAsHex,
  getSafeAmountForWallet,
  submitIntent,
  submitEthToOctIntent,
  waitForFulfillment,
  waitForOctraTxConfirmation,
  waitForSepoliaTxConfirmation,
} from '@/sdk/intents';
import { BALANCE_REFRESH_DELAY_MS, STATUS_RESET_DELAY_MS } from '@/config/constants';
import type { Quote, SwapRecord, SwapDirection } from '@/types/intent';

interface SendTxResult {
  success: boolean;
  txHash: string;
  from: string;
  to: string;
  amount: number | string;
}

interface UseSwapExecutionProps {
  swapDirection: SwapDirection;
  quote: Quote | null;
  onSuccess: () => void;
  fetchOctBalance: () => void;
  fetchEthBalance: () => void;
}

export function useSwapExecution({
  swapDirection,
  quote,
  onSuccess,
  fetchOctBalance,
  fetchEthBalance,
}: UseSwapExecutionProps) {
  const {
    connection,
    capability,
    derivedEvmAddress,
    currentSwapStatus,
    setCurrentSwapStatus,
    addSwap,
    updateSwap,
    addError,
  } = useStore();

  const executeOctToEthSwap = useCallback(async () => {
    if (!capability || !quote || !derivedEvmAddress) return;

    const swapId = `swap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    
    let payload;
    try {
      payload = createIntentPayload(quote, derivedEvmAddress);
    } catch (err) {
      addError('VALIDATION_FAILED', (err as Error).message);
      return;
    }
    
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
      updateSwap(swapId, { status: 'signing' });
      
      const signResult = await invoke({
        capabilityId: capability.id,
        method: 'sign_intent',
        payload: new TextEncoder().encode(JSON.stringify(payload)),
      });
      if (!signResult.success) throw new Error('Failed to sign intent');

      // Step 2: Send OCT to escrow with encoded payload (includes hash)
      setCurrentSwapStatus('sending');
      updateSwap(swapId, { status: 'sending' });

      // Encode payload with hash for integrity verification
      const encodedMessage = await encodeIntentForOctraTx(payload);
      
      const txPayload = {
        to: quote.escrowAddress,
        amount: getSafeAmountForWallet(payload.amountIn), // Safe format for wallet
        message: encodedMessage,
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

      const confirmResult = await waitForOctraTxConfirmation(octraTxHash);

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
        onSuccess();
        setTimeout(() => fetchOctBalance(), BALANCE_REFRESH_DELAY_MS);
      } else {
        throw new Error(`Swap ${String(finalStatus.status).toLowerCase()}`);
      }

    } catch (err) {
      setCurrentSwapStatus('failed');
      updateSwap(swapId, { status: 'failed', error: (err as Error).message });
      addError('SWAP_FAILED', (err as Error).message);
    } finally {
      setTimeout(() => setCurrentSwapStatus('idle'), STATUS_RESET_DELAY_MS);
    }
  }, [capability, quote, derivedEvmAddress, addSwap, updateSwap, setCurrentSwapStatus, addError, onSuccess, fetchOctBalance]);

  const executeEthToOctSwap = useCallback(async () => {
    if (!capability || !quote || !connection?.walletPubKey) return;

    const swapId = `swap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    
    let payload;
    try {
      payload = createEthToOctIntentPayload(quote, connection.walletPubKey);
    } catch (err) {
      addError('VALIDATION_FAILED', (err as Error).message);
      return;
    }
    
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
      updateSwap(swapId, { status: 'signing' });
      
      const signResult = await invoke({
        capabilityId: capability.id,
        method: 'sign_intent',
        payload: new TextEncoder().encode(JSON.stringify(payload)),
      });
      if (!signResult.success) throw new Error('Failed to sign intent');

      // Step 2: Send ETH to escrow with encoded payload (includes hash)
      setCurrentSwapStatus('sending');
      updateSwap(swapId, { status: 'sending' });

      // Encode payload with hash for integrity verification
      const intentDataHex = await encodeIntentPayloadAsHex(payload);
      
      const evmTxPayload = {
        to: quote.escrowAddress,
        amount: getSafeAmountForWallet(payload.amountIn), // Safe format for wallet
        data: intentDataHex,
      };

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

      const confirmResult = await waitForSepoliaTxConfirmation(sepoliaTxHash);

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
        onSuccess();
        setTimeout(() => {
          fetchOctBalance();
          fetchEthBalance();
        }, BALANCE_REFRESH_DELAY_MS);
      } else {
        throw new Error(`Swap ${String(finalStatus.status).toLowerCase()}`);
      }

    } catch (err) {
      setCurrentSwapStatus('failed');
      updateSwap(swapId, { status: 'failed', error: (err as Error).message });
      addError('SWAP_FAILED', (err as Error).message);
    } finally {
      setTimeout(() => setCurrentSwapStatus('idle'), STATUS_RESET_DELAY_MS);
    }
  }, [capability, quote, connection?.walletPubKey, addSwap, updateSwap, setCurrentSwapStatus, addError, onSuccess, fetchOctBalance, fetchEthBalance]);

  const executeSwap = useCallback(() => {
    if (swapDirection === 'OCT_TO_ETH') {
      executeOctToEthSwap();
    } else {
      executeEthToOctSwap();
    }
  }, [swapDirection, executeOctToEthSwap, executeEthToOctSwap]);

  return {
    currentSwapStatus,
    executeSwap,
    isSwapping: currentSwapStatus !== 'idle' && currentSwapStatus !== 'fulfilled' && currentSwapStatus !== 'failed',
  };
}
