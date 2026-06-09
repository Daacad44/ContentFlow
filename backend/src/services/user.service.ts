/**
 * src/services/user.service.ts
 * Profile management and admin user operations (RBAC-protected at the route).
 */
import { Prisma, Role } from '@prisma/client';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/apiError';
import { PublicUser, toPublicUser } from './auth.service';
import { tokenService } from './token.service';
import { auditService, AUDIT } from './audit.service';

export const userService = {
  async getById(userId: string): Promise<PublicUser> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw ApiError.notFound('User not found.');
    return toPublicUser(user);
  },

  /** Update the current user's profile. "Complete profile" sets the flag. */
  async updateProfile(
    userId: string,
    input: {
      fullName?: string;
      companyName?: string | null;
      timezone?: string;
      avatarUrl?: string | null;
    },
    ctx: { ipAddress?: string; userAgent?: string } = {},
  ): Promise<PublicUser> {
    const data: Prisma.UserUpdateInput = {};
    if (input.fullName !== undefined) data.fullName = input.fullName.trim();
    if (input.companyName !== undefined) data.companyName = input.companyName;
    if (input.timezone !== undefined) data.timezone = input.timezone;
    if (input.avatarUrl !== undefined) data.avatarUrl = input.avatarUrl;
    // Any successful profile update with a name marks the profile complete.
    data.profileComplete = true;

    const user = await prisma.user.update({ where: { id: userId }, data });
    await auditService.record({ action: AUDIT.PROFILE_UPDATED, userId, ...ctx });
    return toPublicUser(user);
  },

  // -------------------------- ADMIN OPERATIONS ----------------------------

  async list(params: { page: number; limit: number; search?: string }) {
    const { page, limit, search } = params;
    const where: Prisma.UserWhereInput = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' } },
            { fullName: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return {
      items: items.map(toPublicUser),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  /** Update a user's role (SUPER_ADMIN only). Revokes their sessions. */
  async updateRole(
    actingUserId: string,
    targetUserId: string,
    role: Role,
    ctx: { ipAddress?: string; userAgent?: string } = {},
  ): Promise<PublicUser> {
    if (actingUserId === targetUserId) {
      throw ApiError.badRequest('You cannot change your own role.');
    }
    const target = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!target) throw ApiError.notFound('User not found.');

    const user = await prisma.user.update({
      where: { id: targetUserId },
      data: { role, tokenVersion: { increment: 1 } },
    });
    await tokenService.revokeAllForUser(targetUserId);
    await auditService.record({
      action: AUDIT.PROFILE_UPDATED,
      userId: actingUserId,
      metadata: { targetUserId, newRole: role },
      ...ctx,
    });
    return toPublicUser(user);
  },

  /** Activate / deactivate a user (ADMIN+). Deactivation kills sessions. */
  async setActive(
    actingUserId: string,
    targetUserId: string,
    isActive: boolean,
    ctx: { ipAddress?: string; userAgent?: string } = {},
  ): Promise<PublicUser> {
    if (actingUserId === targetUserId) {
      throw ApiError.badRequest('You cannot change your own active status.');
    }
    const user = await prisma.user.update({
      where: { id: targetUserId },
      data: { isActive, tokenVersion: { increment: 1 } },
    });
    if (!isActive) {
      await tokenService.revokeAllForUser(targetUserId);
      await auditService.record({
        action: AUDIT.ACCOUNT_DEACTIVATED,
        userId: actingUserId,
        metadata: { targetUserId },
        ...ctx,
      });
    }
    return toPublicUser(user);
  },
};
