/**
 * src/utils/requestContext.ts
 * Extracts client metadata (IP, user-agent) used for auditing and binding
 * refresh tokens to a device/session.
 */
import { Request } from 'express';

export function getClientContext(req: Request) {
  return {
    ipAddress: req.ip,
    userAgent: req.get('user-agent') ?? undefined,
  };
}
