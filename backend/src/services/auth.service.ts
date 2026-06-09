/**
 * src/services/auth.service.ts
 * The heart of the authentication module. Pure business logic: it knows nothing
 * about Express. Controllers translate HTTP <-> these methods.
 */
import { AuthProvider, Role, TokenType, User } from '@prisma/client';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { ApiError } from '../utils/apiError';
import {
  hashPassword,
  verifyPassword,
  needsRehash,
} from '../utils/password';
import { signAccessToken } from '../utils/tokens';
import { tokenService } from './token.service';
import { emailService } from './email.service';
import { auditService, AUDIT } from './audit.service';
import { workspaceService } from './workspace.service';

const EMAIL_VERIFY_TTL = 24 * 60 * 60 * 1000; // 24h
const PASSWORD_RESET_TTL = 60 * 60 * 1000; // 1h

interface ClientContext {
  ipAddress?: string;
  userAgent?: string;
}

/** Shape returned to clients — never includes the password hash. */
export interface PublicUser {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  companyName: string | null;
  timezone: string;
  role: Role;
  provider: AuthProvider;
  emailVerified: boolean;
  profileComplete: boolean;
  createdAt: Date;
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    avatarUrl: user.avatarUrl,
    companyName: user.companyName,
    timezone: user.timezone,
    role: user.role,
    provider: user.provider,
    emailVerified: user.emailVerified,
    profileComplete: user.profileComplete,
    createdAt: user.createdAt,
  };
}

async function issueAuthTokens(user: User, ctx: ClientContext) {
  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    tokenVersion: user.tokenVersion,
  });
  const refreshToken = await tokenService.issueRefreshToken(user.id, ctx);
  return { accessToken, refreshToken };
}

