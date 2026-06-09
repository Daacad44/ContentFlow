/**
 * src/services/token.service.ts
 * Manages refresh tokens (rotating, hashed at rest) and single-use
 * verification / password-reset tokens.
 *
 * Security properties:
 *  - Raw tokens are returned to the caller exactly once and never stored.
 *  - The DB only stores SHA-256 hashes, so a DB leak cannot be replayed.
 *  - Refresh tokens rotate: using one revokes it and issues a new one. Reuse of
 *    a revoked token triggers a full revoke of the user's token family
 *    (theft detection).
 */
import { TokenType } from '@prisma/client';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import {
  generateOpaqueToken,
  hashToken,
  parseDurationMs,
} from '../utils/tokens';

interface ClientContext {
  ipAddress?: string;
  userAgent?: string;
}

export const tokenService = {
  /** Issues a new refresh token, returns the raw value (store the hash). */
  async issueRefreshToken(userId: string, ctx: ClientContext = {}) {
    const raw = generateOpaqueToken();
    const tokenHash = hashToken(raw);
    const expiresAt = new Date(Date.now() + parseDurationMs(env.JWT_REFRESH_EXPIRES_IN));

    await prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
    });
    return raw;
  },

  /**
   * Validates a refresh token and rotates it. Returns the new raw refresh token
   * and the user id. Throws if the token is invalid, expired, or reused.
   */
  async rotateRefreshToken(raw: string, ctx: ClientContext = {}) {
    const tokenHash = hashToken(raw);
    const existing = await prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!existing) {
      return { ok: false as const, reason: 'NOT_FOUND' as const };
    }

    // Reuse of an already-rotated/revoked token => possible theft. Revoke all.
    if (existing.revokedAt || existing.replacedById) {
      await prisma.refreshToken.updateMany({
        where: { userId: existing.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return { ok: false as const, reason: 'REUSE_DETECTED' as const, userId: existing.userId };
    }

    if (existing.expiresAt.getTime() < Date.now()) {
      return { ok: false as const, reason: 'EXPIRED' as const };
    }

    // Rotate: create replacement, mark old as revoked + replaced.
    const newRaw = generateOpaqueToken();
    const newHash = hashToken(newRaw);
    const expiresAt = new Date(Date.now() + parseDurationMs(env.JWT_REFRESH_EXPIRES_IN));

    const replacement = await prisma.refreshToken.create({
      data: {
        userId: existing.userId,
        tokenHash: newHash,
        expiresAt,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
    });

    await prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date(), replacedById: replacement.id },
    });

    return { ok: true as const, userId: existing.userId, rawToken: newRaw };
  },

  /** Revokes a single refresh token (logout on current device). */
  async revokeRefreshToken(raw: string) {
    const tokenHash = hashToken(raw);
    await prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  /** Revokes every active refresh token for a user (logout everywhere). */
  async revokeAllForUser(userId: string) {
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  /** Creates a single-use verification/reset token; returns the raw value. */
  async createVerificationToken(userId: string, type: TokenType, ttlMs: number) {
    // Invalidate any outstanding tokens of the same type first.
    await prisma.verificationToken.updateMany({
      where: { userId, type, usedAt: null },
      data: { usedAt: new Date() },
    });

    const raw = generateOpaqueToken(32);
    const tokenHash = hashToken(raw);
    await prisma.verificationToken.create({
      data: { userId, type, tokenHash, expiresAt: new Date(Date.now() + ttlMs) },
    });
    return raw;
  },

  /** Consumes a verification/reset token. Returns the userId when valid. */
  async consumeVerificationToken(raw: string, type: TokenType) {
    const tokenHash = hashToken(raw);
    const record = await prisma.verificationToken.findUnique({ where: { tokenHash } });

    if (!record || record.type !== type) return { ok: false as const };
    if (record.usedAt) return { ok: false as const };
    if (record.expiresAt.getTime() < Date.now()) return { ok: false as const };

    await prisma.verificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });
    return { ok: true as const, userId: record.userId };
  },
};
