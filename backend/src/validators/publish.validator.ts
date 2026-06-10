/**
 * src/validators/publish.validator.ts
 */
import { z } from 'zod';
import { PublishJobStatus } from '@prisma/client';

export const listPublishJobsQuerySchema = z.object({
  status: z.nativeEnum(PublishJobStatus).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const publishJobIdParamSchema = z.object({
  workspaceId: z.string().uuid(),
  jobId: z.string().uuid(),
});
