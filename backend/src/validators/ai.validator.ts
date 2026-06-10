/**
 * src/validators/ai.validator.ts
 */
import { z } from 'zod';
import { ContentTemplateType } from '@prisma/client';

export const generateContentSchema = z.object({
  topic: z.string().min(1).max(500),
  tone: z.string().max(100).optional(),
  platform: z.string().max(50).optional(),
  audience: z.string().max(200).optional(),
  keywords: z.array(z.string().max(50)).max(20).optional(),
  language: z.string().max(50).optional(),
  brandVoice: z.string().max(200).optional(),
});

export const generateCalendarSchema = generateContentSchema.extend({
  days: z.coerce.number().int().min(1).max(30).default(7),
  postsPerDay: z.coerce.number().int().min(1).max(5).default(1),
});

export const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.nativeEnum(ContentTemplateType),
  content: z.string().min(1).max(10000),
  prompt: z.string().max(2000).optional(),
  variables: z.record(z.string()).optional(),
});

export const updateTemplateSchema = createTemplateSchema.partial();

export const templateIdParamSchema = z.object({
  workspaceId: z.string().uuid(),
  templateId: z.string().uuid(),
});

export const listGeneratedQuerySchema = z.object({
  type: z.nativeEnum(ContentTemplateType).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const listTemplatesQuerySchema = z.object({
  type: z.nativeEnum(ContentTemplateType).optional(),
});
