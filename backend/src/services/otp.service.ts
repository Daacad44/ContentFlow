/**
 * src/services/otp.service.ts
 * Secure 6-digit OTP lifecycle: generate → hash → store → verify → invalidate.
 *
 * Security:
 *  - OTPs are hashed with HMAC-SHA256 before storage (never stored in plain text).
 *  - Single-use: marked used after successful verification.
 *  - 10-minute expiry (configurable via OTP_EXPIRY_MINUTES).
 *  - Brute-force protection via per-OTP attempt counter.
 *  - Resend cooldown prevents email bombing.
 */
import crypto from 'crypto';
import { OtpPurpose } from '@prisma/client';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { ApiError } from '../utils/apiError';

function hashOtp(code: string, userId: string): string {
  const secret = env.OTP_PEPPER || env.PASSWORD_PEPPER || 'botan-dev-otp';
  return crypto.createHmac('sha256', secret).update(`${userId}:${code}`).digest('hex');
}

/** Cryptographically secure 6-digit numeric OTP. */
export function generateOtpCode(): string {
  return crypto.randomInt(100_000, 1_000_000).toString();
}

export const otpService = {
  /**
   * Creates a new OTP for the user. Invalidates any existing unused OTPs of the
   * same purpose. Returns the plain code (send via email only — never log in prod).
   */
  async create(userId: string, purpose: OtpPurpose): Promise<string> {
    const code = generateOtpCode();
    const codeHash = hashOtp(code, userId);
    const expiresAt = new Date(Date.now() + env.OTP_EXPIRY_MINUTES * 60_000);

    await prisma.$transaction([
      prisma.otpCode.updateMany({
        where: { userId, purpose, usedAt: null },
        data: { usedAt: new Date() },
      }),
      prisma.otpCode.create({
        data: { userId, purpose, codeHash, expiresAt },
      }),
    ]);

    return code;
  },

  /** Enforces resend cooldown based on the most recent OTP for this purpose. */
  async assertResendAllowed(userId: string, purpose: OtpPurpose): Promise<void> {
    const latest = await prisma.otpCode.findFirst({
      where: { userId, purpose },
      orderBy: { createdAt: 'desc' },
    });
    if (!latest) return;

    const elapsed = Date.now() - latest.createdAt.getTime();
    const cooldownMs = env.OTP_RESEND_COOLDOWN_SECONDS * 1000;
    if (elapsed < cooldownMs) {
      const waitSec = Math.ceil((cooldownMs - elapsed) / 1000);
      throw ApiError.tooMany(
        `Please wait ${waitSec} seconds before requesting a new code.`,
      );
    }
  },

  /**
   * Verifies an OTP. On failure increments attempt counter; locks OTP after max
   * attempts. On success marks OTP as used.
   */
  async verify(
    userId: string,
    code: string,
    purpose: OtpPurpose,
  ): Promise<{ ok: true } | { ok: false; reason: string }> {
    const record = await prisma.otpCode.findFirst({
      where: { userId, purpose, usedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) return { ok: false, reason: 'NOT_FOUND' };
    if (record.expiresAt.getTime() < Date.now()) return { ok: false, reason: 'EXPIRED' };
    if (record.attempts >= env.OTP_MAX_VERIFY_ATTEMPTS) {
      return { ok: false, reason: 'LOCKED' };
    }

    const expectedHash = hashOtp(code, userId);
    const valid = crypto.timingSafeEqual(
      Buffer.from(record.codeHash),
      Buffer.from(expectedHash),
    );

    if (!valid) {
      await prisma.otpCode.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      return { ok: false, reason: 'INVALID' };
    }

    await prisma.otpCode.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });

    return { ok: true };
  },

  /** Removes all OTPs for a user/purpose after successful operation. */
  async invalidateAll(userId: string, purpose: OtpPurpose): Promise<void> {
    await prisma.otpCode.updateMany({
      where: { userId, purpose, usedAt: null },
      data: { usedAt: new Date() },
    });
  },
};
