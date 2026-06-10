import { decodeOAuthState, encodeOAuthState, parseRedirectTarget } from '../../src/utils/oauthRedirect';

describe('oauthRedirect', () => {
  it('encodes and decodes allowed origins', () => {
    const origin = 'https://content-flow-black.vercel.app';
    const state = encodeOAuthState(origin);
    expect(decodeOAuthState(state)).toBe(origin);
  });

  it('falls back to CLIENT_URL for unknown redirect', () => {
    expect(parseRedirectTarget('https://evil.example.com')).toBe(
      process.env.CLIENT_URL ?? 'http://localhost:5173',
    );
  });
});
