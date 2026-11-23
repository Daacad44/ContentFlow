/**
 * src/services/invitation.service.ts
 * Workspace invitation lifecycle: create, list, revoke, accept, decline.
 */
import { InvitationStatus, UsageMetric, WorkspaceRole } from '@prisma/client';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/apiError';
import { generateOpaqueToken, hashToken } from '../utils/tokens';
import { ASSIGNABLE_WORKSPACE_ROLES } from '../config/workspacePermissions';
import { emailService } from './email.service';
import { auditService, AUDIT } from './audit.service';
import { billingService } from './billing.service';
import { toPublicUser } from './auth.service';

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface PublicInvitation {
  id: string;
  email: string;
  role: WorkspaceRole;
  status: InvitationStatus;
  expiresAt: Date;
  createdAt: Date;
  invitedBy: { id: string; fullName: string; email: string };
}

function toPublicInvitation(
  inv: {
    id: string;
    email: string;
    role: WorkspaceRole;
    status: InvitationStatus;
    expiresAt: Date;
    createdAt: Date;
    invitedBy: { id: string; fullName: string; email: string };
  },
): PublicInvitation {
  return {
    id: inv.id,
    email: inv.email,
    role: inv.role,
    status: inv.status,
    expiresAt: inv.expiresAt,
    createdAt: inv.createdAt,
    invitedBy: {
      id: inv.invitedBy.id,
      fullName: inv.invitedBy.fullName,
      email: inv.invitedBy.email,
    },
  };
}

async function expireStaleInvitations(workspaceId: string) {
  await prisma.workspaceInvitation.updateMany({
    where: {
      workspaceId,
      status: InvitationStatus.PENDING,
      expiresAt: { lt: new Date() },
    },
    data: { status: InvitationStatus.EXPIRED },
  });
}

