import { describe, it, expect } from 'vitest';
import { formatAmount, formatDisplayAmount, truncateAddress, formatTime } from './format';

describe('formatAmount', () => {
  it('should format zero', () => {
    expect(formatAmount(0)).toBe('0');
    expect(formatAmount('0')).toBe('0');
  });

  it('should format regular numbers', () => {
    expect(formatAmount(100)).toBe('100');
    expect(formatAmount('100')).toBe('100');
  });

  it('should handle scientific notation', () => {
    expect(formatAmount(6e-7)).toBe('0.0000006');
    expect(formatAmount('6e-7')).toBe('0.0000006');
  });

  it('should handle NaN', () => {
    expect(formatAmount(NaN)).toBe('0');
  });
});

describe('formatDisplayAmount', () => {
  it('should format with specified decimals', () => {
    expect(formatDisplayAmount(100.123456, 2)).toBe('100.12');
    expect(formatDisplayAmount(100.123456, 4)).toBe('100.1235');
  });

  it('should handle string input', () => {
    expect(formatDisplayAmount('100.123456', 2)).toBe('100.12');
  });

  it('should handle NaN', () => {
    expect(formatDisplayAmount(NaN, 2)).toBe('0');
    expect(formatDisplayAmount('invalid', 2)).toBe('0');
  });
});

describe('truncateAddress', () => {
  it('should truncate long addresses', () => {
    const addr = '0x1234567890abcdef1234567890abcdef12345678';
    expect(truncateAddress(addr)).toBe('0x1234...5678');
  });

  it('should handle custom lengths', () => {
    const addr = '0x1234567890abcdef1234567890abcdef12345678';
    expect(truncateAddress(addr, 8, 6)).toBe('0x123456...345678');
  });

  it('should return short addresses as-is', () => {
    expect(truncateAddress('0x1234')).toBe('0x1234');
  });
});

describe('formatTime', () => {
  it('should format timestamp to locale string', () => {
    const timestamp = new Date('2024-01-15T10:30:00').getTime();
    const result = formatTime(timestamp);
    expect(result).toContain('2024');
  });
});
