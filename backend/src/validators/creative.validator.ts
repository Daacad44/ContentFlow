/**
 * src/validators/creative.validator.ts
 */
import { z } from 'zod';
import { CreativeAssetType } from '@prisma/client';

export const generateCreativeSchema = z.object({
  prompt: z.string().min(1).max(2000),
  name: z.string().max(100).optional(),
  width: z.coerce.number().int().positive().optional(),
  height: z.coerce.number().int().positive().optional(),
});

export const updateBrandKitSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  fontHeading: z.string().max(100).optional(),
  fontBody: z.string().max(100).optional(),
  logoUrl: z.string().url().optional(),
});

export const createBrandTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.nativeEnum(CreativeAssetType),
  templateData: z.record(z.unknown()),
  previewUrl: z.string().url().optional(),
});

export const assetIdParamSchema = z.object({
  workspaceId: z.string().uuid(),
  assetId: z.string().uuid(),
});

export const listAssetsQuerySchema = z.object({
  type: z.nativeEnum(CreativeAssetType).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const listBrandTemplatesQuerySchema = z.object({
  type: z.nativeEnum(CreativeAssetType).optional(),
});
