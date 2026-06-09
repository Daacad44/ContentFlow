/**
 * src/validators/user.validator.ts
 * Validation for profile management and admin user operations.
 */
import { z } from 'zod';
import { Role } from '@prisma/client';

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(100).optional(),
  companyName: z.string().trim().max(120).nullable().optional(),
  timezone: z.string().trim().max(64).optional(),
  avatarUrl: z.string().url('Avatar must be a valid URL.').nullable().optional(),
});

export const listUsersSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().max(100).optional(),
});

export const userIdParamSchema = z.object({
  id: z.string().uuid('Invalid user id.'),
});

export const updateRoleSchema = z.object({
  role: z.nativeEnum(Role),
});

export const setActiveSchema = z.object({
  isActive: z.boolean(),
});
