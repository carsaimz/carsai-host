/**
 * CARSAI HOST — Error handler middleware
 */
import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { fail, serverError } from '../utils/response.js';
import { logger } from '../utils/logger.js';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return fail(res, 'VALIDATION_ERROR', 'Invalid input', 422, err.flatten());
  }

  if (err instanceof Error) {
    logger.error(`[error] ${err.message}`, { stack: err.stack, path: req.path });
    // Don't leak internals in production
    const message = process.env.NODE_ENV === 'production' && err.message.includes('ECONN')
      ? 'Service temporarily unavailable'
      : err.message;
    return serverError(res, message);
  }

  logger.error('[error] Unknown error', { error: String(err) });
  return serverError(res);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function notFoundHandler(req: Request, res: Response, _next: NextFunction) {
  return fail(res, 'NOT_FOUND', `Route not found: ${req.method} ${req.path}`, 404);
}
