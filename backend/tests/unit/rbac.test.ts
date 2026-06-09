/**
 * tests/unit/rbac.test.ts
 * Unit tests for the RBAC permission matrix.
 */
import { Role } from '@prisma/client';
import { PERMISSIONS, roleHasPermission, ROLE_RANK } from '../../src/config/permissions';

describe('RBAC permissions', () => {
  it('grants base permissions to USER', () => {
    expect(roleHasPermission(Role.USER, PERMISSIONS.POST_CREATE)).toBe(true);
    expect(roleHasPermission(Role.USER, PERMISSIONS.USER_LIST)).toBe(false);
  });

  it('grants admin permissions to ADMIN but not role changes', () => {
    expect(roleHasPermission(Role.ADMIN, PERMISSIONS.USER_LIST)).toBe(true);
    expect(roleHasPermission(Role.ADMIN, PERMISSIONS.USER_UPDATE_ROLE)).toBe(false);
  });

  it('grants everything to SUPER_ADMIN', () => {
    expect(roleHasPermission(Role.SUPER_ADMIN, PERMISSIONS.USER_UPDATE_ROLE)).toBe(true);
  });

  it('ranks roles hierarchically', () => {
    expect(ROLE_RANK[Role.SUPER_ADMIN]).toBeGreaterThan(ROLE_RANK[Role.ADMIN]);
    expect(ROLE_RANK[Role.ADMIN]).toBeGreaterThan(ROLE_RANK[Role.USER]);
  });
});
