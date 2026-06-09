/**
 * src/middleware/auth.middleware.ts
 * Authenticates requests using the Bearer access token. On success it attaches
 * `req.user`. It also enforces tokenVersion so that "logout everywhere",
 * password changes, and role changes immediately invalidate old access tokens.
 */
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/apiError';
import { verifyAccessToken } from '../utils/tokens';

function extractBearer(req: Request): string | null {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) return header.slice(7).trim();
  return null;
}

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = extractBearer(req);
    if (!token) throw ApiError.unauthorized('Authentication required.');

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      throw ApiError.unauthorized('Invalid or expired access token.');
    }

    // Validate the token version against the DB (cheap, indexed PK lookup).
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, tokenVersion: true, isActive: true },
    });

    if (!user || !user.isActive) throw ApiError.unauthorized('Account is not active.');
    if (user.tokenVersion !== payload.tokenVersion) {
      throw ApiError.unauthorized('Session expired. Please log in again.');
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion,
    };
    next();
  } catch (err) {
    next(err);
  }
}

/** Optional authentication: attaches req.user when a valid token is present. */
export async function optionalAuthenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const token = extractBearer(req);
  if (!token) return next();
  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      tokenVersion: payload.tokenVersion,
    };
  } catch {
    /* ignore invalid token in optional mode */
  }
  next();
}
