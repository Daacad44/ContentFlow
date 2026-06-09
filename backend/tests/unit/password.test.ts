/**
 * tests/unit/password.test.ts
 * Pure unit tests for password hashing + token helpers (no DB required).
 */
import { hashPassword, verifyPassword } from '../../src/utils/password';
import { hashToken, safeEqual, parseDurationMs, generateOpaqueToken } from '../../src/utils/tokens';

describe('password hashing', () => {
  it('hashes and verifies a correct password', async () => {
    const hash = await hashPassword('Sup3rSecret!');
    expect(hash).not.toBe('Sup3rSecret!');
    await expect(verifyPassword(hash, 'Sup3rSecret!')).resolves.toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword('Sup3rSecret!');
    await expect(verifyPassword(hash, 'wrong')).resolves.toBe(false);
  });
});

describe('token helpers', () => {
  it('produces stable SHA-256 hashes', () => {
    expect(hashToken('abc')).toBe(hashToken('abc'));
    expect(hashToken('abc')).not.toBe(hashToken('abd'));
  });

  it('safeEqual compares constant time correctly', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'abcd')).toBe(false);
  });

  it('generates unique opaque tokens', () => {
    expect(generateOpaqueToken()).not.toBe(generateOpaqueToken());
  });

  it('parses durations', () => {
    expect(parseDurationMs('15m')).toBe(900_000);
    expect(parseDurationMs('7d')).toBe(604_800_000);
    expect(parseDurationMs('30s')).toBe(30_000);
  });
});
