/**
 * src/config/permissions.ts
 * Role-Based Access Control (RBAC) definition. Roles map to a set of granular
 * permissions; middleware can authorize by role OR by permission. Keeping the
 * mapping in one place makes the access model auditable.
 */
import { Role } from '@prisma/client';

export const PERMISSIONS = {
  // Account / profile
  PROFILE_READ: 'profile:read',
  PROFILE_UPDATE: 'profile:update',
  // Content (example downstream resource the SaaS protects)
  POST_CREATE: 'post:create',
  POST_READ: 'post:read',
  POST_UPDATE: 'post:update',
  POST_DELETE: 'post:delete',
  POST_PUBLISH: 'post:publish',
  // Admin
  USER_LIST: 'user:list',
  USER_UPDATE_ROLE: 'user:update_role',
  USER_DEACTIVATE: 'user:deactivate',
  AUDIT_READ: 'audit:read',
  // Analytics (platform)
  ANALYTICS_READ: 'analytics:read',
  // Notifications (platform)
  NOTIFICATION_MANAGE: 'notification:manage',
  // Billing (platform)
  BILLING_MANAGE: 'billing:manage',
  // Admin panel
  ADMIN_DASHBOARD: 'admin:dashboard',
  ADMIN_SETTINGS: 'admin:settings',
  ADMIN_MONITORING: 'admin:monitoring',
  ADMIN_REPORTS: 'admin:reports',
  REVENUE_READ: 'revenue:read',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const USER_PERMISSIONS: Permission[] = [
  PERMISSIONS.PROFILE_READ,
  PERMISSIONS.PROFILE_UPDATE,
  PERMISSIONS.POST_CREATE,
  PERMISSIONS.POST_READ,
  PERMISSIONS.POST_UPDATE,
  PERMISSIONS.POST_DELETE,
  PERMISSIONS.POST_PUBLISH,
];

const ADMIN_PERMISSIONS: Permission[] = [
  ...USER_PERMISSIONS,
  PERMISSIONS.USER_LIST,
  PERMISSIONS.USER_DEACTIVATE,
  PERMISSIONS.AUDIT_READ,
  PERMISSIONS.ANALYTICS_READ,
  PERMISSIONS.ADMIN_DASHBOARD,
  PERMISSIONS.ADMIN_MONITORING,
  PERMISSIONS.ADMIN_REPORTS,
  PERMISSIONS.REVENUE_READ,
];

const SUPER_ADMIN_PERMISSIONS: Permission[] = [
  ...ADMIN_PERMISSIONS,
  PERMISSIONS.USER_UPDATE_ROLE,
  PERMISSIONS.NOTIFICATION_MANAGE,
  PERMISSIONS.BILLING_MANAGE,
  PERMISSIONS.ADMIN_SETTINGS,
];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.USER]: USER_PERMISSIONS,
  [Role.ADMIN]: ADMIN_PERMISSIONS,
  [Role.SUPER_ADMIN]: SUPER_ADMIN_PERMISSIONS,
};

export function roleHasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/** Role hierarchy used for "at least this role" checks. */
export const ROLE_RANK: Record<Role, number> = {
  [Role.USER]: 1,
  [Role.ADMIN]: 2,
  [Role.SUPER_ADMIN]: 3,
};
