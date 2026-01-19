/**
 * Intents API Client
 * Communicates with the Intents API backend
 * Supports: OCT → ETH and ETH → OCT swaps
 * 
 * SECURITY:
 * - Payload is hashed for integrity verification
 * - Backend verifies payload hash matches tx data
 * - Amounts are validated before submission
 */

import { INTENTS_API_URL } from '../config';
import type { Quote, SwapIntentPayload } from '../types/intent';

const API_URL = INTENTS_API_URL;

// Helper to get headers
function getHeaders(contentType = false): HeadersInit {
  const headers: HeadersInit = {};
  if (contentType) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
}

/**
 * Convert string or number to number safely
 * Handles scientific notation and precision issues
 */
function toNumber(value: number | string): number {
  if (typeof value === 'number') return value;
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
}

/**
 * Format number without scientific notation
 * Critical for wallet SDK which may not handle scientific notation
 */
function formatAmountSafe(num: number): string {
  if (num === 0 || isNaN(num)) return '0';
  // Use toFixed with high precision, then trim trailing zeros
  const fixed = num.toFixed(18);
  return fixed.replace(/\.?0+$/, '') || '0';
}

/**
 * Create SHA-256 hash of payload for integrity verification
 */
async function hashPayload(payload: SwapIntentPayload): Promise<string> {
  const jsonString = JSON.stringify(payload);
  const encoder = new TextEncoder();
  const data = encoder.encode(jsonString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// =============================================================================
// OCT → ETH FUNCTIONS
// =============================================================================

/**
 * Format small numbers to be more readable
 * e.g., 5.9e-7 → "0.00000059"
 */
function formatReadableNumber(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return String(value);
  
  // For very small numbers, use fixed notation with enough decimals
  if (Math.abs(num) < 0.0001 && num !== 0) {
    // Find how many decimal places we need
    const str = num.toFixed(18).replace(/0+$/, '');
    return str;
  }
  
  return num.toString();
}

/**
 * Format error messages to make numbers more readable
 */
function formatErrorMessage(message: string): string {
  // Match scientific notation like 5.9e-7 or 1.23e+10
  return message.replace(/(\d+\.?\d*e[+-]?\d+)/gi, (match) => {
    return formatReadableNumber(parseFloat(match));
  });
}

/**
 * Get quote for OCT → ETH swap
 */
export async function getQuote(amountIn: number, slippageBps: number = 50): Promise<Quote> {
  console.log('[IntentsAPI] GET /quote (OCT→ETH), amount:', amountIn, 'slippage:', slippageBps);
  
  const response = await fetch(
    `${API_URL}/quote?from=OCT&to=ETH&amount=${amountIn}&slippageBps=${slippageBps}`,
    { headers: getHeaders() }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const errorMsg = error.error || `Quote failed: ${response.status}`;
    throw new Error(formatErrorMessage(errorMsg));
  }

  const quote = await response.json();
  console.log('[IntentsAPI] Quote received:', quote);
  return quote;
}

/**
 * Get quote for ETH → OCT swap
 */
export async function getEthToOctQuote(amountIn: number, slippageBps: number = 50): Promise<Quote> {
  console.log('[IntentsAPI] GET /quote (ETH→OCT), amount:', amountIn, 'slippage:', slippageBps);
  
  const response = await fetch(
    `${API_URL}/quote?from=ETH&to=OCT&amount=${amountIn}&slippageBps=${slippageBps}`,
    { headers: getHeaders() }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const errorMsg = error.error || `Quote failed: ${response.status}`;
    throw new Error(formatErrorMessage(errorMsg));
  }

  const quote = await response.json();
  console.log('[IntentsAPI] Quote received:', quote);
  return quote;
}

/**
 * Create intent payload for OCT → ETH swap
 * Uses minAmountOut from quote (already calculated with slippage)
 * 
 * Note: Amount validation is handled by backend
 */
export function createIntentPayload(
  quote: Quote,
  targetAddress: string
): SwapIntentPayload {
  const amountIn = toNumber(quote.amountIn);
  const minAmountOut = toNumber(quote.minAmountOut);
  
  // Validate target address format (EVM)
  if (!/^0x[a-fA-F0-9]{40}$/.test(targetAddress)) {
    throw new Error('Invalid EVM address format');
  }
  
  const payload: SwapIntentPayload = {
    version: 1,
    intentType: 'swap',
    fromAsset: 'OCT',
    toAsset: 'ETH',
    amountIn,
    minAmountOut,
    targetChain: 'ethereum_sepolia',
    targetAddress: targetAddress.toLowerCase(), // Normalize to lowercase
    expiry: Date.now() + 5 * 60 * 1000, // 5 minutes
    nonce: crypto.randomUUID(),
  };

  console.log('[IntentsAPI] Created OCT→ETH intent payload:', payload);
  return payload;
}

/**
 * Create intent payload for ETH → OCT swap
 * Uses minAmountOut from quote (already calculated with slippage)
 * 
 * Note: Amount validation is handled by backend
 */
export function createEthToOctIntentPayload(
  quote: Quote,
  targetOctraAddress: string
): SwapIntentPayload {
  const amountIn = toNumber(quote.amountIn);
  const minAmountOut = toNumber(quote.minAmountOut);
  
  // Validate target address format (Octra)
  if (!targetOctraAddress.startsWith('oct')) {
    throw new Error('Invalid Octra address format');
  }
  
  const payload: SwapIntentPayload = {
    version: 1,
    intentType: 'swap',
    fromAsset: 'ETH',
    toAsset: 'OCT',
    amountIn,
    minAmountOut,
    targetChain: 'octra_mainnet',
    targetAddress: targetOctraAddress,
    expiry: Date.now() + 5 * 60 * 1000, // 5 minutes
    nonce: crypto.randomUUID(),
  };

  console.log('[IntentsAPI] Created ETH→OCT intent payload:', payload);
  return payload;
}

/**
 * Encode intent payload for Octra transaction message field
 * Uses Base64 encoding for obfuscation + hash for integrity verification
 * 
 * Format: Base64({ payload, hash, timestamp, v: 2 })
 * Backend will decode and verify hash matches payload
 */
export async function encodeIntentForOctraTx(payload: SwapIntentPayload): Promise<string> {
  const hash = await hashPayload(payload);
  const envelope = {
    v: 2, // Version 2 = Base64 encoded
    payload,
    hash,
    timestamp: Date.now(),
  };
  const jsonString = JSON.stringify(envelope);
  // Encode to Base64
  return btoa(jsonString);
}

/**
 * Encode intent payload as hex for EVM tx.data field
 * Uses Base64 encoding for obfuscation + hash for integrity verification
 * 
 * Format: 0x + hex(Base64({ payload, hash, timestamp, v: 2 }))
 * Backend will decode hex → Base64 → JSON and verify hash
 */
export async function encodeIntentPayloadAsHex(payload: SwapIntentPayload): Promise<string> {
  const hash = await hashPayload(payload);
  const envelope = {
    v: 2, // Version 2 = Base64 encoded
    payload,
    hash,
    timestamp: Date.now(),
  };
  const jsonString = JSON.stringify(envelope);
  // First Base64 encode, then hex encode
  const base64String = btoa(jsonString);
  const bytes = new TextEncoder().encode(base64String);
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return '0x' + hex;
}

/**
 * Get safe amount string for wallet SDK
 * Ensures no scientific notation and proper precision
 */
export function getSafeAmountForWallet(amount: number): string {
  return formatAmountSafe(amount);
}

/**
 * Check Octra transaction status via intents-api proxy (avoids CORS)
 */
export async function getOctraTxStatus(txHash: string): Promise<{
  found: boolean;
  status: 'pending' | 'confirmed' | 'failed' | 'unknown';
  epoch?: number;
}> {
  try {
    const response = await fetch(`${API_URL}/octra/tx/${txHash}`, { headers: getHeaders() });
    
    if (!response.ok) {
      console.log('[OctraProxy] Tx not found:', txHash);
      return { found: false, status: 'unknown' };
    }
    
    const data = await response.json();
    console.log('[OctraProxy] Tx data:', { status: data.status, epoch: data.epoch });
    
    return {
      found: true,
      status: data.status === 'confirmed' ? 'confirmed' : 
              data.status === 'failed' ? 'failed' : 'pending',
      epoch: data.epoch
    };
  } catch (error) {
    console.error('[OctraProxy] Error fetching tx:', error);
    return { found: false, status: 'unknown' };
  }
}

/**
 * Get current epoch via intents-api proxy (avoids CORS)
 */
export async function getCurrentEpoch(): Promise<number | null> {
  try {
    const response = await fetch(`${API_URL}/octra/status`, { headers: getHeaders() });
    if (!response.ok) {
      console.error('[OctraProxy] Failed to get status');
      return null;
    }
    const data = await response.json();
    const epoch = data.current_epoch || data.epoch || null;
    console.log('[OctraProxy] Current epoch:', epoch);
    return epoch;
  } catch (error) {
    console.error('[OctraProxy] Error fetching epoch:', error);
    return null;
  }
}

/**
 * Wait for Octra transaction to be confirmed using epoch-based logic
 * 
 * Logic:
 * 1. Record current epoch when tx is submitted
 * 2. Poll every 5s
 * 3. If epoch changes and tx is still pending → FAILED (tx didn't make it into the block)
 * 4. If tx is confirmed → SUCCESS
 */
export async function waitForOctraTxConfirmation(
  txHash: string,
  onStatusChange?: (status: string) => void,
  options: { timeoutMs?: number; pollIntervalMs?: number } = {}
): Promise<{ confirmed: boolean; status: string }> {
  const { timeoutMs = 120 * 1000, pollIntervalMs = 5000 } = options; // 120s timeout, poll every 5s
  const startTime = Date.now();
  
  console.log('[OctraRPC] Waiting for tx confirmation (epoch-based)...');
  console.log('[OctraRPC]   txHash:', txHash);
  console.log('[OctraRPC]   timeout:', timeoutMs, 'ms');
  console.log('[OctraRPC]   pollInterval:', pollIntervalMs, 'ms');
  
  // Get initial epoch
  const initialEpoch = await getCurrentEpoch();
  console.log('[OctraRPC]   initialEpoch:', initialEpoch);
  
  while (Date.now() - startTime < timeoutMs) {
    // Check tx status
    const txResult = await getOctraTxStatus(txHash);
    onStatusChange?.(txResult.status);
    
    // If confirmed, we're done
    if (txResult.status === 'confirmed') {
      console.log('[OctraRPC] ✅ Tx confirmed!');
      return { confirmed: true, status: 'confirmed' };
    }
    
    // If explicitly failed, we're done
    if (txResult.status === 'failed') {
      console.log('[OctraRPC] ❌ Tx failed!');
      return { confirmed: false, status: 'failed' };
    }
    
    // Check current epoch
    const currentEpoch = await getCurrentEpoch();
    console.log('[OctraRPC] Current epoch:', currentEpoch, ', Initial epoch:', initialEpoch);
    
    // If epoch has changed and tx is still pending, it failed to be included
    if (initialEpoch !== null && currentEpoch !== null && currentEpoch > initialEpoch) {
      // Double check tx status one more time
      const finalCheck = await getOctraTxStatus(txHash);
      if (finalCheck.status === 'confirmed') {
        console.log('[OctraRPC] ✅ Tx confirmed (final check)!');
        return { confirmed: true, status: 'confirmed' };
      }
      
      console.log('[OctraRPC] ❌ Epoch changed but tx still pending - tx failed to be included');
      return { confirmed: false, status: 'epoch_missed' };
    }
    
    console.log('[OctraRPC] Tx status:', txResult.status, '- waiting for next epoch...');
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
  
  console.log('[OctraRPC] ⏱️ Timeout waiting for confirmation');
  return { confirmed: false, status: 'timeout' };
}

/**
 * Submit intent to backend after OCT transaction is sent to escrow
 * 
 * IMPORTANT: Only send txHash - backend will fetch and verify from Octra RPC
 */
export async function submitIntent(octraTxHash: string): Promise<{
  intentId: string;
  status: string;
  message: string;
}> {
  console.log('[IntentsAPI] POST /swap/submit');
  console.log('[IntentsAPI]   octraTxHash:', octraTxHash);
  
  const response = await fetch(`${API_URL}/swap/submit`, {
    method: 'POST',
    headers: getHeaders(true),
    body: JSON.stringify({ octraTxHash }),
  });

  const result = await response.json();
  console.log('[IntentsAPI] Submit result:', result);

  if (!response.ok) {
    throw new Error(result.error || result.message || `Submit failed: ${response.status}`);
  }

  return result;
}

/**
 * Get intent status from backend
 */
export async function getIntentStatus(intentId: string): Promise<{
  intentId: string;
  status: 'OPEN' | 'FULFILLED' | 'EXPIRED' | 'REJECTED';
  direction?: 'OCT_TO_ETH' | 'ETH_TO_OCT';
  targetTxHash?: string;
  amountOut?: number;
}> {
  console.log('[IntentsAPI] GET /swap/' + intentId);
  
  const response = await fetch(`${API_URL}/swap/${intentId}`, { headers: getHeaders() });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Status check failed: ${response.status}`);
  }

  const status = await response.json();
  console.log('[IntentsAPI] Status:', status);
  return status;
}

/**
 * Poll until intent is fulfilled or terminal state
 */
export async function waitForFulfillment(
  intentId: string,
  onStatusChange?: (status: string) => void,
  options: { timeoutMs?: number; pollIntervalMs?: number } = {}
): Promise<{
  intentId: string;
  status: string;
  targetTxHash?: string;
  amountOut?: number;
}> {
  const { timeoutMs = 5 * 60 * 1000, pollIntervalMs = 2000 } = options;
  const startTime = Date.now();

  console.log('[IntentsAPI] Polling for fulfillment...');
  console.log('[IntentsAPI]   intentId:', intentId);
  console.log('[IntentsAPI]   timeout:', timeoutMs, 'ms');
  console.log('[IntentsAPI]   interval:', pollIntervalMs, 'ms');

  while (Date.now() - startTime < timeoutMs) {
    const status = await getIntentStatus(intentId);
    onStatusChange?.(status.status);

    if (status.status === 'FULFILLED' || status.status === 'EXPIRED' || status.status === 'REJECTED') {
      console.log('[IntentsAPI] Final status:', status.status, 'targetTxHash:', status.targetTxHash);
      return status;
    }

    console.log('[IntentsAPI] Status:', status.status, '- waiting...');
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error('Timeout waiting for fulfillment');
}


// =============================================================================
// ETH → OCT FUNCTIONS
// =============================================================================

/**
 * Submit ETH→OCT intent to backend after ETH transaction is sent to escrow
 * 
 * IMPORTANT: Only send txHash - backend will fetch and verify from Sepolia RPC
 */
export async function submitEthToOctIntent(sepoliaTxHash: string): Promise<{
  intentId: string;
  status: string;
  message: string;
}> {
  console.log('[IntentsAPI] POST /swap/eth-to-oct');
  console.log('[IntentsAPI]   sepoliaTxHash:', sepoliaTxHash);
  
  const response = await fetch(`${API_URL}/swap/eth-to-oct`, {
    method: 'POST',
    headers: getHeaders(true),
    body: JSON.stringify({ sepoliaTxHash }),
  });

  const result = await response.json();
  console.log('[IntentsAPI] Submit result:', result);

  if (!response.ok) {
    throw new Error(result.error || result.message || `Submit failed: ${response.status}`);
  }

  return result;
}

/**
 * Wait for Sepolia transaction confirmation
 * Uses intents-api proxy (no Etherscan API key needed)
 */
export async function waitForSepoliaTxConfirmation(
  txHash: string,
  onStatusChange?: (status: string) => void,
  options: { timeoutMs?: number; pollIntervalMs?: number } = {}
): Promise<{ confirmed: boolean; status: string }> {
  const { timeoutMs = 120 * 1000, pollIntervalMs = 5000 } = options;
  const startTime = Date.now();
  
  console.log('[SepoliaProxy] Waiting for tx confirmation...');
  console.log('[SepoliaProxy]   txHash:', txHash);
  
  while (Date.now() - startTime < timeoutMs) {
    try {
      const response = await fetch(`${API_URL}/sepolia/tx/${txHash}/status`, { headers: getHeaders() });
      const data = await response.json();
      
      console.log('[SepoliaProxy] Tx status:', data);
      
      if (data.found && data.status === 'confirmed') {
        console.log('[SepoliaProxy] ✅ Tx confirmed!');
        onStatusChange?.('confirmed');
        return { confirmed: true, status: 'confirmed' };
      }
      
      if (data.found && data.status === 'failed') {
        console.log('[SepoliaProxy] ❌ Tx failed!');
        onStatusChange?.('failed');
        return { confirmed: false, status: 'failed' };
      }
      
      onStatusChange?.('pending');
    } catch (error) {
      console.error('[SepoliaProxy] Error checking tx:', error);
    }
    
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
  
  console.log('[SepoliaProxy] ⏱️ Timeout waiting for confirmation');
  return { confirmed: false, status: 'timeout' };
}

/**
 * Get ETH balance for an address via intents-api proxy
 */
export async function getSepoliaBalance(address: string): Promise<number> {
  console.log('[SepoliaProxy] GET /sepolia/balance/' + address);
  
  try {
    const response = await fetch(`${API_URL}/sepolia/balance/${address}`, { headers: getHeaders() });
    
    if (!response.ok) {
      console.error('[SepoliaProxy] Failed to get balance');
      return 0;
    }
    
    const data = await response.json();
    console.log('[SepoliaProxy] Balance:', data.balance);
    return data.balance;
  } catch (error) {
    console.error('[SepoliaProxy] Error fetching balance:', error);
    return 0;
  }
}


// =============================================================================
// HISTORY FUNCTIONS
// =============================================================================

/**
 * Fetch swap history for a user address from backend
 */
export async function fetchSwapHistory(address: string, limit: number = 50): Promise<{
  address: string;
  count: number;
  swaps: Array<{
    id: string;
    direction: 'OCT_TO_ETH' | 'ETH_TO_OCT';
    status: string;
    payload: {
      fromAsset: string;
      toAsset: string;
      amountIn: number;
      minAmountOut: number;
      targetAddress: string;
    };
    sourceTxHash?: string;
    targetTxHash?: string;
    amountOut?: number;
    createdAt: number;
    fulfilledAt?: number;
    error?: string;
  }>;
}> {
  console.log('[IntentsAPI] GET /history/' + address);
  
  const response = await fetch(`${API_URL}/history/${address}?limit=${limit}`, { headers: getHeaders() });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Failed to fetch history: ${response.status}`);
  }
  
  const result = await response.json();
  console.log('[IntentsAPI] History:', result.count, 'swaps');
  return result;
}

// =============================================================================
// LIQUIDITY FUNCTIONS
// =============================================================================

export interface LiquidityStatus {
  oct: {
    balance: number;
    minRequired: number;
    sufficient: boolean;
  };
  eth: {
    balance: number;
    minRequired: number;
    sufficient: boolean;
  };
  canSwapOctToEth: boolean;
  canSwapEthToOct: boolean;
  operational: boolean;
}

/**
 * Check liquidity status for swaps
 */
export async function checkLiquidity(): Promise<LiquidityStatus> {
  console.log('[IntentsAPI] GET /liquidity');
  
  const response = await fetch(`${API_URL}/liquidity`, { headers: getHeaders() });
  
  if (!response.ok) {
    throw new Error('Failed to check liquidity');
  }
  
  const result = await response.json();
  console.log('[IntentsAPI] Liquidity:', result);
  return result;
}
