/**
 * src/utils/cookies.ts
 * Centralised refresh-token cookie handling. The refresh token lives in an
 * httpOnly + Secure + SameSite cookie so it is inaccessible to JavaScript
 * (mitigates XSS token theft).
 */
import { Response, CookieOptions } from 'express';
import { env } from '../config/env';
import { parseDurationMs } from './tokens';

function crossOriginClient(): boolean {
  try {
    return new URL(env.CLIENT_URL).origin !== new URL(env.API_URL).origin;
  } catch {
    return false;
  }
}

function resolveSameSite(): CookieOptions['sameSite'] {
  if (env.COOKIE_SAME_SITE === 'none') return 'none';
  if (env.COOKIE_SAME_SITE === 'strict') return 'strict';
  if (env.COOKIE_SAME_SITE === 'lax') return 'lax';
  if (crossOriginClient()) return 'none';
  return env.isProd ? 'strict' : 'lax';
}

function baseCookieOptions(): CookieOptions {
  const sameSite = resolveSameSite();
  return {
    httpOnly: true,
    secure: sameSite === 'none' || env.isProd,
    sameSite,
    path: '/',
  };
}

export function setRefreshCookie(res: Response, token: string): void {
  res.cookie(env.REFRESH_COOKIE_NAME, token, {
    ...baseCookieOptions(),
    maxAge: parseDurationMs(env.JWT_REFRESH_EXPIRES_IN),
  });
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(env.REFRESH_COOKIE_NAME, baseCookieOptions());
}
