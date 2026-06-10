import { z } from 'zod';

export const revenueRangeSchema = z.object({
  rangeDays: z.coerce.number().int().positive().max(365).default(30),
});

export const systemSettingKeyParamSchema = z.object({
  key: z.string().min(1).max(100),
});

export const upsertSystemSettingSchema = z.object({
  value: z.union([z.string(), z.number(), z.boolean(), z.record(z.unknown()), z.array(z.unknown())]),
});
