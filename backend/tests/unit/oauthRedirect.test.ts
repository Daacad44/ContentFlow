import {
  decodeOAuthCallbackFromState,
  decodeOAuthState,
  encodeOAuthState,
  getGoogleOAuthRedirectUris,
  parseRedirectTarget,
  resolveGoogleCallbackUrl,
} from '../../src/utils/oauthRedirect';
import { Request } from 'express';

describe('oauthRedirect', () => {
  it('encodes and decodes allowed origins', () => {
    const origin = 'https://content-flow-black.vercel.app';
    const callback = 'https://content-flow-black.vercel.app/api/v1/auth/google/callback';
    const state = encodeOAuthState(origin, callback);
    expect(decodeOAuthState(state)).toBe(origin);
    expect(decodeOAuthCallbackFromState(state, {} as Request)).toBe(callback);
  });

  it('falls back to CLIENT_URL for unknown redirect', () => {
    expect(parseRedirectTarget('https://evil.example.com')).toBe(
      process.env.CLIENT_URL ?? 'http://localhost:5173',
    );
  });

  it('uses X-Forwarded-Host for callback URL behind Vercel proxy', () => {
    const req = {
      get: (name: string) => {
        if (name === 'x-forwarded-host') return 'content-flow-black.vercel.app';
        if (name === 'x-forwarded-proto') return 'https';
        return undefined;
      },
      protocol: 'http',
    } as unknown as Request;

    expect(resolveGoogleCallbackUrl(req)).toBe(
      'https://content-flow-black.vercel.app/api/v1/auth/google/callback',
    );
  });

  it('lists redirect URIs for Google Console', () => {
    const uris = getGoogleOAuthRedirectUris();
    expect(uris).toContain('http://localhost:4000/api/v1/auth/google/callback');
    expect(uris).toContain('https://content-flow-black.vercel.app/api/v1/auth/google/callback');
  });
});
