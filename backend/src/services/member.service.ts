/**
 * src/services/member.service.ts
 * Workspace member listing, role changes, and removal.
 */
import { WorkspaceRole } from '@prisma/client';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/apiError';
import {
  ASSIGNABLE_WORKSPACE_ROLES,
  WORKSPACE_ROLE_RANK,
} from '../config/workspacePermissions';
import { auditService, AUDIT } from './audit.service';
import { toPublicUser, PublicUser } from './auth.service';

export interface PublicMember {
  id: string;
  role: WorkspaceRole;
  joinedAt: Date;
  user: PublicUser;
}

function toPublicMember(
  member: {
    id: string;
    role: WorkspaceRole;
    joinedAt: Date;
    user: Parameters<typeof toPublicUser>[0];
  },
): PublicMember {
  return {
    id: member.id,
    role: member.role,
    joinedAt: member.joinedAt,
    user: toPublicUser(member.user),
  };
}

export const memberService = {
  async list(workspaceId: string): Promise<PublicMember[]> {
    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: true },
      orderBy: [{ role: 'desc' }, { joinedAt: 'asc' }],
    });
    return members.map(toPublicMember);
  },

  async updateRole(
    workspaceId: string,
    actingUserId: string,
    memberId: string,
    role: WorkspaceRole,
    ctx: { ipAddress?: string; userAgent?: string } = {},
  ): Promise<PublicMember> {
    if (role === WorkspaceRole.OWNER) {
      throw ApiError.badRequest('Use transfer ownership to assign the owner role.');
    }
    if (!ASSIGNABLE_WORKSPACE_ROLES.includes(role)) {
      throw ApiError.badRequest('Invalid role.');
    }

    const [acting, target] = await Promise.all([
      prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId: actingUserId } },
      }),
      prisma.workspaceMember.findUnique({
        where: { id: memberId },
        include: { user: true },
      }),
    ]);

    if (!acting) throw ApiError.forbidden('You are not a member of this workspace.');
    if (!target || target.workspaceId !== workspaceId) {
      throw ApiError.notFound('Member not found.');
    }
    if (target.role === WorkspaceRole.OWNER) {
      throw ApiError.badRequest('Cannot change the workspace owner role.');
    }
    if (WORKSPACE_ROLE_RANK[acting.role] <= WORKSPACE_ROLE_RANK[target.role]) {
      throw ApiError.forbidden('You cannot modify a member with equal or higher privileges.');
    }
    if (WORKSPACE_ROLE_RANK[acting.role] <= WORKSPACE_ROLE_RANK[role]) {
      throw ApiError.forbidden('You cannot assign a role equal to or higher than your own.');
    }
    if (target.userId === actingUserId) {
      throw ApiError.badRequest('You cannot change your own role.');
    }

    const updated = await prisma.workspaceMember.update({
      where: { id: memberId },
      data: { role },
      include: { user: true },
    });

    await auditService.record({
      action: AUDIT.MEMBER_ROLE_UPDATED,
      userId: actingUserId,
      metadata: { workspaceId, memberId, newRole: role },
      ...ctx,
    });

    return toPublicMember(updated);
  },

  async remove(
    workspaceId: string,
    actingUserId: string,
    memberId: string,
    ctx: { ipAddress?: string; userAgent?: string } = {},
  ): Promise<void> {
    const [acting, target] = await Promise.all([
      prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId: actingUserId } },
      }),
      prisma.workspaceMember.findUnique({ where: { id: memberId } }),
    ]);

    if (!acting) throw ApiError.forbidden('You are not a member of this workspace.');
    if (!target || target.workspaceId !== workspaceId) {
      throw ApiError.notFound('Member not found.');
    }
    if (target.role === WorkspaceRole.OWNER) {
      throw ApiError.badRequest('Cannot remove the workspace owner.');
    }
    if (target.userId === actingUserId) {
      throw ApiError.badRequest('Use leave workspace to remove yourself.');
    }
    if (WORKSPACE_ROLE_RANK[acting.role] <= WORKSPACE_ROLE_RANK[target.role]) {
      throw ApiError.forbidden('You cannot remove a member with equal or higher privileges.');
    }

    await prisma.workspaceMember.delete({ where: { id: memberId } });
    await auditService.record({
      action: AUDIT.MEMBER_REMOVED,
      userId: actingUserId,
      metadata: { workspaceId, removedUserId: target.userId },
      ...ctx,
    });
  },

  async leave(
    workspaceId: string,
    userId: string,
    ctx: { ipAddress?: string; userAgent?: string } = {},
  ): Promise<void> {
    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    if (!membership) throw ApiError.notFound('You are not a member of this workspace.');
    if (membership.role === WorkspaceRole.OWNER) {
      const ownerCount = await prisma.workspaceMember.count({
        where: { workspaceId, role: WorkspaceRole.OWNER },
      });
      if (ownerCount === 1) {
        throw ApiError.badRequest(
          'Transfer ownership or delete the workspace before leaving.',
        );
      }
    }

    await prisma.workspaceMember.delete({ where: { id: membership.id } });
    await auditService.record({
      action: AUDIT.MEMBER_LEFT,
      userId,
      metadata: { workspaceId },
      ...ctx,
    });
  },

  async transferOwnership(
    workspaceId: string,
    actingUserId: string,
    targetMemberId: string,
    ctx: { ipAddress?: string; userAgent?: string } = {},
  ): Promise<PublicMember> {
    const [acting, target] = await Promise.all([
      prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId: actingUserId } },
      }),
      prisma.workspaceMember.findUnique({
        where: { id: targetMemberId },
        include: { user: true },
      }),
    ]);

    if (!acting || acting.role !== WorkspaceRole.OWNER) {
      throw ApiError.forbidden('Only the workspace owner can transfer ownership.');
    }
    if (!target || target.workspaceId !== workspaceId) {
      throw ApiError.notFound('Member not found.');
    }
    if (target.userId === actingUserId) {
      throw ApiError.badRequest('You are already the owner.');
    }

    const [, updatedTarget] = await prisma.$transaction([
      prisma.workspaceMember.update({
        where: { id: acting.id },
        data: { role: WorkspaceRole.ADMIN },
      }),
      prisma.workspaceMember.update({
        where: { id: target.id },
        data: { role: WorkspaceRole.OWNER },
        include: { user: true },
      }),
    ]);

    await auditService.record({
      action: AUDIT.OWNERSHIP_TRANSFERRED,
      userId: actingUserId,
      metadata: { workspaceId, newOwnerId: target.userId },
      ...ctx,
    });

    return toPublicMember(updatedTarget);
  },
};
