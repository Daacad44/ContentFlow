/**
 * OAuth redirect helpers — allow the frontend origin (e.g. Vercel) to be passed
 * via ?redirect= so Google sign-in returns to the correct site, not only CLIENT_URL.
 */
import { Request } from 'express';
import { env } from '../config/env';

/** Allowed frontend origins for post-OAuth redirects. */
export function isAllowedClientOrigin(origin: string): boolean {
  return env.corsOrigins.includes(origin);
}

/** Default callback URL from env (explicit GOOGLE_CALLBACK_URL or API_URL). */
export function defaultGoogleCallbackUrl(): string {
  const explicit = process.env.GOOGLE_CALLBACK_URL?.trim();
  if (explicit) return explicit;
  return `${env.API_URL.replace(/\/$/, '')}/api/v1/auth/google/callback`;
}

/**
 * Resolve the Google OAuth redirect_uri for this request.
 * Uses proxy headers (Vercel) so the URI matches the public URL Google must allow.
 */
export function resolveGoogleCallbackUrl(req: Request): string {
  const forwardedHost = req.get('x-forwarded-host')?.split(',')[0]?.trim();
  const forwardedProto = req.get('x-forwarded-proto')?.split(',')[0]?.trim() ?? 'https';

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}/api/v1/auth/google/callback`;
  }

  const host = req.get('host');
  if (host) {
    const proto = req.protocol || 'http';
    return `${proto}://${host}/api/v1/auth/google/callback`;
  }

  return defaultGoogleCallbackUrl();
}

/** All redirect URIs to register in Google Cloud Console. */
export function getGoogleOAuthRedirectUris(): string[] {
  const uris = new Set<string>([
    defaultGoogleCallbackUrl(),
    'http://localhost:4000/api/v1/auth/google/callback',
  ]);

  for (const origin of env.corsOrigins) {
    uris.add(`${origin.replace(/\/$/, '')}/api/v1/auth/google/callback`);
  }

  return [...uris];
}

/** Resolve ?redirect= to a whitelisted origin, else fall back to CLIENT_URL. */
export function parseRedirectTarget(raw: unknown): string {
  if (typeof raw !== 'string' || !raw.trim()) {
    return env.CLIENT_URL;
  }

  try {
    const origin = new URL(raw.trim()).origin;
    if (isAllowedClientOrigin(origin)) return origin;
  } catch {
    /* invalid URL */
  }

  return env.CLIENT_URL;
}

/** Encode the target origin (+ callback URL) into the OAuth `state` parameter. */
export function encodeOAuthState(redirectOrigin: string, callbackUrl?: string): string {
  const payload: { r: string; c?: string } = { r: redirectOrigin };
  if (callbackUrl) payload.c = callbackUrl;
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

/** Decode OAuth `state` back to a whitelisted origin. */
export function decodeOAuthState(state: unknown): string {
  if (typeof state !== 'string' || !state) {
    return env.CLIENT_URL;
  }

  try {
    const parsed = JSON.parse(Buffer.from(state, 'base64url').toString('utf8')) as {
      r?: string;
    };
    if (parsed.r && isAllowedClientOrigin(parsed.r)) {
      return parsed.r;
    }
  } catch {
    /* invalid state */
  }

  return env.CLIENT_URL;
}

/** Decode the callback URL stored in OAuth state (must match the authorize step). */
export function decodeOAuthCallbackFromState(state: unknown, req: Request): string {
  if (typeof state === 'string' && state) {
    try {
      const parsed = JSON.parse(Buffer.from(state, 'base64url').toString('utf8')) as {
        c?: string;
      };
      if (parsed.c) return parsed.c;
    } catch {
      /* invalid state */
    }
  }

  return resolveGoogleCallbackUrl(req);
}
