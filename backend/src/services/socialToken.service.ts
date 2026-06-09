/**
 * src/services/socialToken.service.ts
 * OAuth state tokens for social connect flows (CSRF protection).
 */
import { SocialPlatform } from '@prisma/client';
import { prisma } from '../config/prisma';
import { generateOpaqueToken, hashToken } from '../utils/tokens';
import { ApiError } from '../utils/apiError';

const OAUTH_STATE_TTL_MS = 15 * 60 * 1000; // 15 minutes

export const socialTokenService = {
  async createOAuthState(params: {
    socialProfileId: string;
    platform: SocialPlatform;
    userId: string;
    redirectPath?: string;
  }): Promise<string> {
    const raw = generateOpaqueToken(32);
    const tokenHash = hashToken(raw);

    await prisma.socialOAuthState.create({
      data: {
        socialProfileId: params.socialProfileId,
        platform: params.platform,
        userId: params.userId,
        tokenHash,
        redirectPath: params.redirectPath ?? null,
        expiresAt: new Date(Date.now() + OAUTH_STATE_TTL_MS),
      },
    });

    return raw;
  },

  async consumeOAuthState(raw: string): Promise<{
    socialProfileId: string;
    platform: SocialPlatform;
    userId: string;
    redirectPath: string | null;
  }> {
    const tokenHash = hashToken(raw);
    const state = await prisma.socialOAuthState.findUnique({
      where: { tokenHash },
    });

    if (!state) throw ApiError.badRequest('Invalid or expired OAuth state.');
    if (state.usedAt) throw ApiError.badRequest('OAuth state already used.');
    if (state.expiresAt < new Date()) throw ApiError.badRequest('OAuth state expired.');

    await prisma.socialOAuthState.update({
      where: { id: state.id },
      data: { usedAt: new Date() },
    });

    return {
      socialProfileId: state.socialProfileId,
      platform: state.platform,
      userId: state.userId,
      redirectPath: state.redirectPath,
    };
  },

  async purgeExpiredStates(): Promise<number> {
    const result = await prisma.socialOAuthState.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return result.count;
  },
};
