/**
 * api/index.ts
 * Vercel serverless entry point. Every request is rewritten here (see vercel.json) and
 * handled by the same Express app that `src/server.ts` runs on a normal server.
 * Background work runs through /api/v1/internal/cron/* instead of in-process timers.
 */
/// <reference path="../src/types/express.d.ts" />
import type { IncomingMessage, ServerResponse } from 'http';
import { createApp } from '../src/app';

const app = createApp();

export default function handler(req: IncomingMessage, res: ServerResponse) {
  return app(req as Parameters<typeof app>[0], res as Parameters<typeof app>[1]);
}
