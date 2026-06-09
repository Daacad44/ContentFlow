/**
 * src/middleware/rbac.middleware.ts
 * Role-Based Access Control guards. Use `requireRole` for coarse checks and
 * `requirePermission` for granular, permission-driven authorization.
 * Must run AFTER `authenticate`.
 */
import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { ApiError } from '../utils/apiError';
import {
  Permission,
  roleHasPermission,
  ROLE_RANK,
} from '../config/permissions';

/** Requires the user's role to be one of the allowed roles. */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden('You do not have access to this resource.'));
    }
    next();
  };
}

/** Requires the user's role to rank at least as high as `minRole`. */
export function requireMinRole(minRole: Role) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (ROLE_RANK[req.user.role] < ROLE_RANK[minRole]) {
      return next(ApiError.forbidden('Insufficient privileges.'));
    }
    next();
  };
}

/** Requires the user's role to grant ALL of the listed permissions. */
export function requirePermission(...permissions: Permission[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(ApiError.unauthorized());
    const ok = permissions.every((p) => roleHasPermission(req.user!.role, p));
    if (!ok) return next(ApiError.forbidden('Missing required permission.'));
    next();
  };
}
