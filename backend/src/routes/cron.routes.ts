/**
 * src/routes/cron.routes.ts
 * Endpoints for scheduled jobs on serverless hosting, where no background worker runs.
 * Called by Vercel Cron or Supabase pg_cron with `Authorization: Bearer <CRON_SECRET>`.
 */
import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { env } from '../config/env';
import { ApiError } from '../utils/apiError';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/apiResponse';
import { postSchedulerService } from '../services/postScheduler.service';

const router = Router();

/** Constant-time check of the bearer token against CRON_SECRET. */
export function isValidCronAuth(header: string | undefined, secret: string): boolean {
  if (!secret || !header?.startsWith('Bearer ')) return false;
  const given = Buffer.from(header.slice('Bearer '.length));
  const expected = Buffer.from(secret);
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

function requireCronSecret(req: Request, _res: Response, next: NextFunction) {
  if (!env.cronEnabled) return next(ApiError.notFound());
  if (!isValidCronAuth(req.headers.authorization, env.CRON_SECRET)) {
    return next(ApiError.unauthorized('Invalid cron secret.'));
  }
  return next();
}

const publishDue = asyncHandler(async (_req: Request, res: Response) => {
  if (env.redisEnabled) {
    // BullMQ's worker publishes scheduled posts; running here too would race with it.
    return ok(res, { skipped: 'queue-enabled' });
  }
  const summary = await postSchedulerService.processDuePosts();
  return ok(res, summary);
});

// Vercel Cron sends GET; pg_net / other schedulers may POST.
router.get('/publish-due', requireCronSecret, publishDue);
router.post('/publish-due', requireCronSecret, publishDue);

export default router;
