/**
 * src/validators/social.validator.ts
 * Validation for social account operations.
 */
import { z } from 'zod';
import { SocialPlatform } from '@prisma/client';

export const socialAccountIdParamSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace id.'),
  accountId: z.string().uuid('Invalid account id.'),
});

export const connectPlatformSchema = z.object({
  platform: z.nativeEnum(SocialPlatform),
  redirectPath: z.string().trim().max(200).optional(),
});

export const listSelectionSchema = z.object({
  platform: z.nativeEnum(SocialPlatform),
  profileId: z.string().min(1),
  tempToken: z.string().min(1),
  connectToken: z.string().optional(),
});

export const completeSelectionSchema = z.object({
  platform: z.nativeEnum(SocialPlatform),
  profileId: z.string().min(1),
  itemId: z.string().min(1),
  tempToken: z.string().min(1),
  connectToken: z.string().optional(),
  userProfile: z.record(z.unknown()),
});
