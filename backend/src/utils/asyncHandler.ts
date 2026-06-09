/**
 * src/utils/asyncHandler.ts
 * Wraps async route handlers so rejected promises are forwarded to Express's
 * error-handling middleware instead of crashing the process.
 */
import { Request, Response, NextFunction, RequestHandler } from 'express';

export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
