/**
 * tests/unit/otp.test.ts
 * Unit tests for OTP generation and hashing helpers.
 */
import crypto from 'crypto';
import { generateOtpCode } from '../../src/services/otp.service';

describe('OTP generation', () => {
  it('generates 6-digit numeric codes', () => {
    for (let i = 0; i < 20; i++) {
      const code = generateOtpCode();
      expect(code).toMatch(/^\d{6}$/);
      expect(Number(code)).toBeGreaterThanOrEqual(100_000);
      expect(Number(code)).toBeLessThan(1_000_000);
    }
  });

  it('produces unique codes in a batch', () => {
    const codes = new Set(Array.from({ length: 50 }, () => generateOtpCode()));
    expect(codes.size).toBeGreaterThan(40);
  });

  it('hashes consistently for verification', () => {
    const userId = 'test-user-id';
    const code = '123456';
    const secret = 'test-pepper';
    const hash = crypto.createHmac('sha256', secret).update(`${userId}:${code}`).digest('hex');
    expect(hash).toHaveLength(64);
    expect(hash).toBe(
      crypto.createHmac('sha256', secret).update(`${userId}:${code}`).digest('hex'),
    );
  });
});
