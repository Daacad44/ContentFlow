import { z } from 'zod';
import { NotificationCategory } from '@prisma/client';

export const listNotificationsSchema = z.object({
  unreadOnly: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(30),
});

export const notificationIdParamSchema = z.object({
  notificationId: z.string().uuid(),
});

export const updatePreferencesSchema = z.object({
  preferences: z
    .array(
      z.object({
        category: z.nativeEnum(NotificationCategory),
        emailEnabled: z.boolean(),
        inAppEnabled: z.boolean(),
      }),
    )
    .min(1),
});

export const createAlertRuleSchema = z.object({
  name: z.string().trim().min(1).max(100),
  metric: z.enum(['failed_posts', 'publish_failures', 'pending_posts']),
  condition: z.enum(['gt', 'gte', 'lt', 'lte', 'eq']),
  threshold: z.number(),
});

export const updateAlertRuleSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  threshold: z.number().optional(),
  isActive: z.boolean().optional(),
});

export const alertRuleIdParamSchema = z.object({
  workspaceId: z.string().uuid(),
  ruleId: z.string().uuid(),
});
