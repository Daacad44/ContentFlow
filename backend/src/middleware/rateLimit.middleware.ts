/**
 * src/middleware/rateLimit.middleware.ts
 * Rate limiters to blunt brute-force and abuse. Auth endpoints are stricter
 * than general API traffic.
 */
import rateLimit from 'express-rate-limit';
import { ApiError } from '../utils/apiError';

const handler = (_req: unknown, _res: unknown, next: (e: unknown) => void) =>
  next(ApiError.tooMany('Too many requests. Please slow down and try again later.'));

/** General API limiter — generous. */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

/** Strict limiter for login / register / refresh. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

/** Very strict limiter for password reset & verification email sending. */
export const sensitiveLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});
