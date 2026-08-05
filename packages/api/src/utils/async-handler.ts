/**
 * CARSAI HOST — Async wrapper para handlers Express.
 * Evita try/catch repetitivo.
 */
import type { NextFunction, Request, Response, RequestHandler } from 'express';

export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
