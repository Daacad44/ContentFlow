import { z } from 'zod';
import { AuditCategory, AuditSeverity } from '@prisma/client';

export const listAuditLogsSchema = z.object({
  userId: z.string().uuid().optional(),
  workspaceId: z.string().uuid().optional(),
  category: z.nativeEnum(AuditCategory).optional(),
  severity: z.nativeEnum(AuditSeverity).optional(),
  action: z.string().max(100).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export const listLoginHistorySchema = z.object({
  userId: z.string().uuid().optional(),
  success: z
    .string()
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export const auditLogIdParamSchema = z.object({
  logId: z.string().uuid('Invalid log id.'),
});
