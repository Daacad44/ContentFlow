/**
 * src/utils/tokens.ts
 * Helpers for JWT signing/verification and opaque random tokens.
 *
 *  - Access token: short-lived JWT, sent to the client and used as a Bearer.
 *  - Refresh token: long-lived opaque random string, stored hashed in the DB
 *    and delivered to the browser via an httpOnly cookie (rotated on use).
 *  - Verification / reset tokens: opaque random strings, stored hashed.
 */
import crypto from 'crypto';
import jwt, { SignOptions } from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { env } from '../config/env';

export interface AccessTokenPayload {
  sub: string; // user id
  email: string;
  role: Role;
  tokenVersion: number;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  const options: SignOptions = {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions['expiresIn'],
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, options);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, {
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  }) as AccessTokenPayload;
}

/** Cryptographically secure, URL-safe opaque token (raw value, never stored). */
export function generateOpaqueToken(bytes = 48): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

/** Deterministic SHA-256 hash used to store tokens at rest. */
export function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

/** Constant-time comparison to avoid timing attacks. */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/** Parses a duration string like "7d", "15m", "3600s" into milliseconds. */
export function parseDurationMs(input: string): number {
  const match = /^(\d+)\s*(ms|s|m|h|d)$/.exec(input.trim());
  if (!match) {
    const asNumber = Number(input);
    if (!Number.isNaN(asNumber)) return asNumber * 1000;
    throw new Error(`Invalid duration: ${input}`);
  }
  const value = Number(match[1]);
  const unit = match[2];
  const factor: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return value * factor[unit];
}
