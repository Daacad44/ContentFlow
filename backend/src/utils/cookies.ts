/**
 * src/utils/cookies.ts
 * Centralised refresh-token cookie handling. The refresh token lives in an
 * httpOnly + Secure + SameSite cookie so it is inaccessible to JavaScript
 * (mitigates XSS token theft).
 */
import { Response, CookieOptions } from 'express';
import { env } from '../config/env';
import { parseDurationMs } from './tokens';

function baseCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.isProd, // requires HTTPS in production
    sameSite: env.isProd ? 'strict' : 'lax',
    path: '/api',
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
