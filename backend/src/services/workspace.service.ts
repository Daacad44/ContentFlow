/**
 * src/services/workspace.service.ts
 * Workspace CRUD and default workspace provisioning for new users.
 */
import { Prisma, Workspace, WorkspaceRole } from '@prisma/client';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/apiError';
import { appendRandomSuffix, slugify } from '../utils/slug';
import { auditService, AUDIT } from './audit.service';

export interface PublicWorkspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceWithRole extends PublicWorkspace {
  role: WorkspaceRole;
  memberCount: number;
}

function toPublicWorkspace(workspace: Workspace): PublicWorkspace {
  return {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    description: workspace.description,
    avatarUrl: workspace.avatarUrl,
    isActive: workspace.isActive,
    createdAt: workspace.createdAt,
    updatedAt: workspace.updatedAt,
  };
}

async function generateUniqueSlug(name: string): Promise<string> {
  let base = slugify(name) || 'workspace';
  let slug = base;
  let attempt = 0;
  while (await prisma.workspace.findUnique({ where: { slug } })) {
    attempt += 1;
    slug = attempt > 5 ? appendRandomSuffix(base) : `${base}-${attempt}`;
  }
  return slug;
}

export const workspaceService = {
  toPublicWorkspace,

  /** Creates a personal workspace when a user registers or signs up via OAuth. */
  async createDefaultForUser(userId: string, fullName: string) {
    const name = `${fullName.split(' ')[0]}'s Workspace`;
    return this.create(userId, { name, description: 'Your personal workspace' });
  },

  async create(
    userId: string,
    input: { name: string; description?: string | null; avatarUrl?: string | null },
    ctx: { ipAddress?: string; userAgent?: string } = {},
  ): Promise<WorkspaceWithRole> {
    const slug = await generateUniqueSlug(input.name);
    const workspace = await prisma.$transaction(async (tx) => {
      const ws = await tx.workspace.create({
        data: {
          name: input.name.trim(),
          slug,
          description: input.description?.trim() || null,
          avatarUrl: input.avatarUrl ?? null,
        },
      });
      await tx.workspaceMember.create({
        data: { workspaceId: ws.id, userId, role: WorkspaceRole.OWNER },
      });
      return ws;
    });

    await auditService.record({
      action: AUDIT.WORKSPACE_CREATED,
      userId,
      metadata: { workspaceId: workspace.id, slug: workspace.slug },
      ...ctx,
    });

    return {
      ...toPublicWorkspace(workspace),
      role: WorkspaceRole.OWNER,
      memberCount: 1,
    };
  },

  async listForUser(userId: string): Promise<WorkspaceWithRole[]> {
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId, workspace: { isActive: true } },
      include: {
        workspace: { include: { _count: { select: { members: true } } } },
      },
      orderBy: { joinedAt: 'asc' },
    });

    return memberships.map((m) => ({
      ...toPublicWorkspace(m.workspace),
      role: m.role,
      memberCount: m.workspace._count.members,
    }));
  },

  async getById(workspaceId: string, userId: string): Promise<WorkspaceWithRole> {
    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      include: {
        workspace: { include: { _count: { select: { members: true } } } },
      },
    });
    if (!membership || !membership.workspace.isActive) {
      throw ApiError.notFound('Workspace not found.');
    }
    return {
      ...toPublicWorkspace(membership.workspace),
      role: membership.role,
      memberCount: membership.workspace._count.members,
    };
  },

  async update(
    workspaceId: string,
    userId: string,
    input: {
      name?: string;
      description?: string | null;
      avatarUrl?: string | null;
    },
    ctx: { ipAddress?: string; userAgent?: string } = {},
  ): Promise<PublicWorkspace> {
    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    if (!membership) throw ApiError.notFound('Workspace not found.');

    const data: Prisma.WorkspaceUpdateInput = {};
    if (input.name !== undefined) {
      data.name = input.name.trim();
      data.slug = await generateUniqueSlug(input.name);
    }
    if (input.description !== undefined) data.description = input.description;
    if (input.avatarUrl !== undefined) data.avatarUrl = input.avatarUrl;

    const workspace = await prisma.workspace.update({ where: { id: workspaceId }, data });
    await auditService.record({
      action: AUDIT.WORKSPACE_UPDATED,
      userId,
      metadata: { workspaceId },
      ...ctx,
    });
    return toPublicWorkspace(workspace);
  },

  async delete(
    workspaceId: string,
    userId: string,
    ctx: { ipAddress?: string; userAgent?: string } = {},
  ): Promise<void> {
    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    if (!membership) throw ApiError.notFound('Workspace not found.');
    if (membership.role !== WorkspaceRole.OWNER) {
      throw ApiError.forbidden('Only the workspace owner can delete it.');
    }

    const ownerCount = await prisma.workspaceMember.count({
      where: { workspaceId, role: WorkspaceRole.OWNER },
    });
    if (ownerCount !== 1) {
      throw ApiError.badRequest('Transfer ownership before deleting this workspace.');
    }

    await prisma.workspace.delete({ where: { id: workspaceId } });
    await auditService.record({
      action: AUDIT.WORKSPACE_DELETED,
      userId,
      metadata: { workspaceId },
      ...ctx,
    });
  },
};
