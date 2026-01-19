/**
 * Octra Swap Intent Types
 * Based on: oct_⇄_eth_intent_swap_unified_flow_api_spec.md
 */

// Supported chains
export type TargetChain = 'ethereum_sepolia' | 'octra_mainnet';

// Swap direction
export type SwapDirection = 'OCT_TO_ETH' | 'ETH_TO_OCT';

// Intent status (from backend)
export type IntentStatus = 'OPEN' | 'FULFILLED' | 'EXPIRED' | 'REJECTED';

// Local swap status
export type SwapStatus = 'idle' | 'quoting' | 'signing' | 'sending' | 'confirming' | 'submitting' | 'polling' | 'fulfilled' | 'failed';

// Swap Intent Payload for OCT→ETH (Canonical - from spec)
export interface SwapIntentPayload {
  version: 1;
  intentType: 'swap';
  fromAsset: 'OCT' | 'ETH';
  toAsset: 'ETH' | 'OCT';
  amountIn: number;
  minAmountOut: number;
  targetChain: TargetChain;
  targetAddress: string; // EVM address for OCT→ETH, Octra address for ETH→OCT
  expiry: number; // Unix timestamp ms
  nonce: string;
}

// Liquidity info from quote
export interface QuoteLiquidity {
  available: number | null;
  required: number;
  sufficient: boolean;
}

// Oracle price info
export interface OraclePrices {
  spotPrice: number | string;
  emaPrice: number | string;
  twapPrice: number | string;
}

// USD price info
export interface UsdPrices {
  ethPrice: number | string;
  octPrice: number | string;
  amountInUsd?: number | string;
  estimatedOutUsd?: number | string;
  source?: string;
  updatedAt?: number;
}

// Quote from backend API
// Note: Backend may return numbers as strings for precision
export interface Quote {
  from: 'OCT' | 'ETH';
  to: 'ETH' | 'OCT';
  amountIn: number | string;
  estimatedOut: number | string;
  minAmountOut: number | string;
  rate: number | string;
  effectiveRate?: number | string;
  priceImpact?: number | string;
  feeBps: number | string;
  slippageBps: number | string;
  expiresIn: number;
  escrowAddress: string;
  network: TargetChain;
  liquidity: QuoteLiquidity;
  oracle?: OraclePrices;
  usd?: UsdPrices | null;
}

// Swap record (local tracking)
export interface SwapRecord {
  id: string;
  direction: SwapDirection;
  payload: SwapIntentPayload;
  status: SwapStatus;
  intentId?: string;
  sourceTxHash?: string; // octraTxHash for OCT→ETH, sepoliaTxHash for ETH→OCT
  targetTxHash?: string; // ethTxHash for OCT→ETH, octraTxHash for ETH→OCT
  amountOut?: number;
  createdAt: number;
  fulfilledAt?: number;
  error?: string;
  // Legacy fields for backward compatibility
  octraTxHash?: string;
  ethTxHash?: string;
}
