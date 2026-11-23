import { isValidCronAuth } from '../../src/routes/cron.routes';

describe('isValidCronAuth', () => {
  const secret = 'a'.repeat(64);

  it('accepts the exact bearer secret', () => {
    expect(isValidCronAuth(`Bearer ${secret}`, secret)).toBe(true);
  });

  it('rejects missing, malformed or wrong secrets', () => {
    expect(isValidCronAuth(undefined, secret)).toBe(false);
    expect(isValidCronAuth(secret, secret)).toBe(false);
    expect(isValidCronAuth('Bearer wrong', secret)).toBe(false);
    expect(isValidCronAuth(`Bearer ${secret}x`, secret)).toBe(false);
  });

  it('is disabled when no secret is configured', () => {
    expect(isValidCronAuth('Bearer ', '')).toBe(false);
  });
});
