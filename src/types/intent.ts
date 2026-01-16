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

// Quote from backend API
export interface Quote {
  from: 'OCT' | 'ETH';
  to: 'ETH' | 'OCT';
  amountIn: number;
  estimatedOut: number;
  minAmountOut: number;
  rate: number;
  feeBps: number;
  slippageBps: number;
  expiresIn: number;
  escrowAddress: string;
  network: TargetChain;
  liquidity: QuoteLiquidity;
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