export const invitationService = {
  async list(workspaceId: string): Promise<PublicInvitation[]> {
    await expireStaleInvitations(workspaceId);
    const invitations = await prisma.workspaceInvitation.findMany({
      where: { workspaceId, status: InvitationStatus.PENDING },
      include: {
        invitedBy: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return invitations.map(toPublicInvitation);
  },

  async create(
    workspaceId: string,
    invitedById: string,
    input: { email: string; role?: WorkspaceRole },
    ctx: { ipAddress?: string; userAgent?: string } = {},
  ): Promise<{ invitation: PublicInvitation; rawToken: string }> {
    const email = input.email.toLowerCase().trim();
    const role = input.role ?? WorkspaceRole.MEMBER;

    if (!ASSIGNABLE_WORKSPACE_ROLES.includes(role)) {
      throw ApiError.badRequest('Invalid invitation role.');
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true, name: true, isActive: true },
    });
    if (!workspace || !workspace.isActive) {
      throw ApiError.notFound('Workspace not found.');
    }

    const existingMember = await prisma.workspaceMember.findFirst({
      where: { workspaceId, user: { email } },
    });
    if (existingMember) {
      throw ApiError.conflict('This user is already a member of the workspace.');
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      const alreadyMember = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId: existingUser.id } },
      });
      if (alreadyMember) {
        throw ApiError.conflict('This user is already a member of the workspace.');
      }
    }

    await expireStaleInvitations(workspaceId);

    const pending = await prisma.workspaceInvitation.findFirst({
      where: { workspaceId, email, status: InvitationStatus.PENDING },
    });
    if (pending) {
      throw ApiError.conflict('A pending invitation already exists for this email.');
    }

    // Members plus pending invitations count toward the plan's team-member limit.
    await billingService.assertWithinLimit(workspaceId, UsageMetric.TEAM_MEMBERS);

    const rawToken = generateOpaqueToken();
    const tokenHash = hashToken(rawToken);
    const inviter = await prisma.user.findUnique({
      where: { id: invitedById },
      select: { id: true, fullName: true, email: true },
    });
    if (!inviter) throw ApiError.notFound('Inviter not found.');

    const invitation = await prisma.workspaceInvitation.create({
      data: {
        workspaceId,
        email,
        role,
        tokenHash,
        invitedById,
        expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
      },
      include: {
        invitedBy: { select: { id: true, fullName: true, email: true } },
      },
    });

    await emailService.sendWorkspaceInvitationEmail(
      email,
      inviter.fullName,
      workspace.name,
      rawToken,
    );

    await auditService.record({
      action: AUDIT.INVITATION_SENT,
      userId: invitedById,
      metadata: { workspaceId, email, role },
      ...ctx,
    });

    return { invitation: toPublicInvitation(invitation), rawToken };
  },

  async revoke(
    workspaceId: string,
    actingUserId: string,
    invitationId: string,
    ctx: { ipAddress?: string; userAgent?: string } = {},
  ): Promise<void> {
    const invitation = await prisma.workspaceInvitation.findUnique({
      where: { id: invitationId },
    });
    if (!invitation || invitation.workspaceId !== workspaceId) {
      throw ApiError.notFound('Invitation not found.');
    }
    if (invitation.status !== InvitationStatus.PENDING) {
      throw ApiError.badRequest('Only pending invitations can be revoked.');
    }

    await prisma.workspaceInvitation.update({
      where: { id: invitationId },
      data: { status: InvitationStatus.REVOKED },
    });

    await auditService.record({
      action: AUDIT.INVITATION_REVOKED,
      userId: actingUserId,
      metadata: { workspaceId, invitationId },
      ...ctx,
    });
  },

  async resend(
    workspaceId: string,
    actingUserId: string,
    invitationId: string,
    ctx: { ipAddress?: string; userAgent?: string } = {},
  ): Promise<PublicInvitation> {
    const invitation = await prisma.workspaceInvitation.findUnique({
      where: { id: invitationId },
      include: {
        workspace: { select: { name: true } },
        invitedBy: { select: { id: true, fullName: true, email: true } },
      },
    });
    if (!invitation || invitation.workspaceId !== workspaceId) {
      throw ApiError.notFound('Invitation not found.');
    }
    if (invitation.status !== InvitationStatus.PENDING) {
      throw ApiError.badRequest('Only pending invitations can be resent.');
    }

    const rawToken = generateOpaqueToken();
    const tokenHash = hashToken(rawToken);

    const updated = await prisma.workspaceInvitation.update({
      where: { id: invitationId },
      data: {
        tokenHash,
        expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
      },
      include: {
        invitedBy: { select: { id: true, fullName: true, email: true } },
      },
    });

    await emailService.sendWorkspaceInvitationEmail(
      invitation.email,
      invitation.invitedBy.fullName,
      invitation.workspace.name,
      rawToken,
    );

    await auditService.record({
      action: AUDIT.INVITATION_RESENT,
      userId: actingUserId,
      metadata: { workspaceId, invitationId },
      ...ctx,
    });

    return toPublicInvitation(updated);
  },

  async preview(rawToken: string) {
    const tokenHash = hashToken(rawToken);
    const invitation = await prisma.workspaceInvitation.findUnique({
      where: { tokenHash },
      include: {
        workspace: { select: { id: true, name: true, slug: true, avatarUrl: true } },
        invitedBy: { select: { fullName: true } },
      },
    });

    if (!invitation) throw ApiError.notFound('Invitation not found.');
    if (invitation.status !== InvitationStatus.PENDING) {
      throw ApiError.badRequest('This invitation is no longer valid.');
    }
    if (invitation.expiresAt < new Date()) {
      await prisma.workspaceInvitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.EXPIRED },
      });
      throw ApiError.badRequest('This invitation has expired.');
    }

    return {
      email: invitation.email,
      role: invitation.role,
      workspace: invitation.workspace,
      invitedBy: invitation.invitedBy.fullName,
      expiresAt: invitation.expiresAt,
    };
  },

  async accept(
    rawToken: string,
    userId: string,
    ctx: { ipAddress?: string; userAgent?: string } = {},
  ) {
    const tokenHash = hashToken(rawToken);
    const invitation = await prisma.workspaceInvitation.findUnique({
      where: { tokenHash },
      include: { workspace: true },
    });

    if (!invitation) throw ApiError.notFound('Invitation not found.');
    if (invitation.status !== InvitationStatus.PENDING) {
      throw ApiError.badRequest('This invitation is no longer valid.');
    }
    if (invitation.expiresAt < new Date()) {
      await prisma.workspaceInvitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.EXPIRED },
      });
      throw ApiError.badRequest('This invitation has expired.');
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw ApiError.notFound('User not found.');
    if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      throw ApiError.forbidden('This invitation was sent to a different email address.');
    }

    const existing = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: invitation.workspaceId, userId } },
    });
    if (existing) {
      throw ApiError.conflict('You are already a member of this workspace.');
    }

    await prisma.$transaction([
      prisma.workspaceMember.create({
        data: {
          workspaceId: invitation.workspaceId,
          userId,
          role: invitation.role,
        },
      }),
      prisma.workspaceInvitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.ACCEPTED, acceptedAt: new Date() },
      }),
    ]);

    await auditService.record({
      action: AUDIT.INVITATION_ACCEPTED,
      userId,
      metadata: { workspaceId: invitation.workspaceId },
      ...ctx,
    });

    return {
      workspace: {
        id: invitation.workspace.id,
        name: invitation.workspace.name,
        slug: invitation.workspace.slug,
      },
      user: toPublicUser(user),
    };
  },

  async decline(rawToken: string, ctx: { ipAddress?: string; userAgent?: string } = {}) {
    const tokenHash = hashToken(rawToken);
    const invitation = await prisma.workspaceInvitation.findUnique({ where: { tokenHash } });
    if (!invitation) throw ApiError.notFound('Invitation not found.');
    if (invitation.status !== InvitationStatus.PENDING) {
      throw ApiError.badRequest('This invitation is no longer valid.');
    }

    await prisma.workspaceInvitation.update({
      where: { id: invitation.id },
      data: { status: InvitationStatus.DECLINED },
    });

    await auditService.record({
      action: AUDIT.INVITATION_DECLINED,
      metadata: { workspaceId: invitation.workspaceId, email: invitation.email },
      ...ctx,
    });
  },
};
