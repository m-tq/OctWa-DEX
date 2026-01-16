/**
 * OCTWA DEX Configuration
 */

// Intents API Backend
export const INTENTS_API_URL = import.meta.env.VITE_INTENTS_API_URL || 'http://localhost:3001';

// Circle for swap intents
export const SWAP_CIRCLE = 'swap_intent_v1';

// Intent expiry (5 minutes)
export const INTENT_EXPIRY_MS = 5 * 60 * 1000;

// Supported target chain
export const TARGET_CHAIN = 'ethereum_sepolia' as const;

// ETH Network Label (for UI display - empty string for mainnet)
export const ETH_NETWORK_LABEL = import.meta.env.VITE_ETH_NETWORK_LABEL || 'Sepolia';

// Capability methods
export const SWAP_METHODS = [
  'get_balance',
  'sign_intent',
  'send_transaction',
  'send_evm_transaction', // For ETH→OCT swaps
] as const;

// Block Explorers
export const OCTRA_EXPLORER = import.meta.env.VITE_OCTRA_EXPLORER || 'https://octrascan.io';
export const SEPOLIA_EXPLORER = import.meta.env.VITE_SEPOLIA_EXPLORER || 'https://sepolia.etherscan.io';

// Explorer URL builders
export const getOctraTxUrl = (txHash: string) => `${OCTRA_EXPLORER}/transactions/${txHash}`;
export const getSepoliaTxUrl = (txHash: string) => `${SEPOLIA_EXPLORER}/tx/${txHash}`;

// Default slippage (0.5%)
export const DEFAULT_SLIPPAGE_BPS = 50;
