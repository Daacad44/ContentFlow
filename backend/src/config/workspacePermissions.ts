/**
 * src/config/workspacePermissions.ts
 * Workspace-scoped RBAC. Separate from platform roles — a user can be OWNER in
 * one workspace and VIEWER in another.
 */
import { WorkspaceRole } from '@prisma/client';

export const WORKSPACE_PERMISSIONS = {
  WORKSPACE_READ: 'workspace:read',
  WORKSPACE_UPDATE: 'workspace:update',
  WORKSPACE_DELETE: 'workspace:delete',
  WORKSPACE_SETTINGS: 'workspace:settings',
  MEMBER_LIST: 'member:list',
  MEMBER_INVITE: 'member:invite',
  MEMBER_UPDATE_ROLE: 'member:update_role',
  MEMBER_REMOVE: 'member:remove',
  INVITATION_LIST: 'invitation:list',
  INVITATION_REVOKE: 'invitation:revoke',
  POST_CREATE: 'post:create',
  POST_READ: 'post:read',
  POST_UPDATE: 'post:update',
  POST_DELETE: 'post:delete',
  POST_PUBLISH: 'post:publish',
  SOCIAL_CONNECT: 'social:connect',
  SOCIAL_DISCONNECT: 'social:disconnect',
  SOCIAL_SYNC: 'social:sync',
  AI_GENERATE: 'ai:generate',
  AI_TEMPLATE_MANAGE: 'ai:template_manage',
  CREATIVE_CREATE: 'creative:create',
  CREATIVE_READ: 'creative:read',
  BRAND_MANAGE: 'brand:manage',
  PUBLISH_LOGS_READ: 'publish:logs_read',
  PUBLISH_RETRY: 'publish:retry',
} as const;

export type WorkspacePermission =
  (typeof WORKSPACE_PERMISSIONS)[keyof typeof WORKSPACE_PERMISSIONS];

const VIEWER_PERMISSIONS: WorkspacePermission[] = [
  WORKSPACE_PERMISSIONS.WORKSPACE_READ,
  WORKSPACE_PERMISSIONS.MEMBER_LIST,
  WORKSPACE_PERMISSIONS.POST_READ,
];

const MEMBER_PERMISSIONS: WorkspacePermission[] = [
  ...VIEWER_PERMISSIONS,
  WORKSPACE_PERMISSIONS.POST_CREATE,
  WORKSPACE_PERMISSIONS.POST_UPDATE,
  WORKSPACE_PERMISSIONS.POST_DELETE,
  WORKSPACE_PERMISSIONS.POST_PUBLISH,
  WORKSPACE_PERMISSIONS.AI_GENERATE,
  WORKSPACE_PERMISSIONS.CREATIVE_CREATE,
  WORKSPACE_PERMISSIONS.CREATIVE_READ,
  WORKSPACE_PERMISSIONS.PUBLISH_LOGS_READ,
];

const ADMIN_PERMISSIONS: WorkspacePermission[] = [
  ...MEMBER_PERMISSIONS,
  WORKSPACE_PERMISSIONS.WORKSPACE_UPDATE,
  WORKSPACE_PERMISSIONS.WORKSPACE_SETTINGS,
  WORKSPACE_PERMISSIONS.MEMBER_INVITE,
  WORKSPACE_PERMISSIONS.MEMBER_UPDATE_ROLE,
  WORKSPACE_PERMISSIONS.MEMBER_REMOVE,
  WORKSPACE_PERMISSIONS.INVITATION_LIST,
  WORKSPACE_PERMISSIONS.INVITATION_REVOKE,
  WORKSPACE_PERMISSIONS.SOCIAL_CONNECT,
  WORKSPACE_PERMISSIONS.SOCIAL_DISCONNECT,
  WORKSPACE_PERMISSIONS.SOCIAL_SYNC,
  WORKSPACE_PERMISSIONS.AI_TEMPLATE_MANAGE,
  WORKSPACE_PERMISSIONS.BRAND_MANAGE,
  WORKSPACE_PERMISSIONS.PUBLISH_RETRY,
];

const OWNER_PERMISSIONS: WorkspacePermission[] = [
  ...ADMIN_PERMISSIONS,
  WORKSPACE_PERMISSIONS.WORKSPACE_DELETE,
];

export const WORKSPACE_ROLE_PERMISSIONS: Record<WorkspaceRole, WorkspacePermission[]> = {
  [WorkspaceRole.OWNER]: OWNER_PERMISSIONS,
  [WorkspaceRole.ADMIN]: ADMIN_PERMISSIONS,
  [WorkspaceRole.MEMBER]: MEMBER_PERMISSIONS,
  [WorkspaceRole.VIEWER]: VIEWER_PERMISSIONS,
};

export const WORKSPACE_ROLE_RANK: Record<WorkspaceRole, number> = {
  [WorkspaceRole.VIEWER]: 1,
  [WorkspaceRole.MEMBER]: 2,
  [WorkspaceRole.ADMIN]: 3,
  [WorkspaceRole.OWNER]: 4,
};

export function workspaceRoleHasPermission(
  role: WorkspaceRole,
  permission: WorkspacePermission,
): boolean {
  return WORKSPACE_ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/** Roles that can be assigned when inviting or updating members (not OWNER). */
export const ASSIGNABLE_WORKSPACE_ROLES: WorkspaceRole[] = [
  WorkspaceRole.ADMIN,
  WorkspaceRole.MEMBER,
  WorkspaceRole.VIEWER,
];
