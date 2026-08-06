/**
 * CARSAI HOST — Standard API response helpers
 */
import type { Response } from 'express';
import type { ApiResponse } from '@carsai/shared';

export function ok<T>(res: Response, data: T, status = 200): Response {
  const body: ApiResponse<T> = { success: true, data };
  return res.status(status).json(body);
}

export function paginated<T>(
  res: Response,
  data: T[],
  meta: { page: number; limit: number; total: number },
): Response {
  const totalPages = Math.ceil(meta.total / meta.limit);
  const body: ApiResponse<T[]> = {
    success: true,
    data,
    meta: { ...meta, totalPages },
  };
  return res.json(body);
}

export function fail(
  res: Response,
  code: string,
  message: string,
  status = 400,
  details?: Record<string, unknown>,
): Response {
  const body: ApiResponse<never> = {
    success: false,
    error: { code, message, details },
  };
  return res.status(status).json(body);
}

export function notFound(res: Response, message = 'Resource not found'): Response {
  return fail(res, 'NOT_FOUND', message, 404);
}

export function unauthorized(res: Response, message = 'Unauthorized'): Response {
  return fail(res, 'UNAUTHORIZED', message, 401);
}

export function forbidden(res: Response, message = 'Forbidden'): Response {
  return fail(res, 'FORBIDDEN', message, 403);
}

export function serverError(res: Response, message = 'Internal server error'): Response {
  return fail(res, 'INTERNAL_ERROR', message, 500);
}
