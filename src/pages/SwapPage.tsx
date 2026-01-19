import { useState, useCallback } from 'react';
import { Panel, Button, Layout, SwapFormSkeleton } from '@/components';
import { useStore } from '@/store';
import { ETH_NETWORK_LABEL } from '@/config';
import {
  useWalletConnection,
  useBalances,
  useSwapQuote,
  useSwapExecution,
  DirectionToggle,
  SwapInput,
  SwapStatus,
  QuoteDisplay,
  ConnectStep,
  AuthorizeStep,
  SwapHistory,
} from '@/features/swap';
import type { SwapDirection } from '@/types/intent';

export function SwapPage() {
  const { connection, derivedEvmAddress } = useStore();
  const [swapDirection, setSwapDirection] = useState<SwapDirection>('OCT_TO_ETH');

  // Hooks
  const { step, loading, isReady, handleConnect, handleAuthorize, sdkInitialized } = useWalletConnection();
  const { octBalance, ethBalance, balanceLoading, ethBalanceLoading, fetchOctBalance, fetchEthBalance } = useBalances(sdkInitialized);
  const { amountIn, setAmountIn, quote, quoteLoading, quoteError, hasLiquidity } = useSwapQuote(swapDirection);

  const onSwapSuccess = useCallback(() => {
    setAmountIn('');
  }, [setAmountIn]);

  const { currentSwapStatus, executeSwap, isSwapping } = useSwapExecution({
    swapDirection,
    quote,
    onSuccess: onSwapSuccess,
    fetchOctBalance,
    fetchEthBalance,
  });

  // Derived state
  const isOctToEth = swapDirection === 'OCT_TO_ETH';
  const currentBalance = isOctToEth ? octBalance : ethBalance;
  const isValidAmount = parseFloat(amountIn) > 0 && parseFloat(amountIn) <= currentBalance;
  const targetAddress = isOctToEth ? derivedEvmAddress : connection?.walletPubKey;
  const canSwap = quote && isValidAmount && hasLiquidity && !quoteError && targetAddress && !isSwapping && !loading;

  const handleMax = () => setAmountIn(currentBalance.toString());

  const mainContent = (
    <div className="space-y-3">
      {/* Loading state */}
      {!isReady && <SwapFormSkeleton />}

      {/* Connect step */}
      {isReady && step === 'connect' && (
        <ConnectStep onConnect={handleConnect} loading={loading} />
      )}

      {/* Authorize step */}
      {isReady && step === 'authorize' && (
        <AuthorizeStep onAuthorize={handleAuthorize} loading={loading} />
      )}

      {/* Swap step */}
      {isReady && step === 'swap' && (
        <>
          <Panel title={isOctToEth 
            ? `Swap OCT → ETH${ETH_NETWORK_LABEL ? ` (${ETH_NETWORK_LABEL})` : ''}` 
            : `Swap${ETH_NETWORK_LABEL ? ` (${ETH_NETWORK_LABEL})` : ''} ETH → OCT`
          }>
            <div className="space-y-3">
              <DirectionToggle
                direction={swapDirection}
                onChange={setSwapDirection}
                disabled={isSwapping}
              />

              <SwapInput
                label="From"
                chainLabel={isOctToEth ? 'Octra' : 'Sepolia'}
                asset={isOctToEth ? 'OCT' : 'ETH'}
                value={amountIn}
                onChange={setAmountIn}
                balance={currentBalance}
                balanceLoading={isOctToEth ? balanceLoading : ethBalanceLoading}
                onRefreshBalance={isOctToEth ? fetchOctBalance : fetchEthBalance}
                onMax={handleMax}
                disabled={isSwapping}
              />

              <div className="flex justify-center">
                <div className="p-1 bg-secondary text-foreground text-sm" aria-hidden="true">↓</div>
              </div>

              <SwapInput
                label="To"
                chainLabel={isOctToEth ? 'Sepolia' : 'Octra'}
                asset={isOctToEth ? 'ETH' : 'OCT'}
                value={quote ? String(quote.estimatedOut) : ''}
                balance={isOctToEth ? ethBalance : octBalance}
                balanceLoading={isOctToEth ? ethBalanceLoading : balanceLoading}
                readOnly
              />

              <QuoteDisplay
                quote={quote}
                quoteLoading={quoteLoading}
                quoteError={quoteError}
                hasLiquidity={hasLiquidity}
                direction={swapDirection}
              />

              {currentSwapStatus !== 'idle' && (
                <SwapStatus status={currentSwapStatus} direction={swapDirection} />
              )}

              <Button
                onClick={executeSwap}
                disabled={!canSwap}
                loading={isSwapping}
                className="w-full"
              >
                {isSwapping ? 'Swapping...' : 'Swap'}
              </Button>
            </div>
          </Panel>

          {/* Target address info */}
          {targetAddress && (
            <div className="p-2 bg-card border border-border text-xs">
              <span className="text-muted">
                {isOctToEth ? 'ETH will be sent to:' : 'OCT will be sent to:'}
              </span>
              <code className="block text-foreground font-mono mt-1 break-all">
                {targetAddress}
              </code>
            </div>
          )}
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