export const authService = {
  /** REGISTER a new local account and send a verification email. */
  async register(
    input: { email: string; password: string; fullName: string },
    ctx: ClientContext,
  ) {
    const email = input.email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      // Do not reveal whether the email exists beyond a generic conflict.
      throw ApiError.conflict('An account with this email already exists.');
    }

    const passwordHash = await hashPassword(input.password);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName: input.fullName.trim(),
        provider: AuthProvider.LOCAL,
      },
    });

    const rawToken = await tokenService.createVerificationToken(
      user.id,
      TokenType.EMAIL_VERIFICATION,
      EMAIL_VERIFY_TTL,
    );
    await emailService.sendVerificationEmail(user.email, user.fullName, rawToken);
    await workspaceService.createDefaultForUser(user.id, user.fullName);
    await auditService.record({ action: AUDIT.REGISTER, userId: user.id, ...ctx });

    return toPublicUser(user);
  },

  /** LOGIN with email + password. Implements lockout after repeated failures. */
  async login(
    input: { email: string; password: string },
    ctx: ClientContext,
  ) {
    const email = input.email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email } });

    // Generic error to avoid user enumeration.
    const invalid = () => ApiError.unauthorized('Invalid email or password.');

    if (!user || !user.passwordHash) {
      await auditService.record({ action: AUDIT.LOGIN_FAILED, ...ctx, metadata: { email } });
      throw invalid();
    }

    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      await auditService.record({ action: AUDIT.LOGIN_LOCKED, userId: user.id, ...ctx });
      throw ApiError.tooMany(
        'Account temporarily locked due to too many failed attempts. Try again later.',
      );
    }

    if (!user.isActive) {
      throw ApiError.forbidden('This account has been deactivated.');
    }

    const valid = await verifyPassword(user.passwordHash, input.password);
    if (!valid) {
      const attempts = user.failedLoginAttempts + 1;
      const shouldLock = attempts >= env.MAX_LOGIN_ATTEMPTS;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: shouldLock ? 0 : attempts,
          lockedUntil: shouldLock
            ? new Date(Date.now() + env.LOCKOUT_MINUTES * 60_000)
            : null,
        },
      });
      await auditService.record({ action: AUDIT.LOGIN_FAILED, userId: user.id, ...ctx });
      throw invalid();
    }

    if (!user.emailVerified) {
      throw new ApiError(
        403,
        'Please verify your email address before logging in.',
        'EMAIL_NOT_VERIFIED',
      );
    }

    // Transparent hash upgrade if parameters changed.
    let current = user;
    if (needsRehash(user.passwordHash)) {
      const rehashed = await hashPassword(input.password);
      current = await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: rehashed },
      });
    }

    current = await prisma.user.update({
      where: { id: current.id },
      data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

    const tokens = await issueAuthTokens(current, ctx);
    await auditService.record({ action: AUDIT.LOGIN_SUCCESS, userId: current.id, ...ctx });
    return { user: toPublicUser(current), ...tokens };
  },

  /** Exchange a valid refresh token for a fresh access + refresh token pair. */
  async refresh(rawRefreshToken: string | undefined, ctx: ClientContext) {
    if (!rawRefreshToken) throw ApiError.unauthorized('Missing refresh token.');

    const result = await tokenService.rotateRefreshToken(rawRefreshToken, ctx);
    if (!result.ok) {
      if (result.reason === 'REUSE_DETECTED') {
        await auditService.record({
          action: AUDIT.TOKEN_REUSE_DETECTED,
          userId: result.userId,
          ...ctx,
        });
      }
      throw ApiError.unauthorized('Invalid or expired session. Please log in again.');
    }

    const user = await prisma.user.findUnique({ where: { id: result.userId } });
    if (!user || !user.isActive) {
      throw ApiError.unauthorized('Account is no longer active.');
    }

    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion,
    });
    await auditService.record({ action: AUDIT.TOKEN_REFRESH, userId: user.id, ...ctx });
    return { user: toPublicUser(user), accessToken, refreshToken: result.rawToken };
  },

  /** LOGOUT: revoke the presented refresh token (current device). */
  async logout(rawRefreshToken: string | undefined, ctx: ClientContext) {
    if (rawRefreshToken) {
      await tokenService.revokeRefreshToken(rawRefreshToken);
    }
    await auditService.record({ action: AUDIT.LOGOUT, ...ctx });
  },

  /** LOGOUT everywhere: bump tokenVersion (kills access tokens) + revoke all. */
  async logoutAll(userId: string) {
    await prisma.user.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } },
    });
    await tokenService.revokeAllForUser(userId);
  },

  /** EMAIL VERIFICATION. */
  async verifyEmail(rawToken: string, ctx: ClientContext) {
    const result = await tokenService.consumeVerificationToken(
      rawToken,
      TokenType.EMAIL_VERIFICATION,
    );
    if (!result.ok) throw ApiError.badRequest('Invalid or expired verification link.');

    const user = await prisma.user.update({
      where: { id: result.userId },
      data: { emailVerified: true },
    });
    await emailService.sendWelcomeEmail(user.email, user.fullName);
    await auditService.record({ action: AUDIT.EMAIL_VERIFIED, userId: user.id, ...ctx });
    return toPublicUser(user);
  },

  /** Resend verification email (idempotent, generic response). */
  async resendVerification(email: string) {
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (user && !user.emailVerified) {
      const rawToken = await tokenService.createVerificationToken(
        user.id,
        TokenType.EMAIL_VERIFICATION,
        EMAIL_VERIFY_TTL,
      );
      await emailService.sendVerificationEmail(user.email, user.fullName, rawToken);
    }
  },

  /** FORGOT PASSWORD: always returns success to prevent user enumeration. */
  async forgotPassword(email: string, ctx: ClientContext) {
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (user && user.isActive && user.passwordHash) {
      const rawToken = await tokenService.createVerificationToken(
        user.id,
        TokenType.PASSWORD_RESET,
        PASSWORD_RESET_TTL,
      );
      await emailService.sendPasswordResetEmail(user.email, user.fullName, rawToken);
      await auditService.record({
        action: AUDIT.PASSWORD_RESET_REQUESTED,
        userId: user.id,
        ...ctx,
      });
    }
  },

  /** RESET PASSWORD using a token. Revokes all sessions afterward. */
  async resetPassword(rawToken: string, newPassword: string, ctx: ClientContext) {
    const result = await tokenService.consumeVerificationToken(
      rawToken,
      TokenType.PASSWORD_RESET,
    );
    if (!result.ok) throw ApiError.badRequest('Invalid or expired reset link.');

    const passwordHash = await hashPassword(newPassword);
    const user = await prisma.user.update({
      where: { id: result.userId },
      data: {
        passwordHash,
        tokenVersion: { increment: 1 },
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
    await tokenService.revokeAllForUser(user.id);
    await emailService.sendPasswordChangedEmail(user.email, user.fullName);
    await auditService.record({
      action: AUDIT.PASSWORD_RESET_COMPLETED,
      userId: user.id,
      ...ctx,
    });
  },

  /** CHANGE PASSWORD for a logged-in user (requires current password). */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    ctx: ClientContext,
  ) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw ApiError.notFound('User not found.');

    if (!user.passwordHash) {
      // OAuth-only account setting a password for the first time.
      const passwordHash = await hashPassword(newPassword);
      await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    } else {
      const valid = await verifyPassword(user.passwordHash, currentPassword);
      if (!valid) throw ApiError.badRequest('Current password is incorrect.');

      const passwordHash = await hashPassword(newPassword);
      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash, tokenVersion: { increment: 1 } },
      });
    }

    // Revoke other sessions for safety; the caller gets fresh tokens.
    await tokenService.revokeAllForUser(userId);
    await emailService.sendPasswordChangedEmail(user.email, user.fullName);
    await auditService.record({ action: AUDIT.PASSWORD_CHANGED, userId, ...ctx });
  },

  /**
   * GOOGLE OAUTH: find-or-create a user from a verified Google profile, then
   * issue our own tokens. Links to an existing local account by email.
   */
  async loginWithGoogle(
    profile: { googleId: string; email: string; fullName: string; avatarUrl?: string },
    ctx: ClientContext,
  ) {
    const email = profile.email.toLowerCase().trim();
    let user = await prisma.user.findFirst({
      where: { OR: [{ googleId: profile.googleId }, { email }] },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          fullName: profile.fullName,
          avatarUrl: profile.avatarUrl,
          googleId: profile.googleId,
          provider: AuthProvider.GOOGLE,
          emailVerified: true, // Google has already verified the email.
        },
      });
      await workspaceService.createDefaultForUser(user.id, user.fullName);
    } else if (!user.googleId) {
      // Link Google to the existing account.
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: profile.googleId,
          emailVerified: true,
          avatarUrl: user.avatarUrl ?? profile.avatarUrl,
        },
      });
    }

    if (!user.isActive) throw ApiError.forbidden('This account has been deactivated.');

    user = await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await issueAuthTokens(user, ctx);
    await auditService.record({ action: AUDIT.OAUTH_LOGIN, userId: user.id, ...ctx });
    return { user: toPublicUser(user), ...tokens };
  },
};
