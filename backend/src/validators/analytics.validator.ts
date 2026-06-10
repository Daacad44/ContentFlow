import { z } from 'zod';

export const analyticsDateRangeSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export const generateReportSchema = z.object({
  title: z.string().trim().min(1).max(200),
  type: z.enum(['engagement', 'reach', 'growth', 'performance']),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
});

export const reportIdParamSchema = z.object({
  workspaceId: z.string().uuid(),
  reportId: z.string().uuid(),
});
