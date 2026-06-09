/**
 * src/validators/workspace.validator.ts
 * Validation for workspace, member, and invitation operations.
 */
import { z } from 'zod';
import { WorkspaceRole } from '@prisma/client';
import { ASSIGNABLE_WORKSPACE_ROLES } from '../config/workspacePermissions';

export const workspaceIdParamSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace id.'),
});

export const memberIdParamSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace id.'),
  memberId: z.string().uuid('Invalid member id.'),
});

export const invitationIdParamSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace id.'),
  invitationId: z.string().uuid('Invalid invitation id.'),
});

export const createWorkspaceSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(80),
  description: z.string().trim().max(500).nullable().optional(),
  avatarUrl: z.string().url('Avatar must be a valid URL.').nullable().optional(),
});

export const updateWorkspaceSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  avatarUrl: z.string().url('Avatar must be a valid URL.').nullable().optional(),
});

export const inviteMemberSchema = z.object({
  email: z.string().trim().email('Invalid email address.'),
  role: z
    .nativeEnum(WorkspaceRole)
    .refine((r) => ASSIGNABLE_WORKSPACE_ROLES.includes(r), 'Invalid role.')
    .optional(),
});

export const updateMemberRoleSchema = z.object({
  role: z
    .nativeEnum(WorkspaceRole)
    .refine((r) => ASSIGNABLE_WORKSPACE_ROLES.includes(r), 'Invalid role.'),
});

export const transferOwnershipSchema = z.object({
  memberId: z.string().uuid('Invalid member id.'),
});

export const invitationTokenParamSchema = z.object({
  token: z.string().min(16, 'Invalid invitation token.'),
});

export const acceptInvitationSchema = z.object({
  token: z.string().min(16, 'Invalid invitation token.'),
});

export const declineInvitationSchema = z.object({
  token: z.string().min(16, 'Invalid invitation token.'),
});
