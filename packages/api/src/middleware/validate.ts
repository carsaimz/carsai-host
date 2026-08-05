/**
 * CARSAI HOST — Validation middleware (Zod)
 */
import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny, ZodError } from 'zod';
import { fail } from '../utils/response.js';

/**
 * Validate the request body / query / params against a Zod schema.
 *
 * Accepts any Zod type (ZodObject, ZodEffects, ZodIntersection, ...)
 * so schemas that use `.refine()` or `.superRefine()` work too.
 */
export function validate(schema: ZodTypeAny, source: 'body' | 'query' | 'params' = 'body') {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = await schema.parseAsync(req[source]);
      (req as Request & { body?: unknown; query?: unknown; params?: unknown })[source] = parsed;
      next();
    } catch (err) {
      if (err instanceof Error && 'errors' in err) {
        const zodErr = err as ZodError;
        const details = zodErr.flatten();
        return fail(res, 'VALIDATION_ERROR', 'Invalid input', 422, details);
      }
      return fail(res, 'VALIDATION_ERROR', 'Invalid input', 422);
    }
  };
}
