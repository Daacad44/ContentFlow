import { z } from 'zod';

export const checkoutSchema = z.object({
  planSlug: z.enum(['pro', 'business']),
});

export const listBillingSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});
