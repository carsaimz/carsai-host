/**
 * CARSAI HOST — Auth middleware
 * Verifica JWT e popula req.user.
 */
import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../utils/auth.js';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { unauthorized, forbidden } from '../utils/response.js';
import type { User } from '@carsai/shared';

// Extend Express Request type
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        username: string;
        role: string;
        locale: string;
      };
      userRecord?: User;
    }
  }
}

export interface AuthOptions {
  required?: boolean;
  roles?: string[];
}

export function authMiddleware(opts: AuthOptions = {}) {
  const { required = true, roles = [] } = opts;

  return async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : undefined;

    if (!token) {
      if (required) return unauthorized(res, 'Token missing');
      return next();
    }

    try {
      const payload = verifyAccessToken(token);

      // Fetch fresh user from DB (in case role/status changed)
      const userRow = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, payload.sub))
        .limit(1);

      if (!userRow[0]) {
        return unauthorized(res, 'User not found');
      }

      const user = userRow[0];
      if (user.status === 'suspended' || user.status === 'banned') {
        return forbidden(res, 'Account suspended or banned');
      }

      if (roles.length && !roles.includes(user.role)) {
        return forbidden(res, 'Insufficient permissions');
      }

      req.user = {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        locale: user.locale,
      };
      req.userRecord = user as unknown as User;

      next();
    } catch (err) {
      if (required) {
        return unauthorized(
          res,
          err instanceof Error ? err.message : 'Invalid token',
        );
      }
      next();
    }
  };
}

export const requireAuth = authMiddleware({ required: true });
export const requireAdmin = authMiddleware({ required: true, roles: ['admin'] });
export const requireStaff = authMiddleware({
  required: true,
  roles: ['admin', 'moderator'],
});
export const optionalAuth = authMiddleware({ required: false });
