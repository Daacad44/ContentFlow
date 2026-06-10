/**
 * OAuth redirect helpers — allow the frontend origin (e.g. Vercel) to be passed
 * via ?redirect= so Google sign-in returns to the correct site, not only CLIENT_URL.
 */
import { env } from '../config/env';

/** Allowed frontend origins for post-OAuth redirects. */
export function isAllowedClientOrigin(origin: string): boolean {
  return env.corsOrigins.includes(origin);
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

/** Encode the target origin into the OAuth `state` parameter. */
export function encodeOAuthState(redirectOrigin: string): string {
  return Buffer.from(JSON.stringify({ r: redirectOrigin }), 'utf8').toString('base64url');
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
