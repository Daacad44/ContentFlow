/**
 * src/middleware/workspace.middleware.ts
 * Loads workspace membership from route params and enforces workspace-scoped RBAC.
 * Must run AFTER `authenticate`.
 */
import { Request, Response, NextFunction } from 'express';
import { WorkspaceRole } from '@prisma/client';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/apiError';
import {
  WorkspacePermission,
  WORKSPACE_ROLE_RANK,
  workspaceRoleHasPermission,
} from '../config/workspacePermissions';

async function loadMembership(workspaceId: string, userId: string) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, name: true, slug: true, isActive: true },
  });
  if (!workspace || !workspace.isActive) {
    throw ApiError.notFound('Workspace not found.');
  }

  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    select: { id: true, role: true, joinedAt: true },
  });
  if (!membership) {
    throw ApiError.forbidden('You are not a member of this workspace.');
  }

  return { workspace, membership };
}

/** Resolves `:workspaceId` from params and attaches workspace + membership to the request. */
export function requireWorkspaceMember() {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) return next(ApiError.unauthorized());
      const workspaceId = req.params.workspaceId;
      if (!workspaceId) return next(ApiError.badRequest('Workspace id is required.'));

      const { workspace, membership } = await loadMembership(workspaceId, req.user.id);
      req.workspace = workspace;
      req.workspaceMember = membership;
      next();
    } catch (err) {
      next(err);
    }
  };
}

/** Requires the member's workspace role to be one of the allowed roles. */
export function requireWorkspaceRole(...roles: WorkspaceRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.workspaceMember) {
      return next(ApiError.internal('Workspace membership not loaded.'));
    }
    if (!roles.includes(req.workspaceMember.role)) {
      return next(ApiError.forbidden('Insufficient workspace privileges.'));
    }
    next();
  };
}

/** Requires the member's workspace role to rank at least as high as `minRole`. */
export function requireMinWorkspaceRole(minRole: WorkspaceRole) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.workspaceMember) {
      return next(ApiError.internal('Workspace membership not loaded.'));
    }
    if (WORKSPACE_ROLE_RANK[req.workspaceMember.role] < WORKSPACE_ROLE_RANK[minRole]) {
      return next(ApiError.forbidden('Insufficient workspace privileges.'));
    }
    next();
  };
}

/** Requires ALL listed workspace permissions for the current member's role. */
export function requireWorkspacePermission(...permissions: WorkspacePermission[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.workspaceMember) {
      return next(ApiError.internal('Workspace membership not loaded.'));
    }
    const ok = permissions.every((p) =>
      workspaceRoleHasPermission(req.workspaceMember!.role, p),
    );
    if (!ok) return next(ApiError.forbidden('Missing required workspace permission.'));
    next();
  };
}
