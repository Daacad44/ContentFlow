/**
 * src/services/socialProfile.service.ts
 * Maps workspaces to Zernio profiles (one profile per workspace).
 */
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { zernioClient } from '../lib/zernio.client';
import { ApiError } from '../utils/apiError';

export const socialProfileService = {
  assertZernioEnabled() {
    if (!env.zernioEnabled) {
      throw ApiError.badRequest(
        'Social account integration is not configured. Set ZERNIO_API_KEY.',
      );
    }
  },

  async ensureForWorkspace(workspaceId: string, workspaceName: string) {
    this.assertZernioEnabled();

    const existing = await prisma.socialProfile.findUnique({
      where: { workspaceId },
    });
    if (existing) return existing;

    const zernioProfile = await zernioClient.createProfile(
      workspaceName,
      `ContentFlow workspace profile`,
    );

    return prisma.socialProfile.create({
      data: {
        workspaceId,
        zernioProfileId: zernioProfile._id,
        name: zernioProfile.name,
      },
    });
  },

  async getByWorkspaceId(workspaceId: string) {
    return prisma.socialProfile.findUnique({ where: { workspaceId } });
  },

  async getByZernioProfileId(zernioProfileId: string) {
    return prisma.socialProfile.findUnique({ where: { zernioProfileId } });
  },
};
