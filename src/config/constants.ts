/**
 * Application constants
 * Centralized magic numbers and configuration values
 */

// Polling intervals
export const POLLING_INTERVAL_MS = 5000;
export const QUOTE_DEBOUNCE_MS = 300;

// Timeouts
export const TX_CONFIRMATION_TIMEOUT_MS = 120_000;
export const FULFILLMENT_TIMEOUT_MS = 5 * 60 * 1000;

// Delays
export const BALANCE_REFRESH_DELAY_MS = 2000;
export const STATUS_RESET_DELAY_MS = 3000;

// Pagination
export const DEFAULT_PAGE_SIZE = 15;
export const DEFAULT_HISTORY_LIMIT = 50;

// Decimals for display
export const OCT_DECIMALS = 4;
export const ETH_DECIMALS = 6;
