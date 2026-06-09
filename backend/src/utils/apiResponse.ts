/**
 * src/utils/apiResponse.ts
 * Standard success envelope so every endpoint returns a predictable shape:
 * { success: true, message, data }
 */
import { Response } from 'express';

export function ok<T>(
  res: Response,
  data: T,
  message = 'OK',
  statusCode = 200,
): Response {
  return res.status(statusCode).json({ success: true, message, data });
}

export function created<T>(res: Response, data: T, message = 'Created'): Response {
  return ok(res, data, message, 201);
}
