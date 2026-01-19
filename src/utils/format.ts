/**
 * Shared formatting utilities
 */

// Minimum representable amounts (to avoid precision issues)
export const MIN_OCT_AMOUNT = 0.0001; // 0.0001 OCT
export const MIN_ETH_AMOUNT = 0.000001; // 1 gwei worth

/**
 * Format number tanpa scientific notation (e.g., 6e-7 → "0.0000006")
 * Penting untuk mengirim amount ke wallet
 * Handle baik string maupun number dari backend
 */
export function formatAmount(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (num === 0 || isNaN(num)) return '0';
  
  // Jika sudah string dan bukan scientific notation, return langsung
  if (typeof value === 'string' && !value.includes('e') && !value.includes('E')) {
    return value;
  }
  
  // Gunakan toFixed dengan precision tinggi
  const fixed = num.toFixed(18);
  // Hapus trailing zeros dan decimal point jika tidak perlu
  return fixed.replace(/\.?0+$/, '') || '0';
}

/**
 * Format display amount dengan fixed decimals
 * Handle baik string maupun number dari backend
 */
export function formatDisplayAmount(value: number | string, decimals: number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';
  return num.toFixed(decimals);
}

/**
 * Truncate address for display
 */
export function truncateAddress(addr: string, startChars = 6, endChars = 4): string {
  if (addr.length <= startChars + endChars) return addr;
  return `${addr.slice(0, startChars)}...${addr.slice(-endChars)}`;
}

/**
 * Format timestamp to locale string
 */
export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

/**
 * Format timestamp to time only
 */
export function formatTimeOnly(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString();
}

/**
 * Safely parse amount from string, handling scientific notation
 * Returns null if invalid or below minimum
 */
export function parseAmount(value: string, minAmount: number = 0): number | null {
  if (!value || value.trim() === '') return null;
  
  const num = parseFloat(value);
  if (isNaN(num) || !isFinite(num)) return null;
  if (num < 0) return null;
  if (num > 0 && num < minAmount) return null;
  
  return num;
}

/**
 * Convert amount to safe integer representation (micro units)
 * This avoids floating point precision issues
 * 1 OCT = 1,000,000 micro OCT
 * 1 ETH = 1,000,000,000,000,000,000 wei
 */
export function toMicroUnits(amount: number, decimals: number = 6): bigint {
  const multiplier = BigInt(10 ** decimals);
  // Use string to avoid floating point issues
  const amountStr = formatAmount(amount);
  const [whole, frac = ''] = amountStr.split('.');
  const fracPadded = frac.padEnd(decimals, '0').slice(0, decimals);
  return BigInt(whole || '0') * multiplier + BigInt(fracPadded);
}

/**
 * Convert micro units back to decimal amount
 */
export function fromMicroUnits(microAmount: bigint, decimals: number = 6): number {
  const multiplier = BigInt(10 ** decimals);
  const whole = microAmount / multiplier;
  const frac = microAmount % multiplier;
  const fracStr = frac.toString().padStart(decimals, '0');
  return parseFloat(`${whole}.${fracStr}`);
}

/**
 * Validate amount is within safe bounds and precision
 */
export function validateAmount(
  amount: number,
  minAmount: number,
  maxAmount: number,
  asset: 'OCT' | 'ETH'
): { valid: boolean; error?: string } {
  if (isNaN(amount) || !isFinite(amount)) {
    return { valid: false, error: 'Invalid amount' };
  }
  
  if (amount <= 0) {
    return { valid: false, error: 'Amount must be greater than 0' };
  }
  
  if (amount < minAmount) {
    return { valid: false, error: `Minimum amount is ${formatAmount(minAmount)} ${asset}` };
  }
  
  if (amount > maxAmount) {
    return { valid: false, error: `Maximum amount is ${formatAmount(maxAmount)} ${asset}` };
  }
  
  return { valid: true };
}
