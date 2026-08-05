/**
 * CARSAI HOST -- Installer API fetch wrapper
 *
 * Talks to the backend install routes at:
 *  - GET  /api/v1/install/status   -> { installed: boolean }
 *  - POST /api/v1/install/run      -> performs install (admin user, .env, lockfile)
 *  - POST /api/v1/install/test-db  -> tests SQLite connection + runs migrations
 *  - POST /api/v1/install/test-mofh -> tests MOFH credentials
 *  - POST /api/v1/install/test-smtp -> sends a test email
 *
 * The dev server (vite.config.ts) proxies /api to http://localhost:3000.
 */

const API_BASE_URL = '/api/v1/install';

export interface ApiError extends Error {
  code: string;
  status: number;
  details?: Record<string, unknown>;
}

function makeError(
  code: string,
  message: string,
  status: number,
  details?: Record<string, unknown>,
): ApiError {
  const e = new Error(message) as ApiError;
  e.code = code;
  e.status = status;
  e.details = details;
  e.name = 'ApiError';
  return e;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: Record<string, unknown> };
}

async function request<T>(
  path: string,
  opts: { method?: string; body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  const { method = 'GET', body, signal } = opts;
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  let reqBody: BodyInit | undefined;
  if (body !== undefined && body !== null) {
    headers['Content-Type'] = 'application/json';
    reqBody = JSON.stringify(body);
  }

  let res: Response;
  try {
    res = await fetch(url, { method, headers, body: reqBody, signal });
  } catch (err) {
    throw makeError(
      'NETWORK_ERROR',
      err instanceof Error ? err.message : 'Network request failed',
      0,
    );
  }

  let json: ApiResponse<T> | null = null;
  try {
    json = (await res.json()) as ApiResponse<T>;
  } catch {
    throw makeError('INVALID_RESPONSE', 'Server returned a non-JSON response', res.status);
  }

  if (!res.ok || !json) {
    const code = json?.error?.code ?? 'REQUEST_FAILED';
    const message = json?.error?.message ?? `Request failed (${res.status})`;
    throw makeError(code, message, res.status, json?.error?.details);
  }

  if (!json.success || json.data === undefined) {
    throw makeError(
      json?.error?.code ?? 'UNKNOWN',
      json?.error?.message ?? 'Unknown error',
      res.status,
      json?.error?.details,
    );
  }

  return json.data as T;
}

// ─── Typed endpoints ──────────────────────────────────────────
import type {
  InstallStatus,
  InstallRunInput,
  InstallRunResult,
  TestDbInput,
  TestDbResult,
  TestMofhInput,
  TestMofhResult,
  TestSmtpInput,
  TestSmtpResult,
  RequirementsResult,
} from './types';

export const installApi = {
  getStatus: (signal?: AbortSignal) =>
    request<InstallStatus>('/status', { signal }),

  getRequirements: (signal?: AbortSignal) =>
    request<RequirementsResult>('/requirements', { signal }),

  run: (payload: InstallRunInput) =>
    request<InstallRunResult>('/run', { method: 'POST', body: payload }),

  testDb: (payload: TestDbInput) =>
    request<TestDbResult>('/test-db', { method: 'POST', body: payload }),

  testMofh: (payload: TestMofhInput) =>
    request<TestMofhResult>('/test-mofh', { method: 'POST', body: payload }),

  testSmtp: (payload: TestSmtpInput) =>
    request<TestSmtpResult>('/test-smtp', { method: 'POST', body: payload }),
};

export default installApi;
