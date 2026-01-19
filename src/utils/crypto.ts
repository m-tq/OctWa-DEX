/**
 * Cryptographic utilities for secure payload encoding
 */

import type { SwapIntentPayload } from '@/types/intent';

/**
 * Encode payload as base64 for transmission
 * This ensures data integrity and prevents tampering during transit
 */
export function encodePayload(payload: SwapIntentPayload): string {
  const jsonString = JSON.stringify(payload);
  // Use btoa for browser compatibility
  return btoa(jsonString);
}

/**
 * Decode base64 payload back to object
 */
export function decodePayload(encoded: string): SwapIntentPayload | null {
  try {
    const jsonString = atob(encoded);
    return JSON.parse(jsonString);
  } catch {
    return null;
  }
}

/**
 * Create a deterministic hash of the payload for integrity verification
 * Uses Web Crypto API (available in browsers)
 */
export async function hashPayload(payload: SwapIntentPayload): Promise<string> {
  const jsonString = JSON.stringify(payload);
  const encoder = new TextEncoder();
  const data = encoder.encode(jsonString);
  
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Encode intent payload as hex for Octra tx message field
 * Format: { payload: SwapIntentPayload, hash: string }
 * The hash allows backend to verify payload wasn't tampered
 */
export async function encodeIntentForOctraTx(payload: SwapIntentPayload): Promise<string> {
  const hash = await hashPayload(payload);
  const envelope = {
    payload,
    hash,
    timestamp: Date.now(),
  };
  return JSON.stringify(envelope);
}

/**
 * Encode intent payload as hex for EVM tx data field
 * Format: 0x + hex(JSON({ payload, hash }))
 */
export async function encodeIntentForEvmTx(payload: SwapIntentPayload): Promise<string> {
  const hash = await hashPayload(payload);
  const envelope = {
    payload,
    hash,
    timestamp: Date.now(),
  };
  const jsonString = JSON.stringify(envelope);
  const bytes = new TextEncoder().encode(jsonString);
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return '0x' + hex;
}
