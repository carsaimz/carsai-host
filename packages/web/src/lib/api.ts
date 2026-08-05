/**
 * CARSAI HOST — API fetch wrapper
 * - Injecta o header Authorization com o access token
 * - Faz refresh transparente quando o access token expira (401)
 * - Normaliza erros num formato unico { code, message, details }
 * - Suporta query string, JSON body, multipart/form-data e blob
 */
import type { ApiResponse } from '@carsai/shared';
import { API_BASE_URL, ENDPOINTS } from './constants';

const ACCESS_TOKEN_KEY = 'carsai.accessToken';
const REFRESH_TOKEN_KEY = 'carsai.refreshToken';

let refreshPromise: Promise<boolean> | null = null;

// ─── Token storage (localStorage, injetado pelo authStore) ──────
export function getAccessToken(): string | null {
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}
export function setTokens(access: string, refresh: string): void {
  try {
    localStorage.setItem(ACCESS_TOKEN_KEY, access);
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  } catch {
    /* ignore */
  }
}
export function clearTokens(): void {
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}
export function getRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

// ─── Tipos de erro ─────────────────────────────────────────────
export interface ApiError extends Error {
  code: string;
  status: number;
  details?: Record<string, unknown>;
}
function makeError(code: string, message: string, status: number, details?: Record<string, unknown>): ApiError {
  const e = new Error(message) as ApiError;
  e.code = code;
  e.status = status;
  e.details = details;
  e.name = 'ApiError';
  return e;
}

// ─── Opcoes do request ────────────────────────────────────────
export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** Se true, retorna Blob em vez de JSON (para downloads). */
  blob?: boolean;
  /** Se true, nao injecta o Authorization header. */
  public?: boolean;
  /** Se true, nao tenta refresh automatico em 401. */
  noRefresh?: boolean;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== '') params.append(k, String(v));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

// ─── Refresh transparente ─────────────────────────────────────
async function tryRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}${ENDPOINTS.auth.refresh}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return false;
      const json = (await res.json()) as ApiResponse<{ accessToken: string; refreshToken: string }>;
      if (!json.success || !json.data) return false;
      setTokens(json.data.accessToken, json.data.refreshToken);
      // Notifica o authStore (escuta via evento custom)
      window.dispatchEvent(new CustomEvent('carsai:tokens-refreshed', { detail: json.data }));
      return true;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

// ─── Request principal ────────────────────────────────────────
export async function apiRequest<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { body, query, blob, public: isPublic, noRefresh, headers, ...rest } = opts;
  const url = buildUrl(path, query);

  const finalHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...(headers as Record<string, string>),
  };

  let reqBody: BodyInit | undefined;
  if (body !== undefined && body !== null) {
    if (body instanceof FormData) {
      reqBody = body;
      // Nao definir Content-Type: o browser poe o boundary automaticamente
    } else {
      finalHeaders['Content-Type'] = 'application/json';
      reqBody = JSON.stringify(body);
    }
  }

  if (!isPublic) {
    const token = getAccessToken();
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
  }

  const doFetch = (): Promise<Response> =>
    fetch(url, {
      ...rest,
      headers: finalHeaders,
      body: reqBody,
    });

  let res = await doFetch();

  // 401 → tenta refresh uma vez
  if (res.status === 401 && !isPublic && !noRefresh) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      const token = getAccessToken();
      if (token) finalHeaders.Authorization = `Bearer ${token}`;
      res = await doFetch();
    } else {
      clearTokens();
      window.dispatchEvent(new CustomEvent('carsai:session-expired'));
      throw makeError('UNAUTHORIZED', 'Sessao expirada. Inicie sessao novamente.', 401);
    }
  }

  // Blob response (download)
  if (blob) {
    if (!res.ok) {
      throw makeError('REQUEST_FAILED', `Request falhou (${res.status})`, res.status);
    }
    return (await res.blob()) as unknown as T;
  }

  // Parse JSON
  let json: ApiResponse<T> | null = null;
  try {
    json = (await res.json()) as ApiResponse<T>;
  } catch {
    throw makeError('INVALID_RESPONSE', 'Resposta invalida do servidor', res.status);
  }

  if (!res.ok || !json) {
    const code = json?.error?.code ?? 'REQUEST_FAILED';
    const message = json?.error?.message ?? `Erro ${res.status}`;
    throw makeError(code, message, res.status, json?.error?.details);
  }

  if (!json.success) {
    throw makeError(json.error?.code ?? 'UNKNOWN', json.error?.message ?? 'Erro desconhecido', res.status, json.error?.details);
  }

  return json.data as T;
}

// ─── Helpers semanticos ───────────────────────────────────────
export const api = {
  get: <T = unknown>(path: string, opts?: RequestOptions) =>
    apiRequest<T>(path, { ...opts, method: 'GET' }),
  post: <T = unknown>(path: string, body?: unknown, opts?: RequestOptions) =>
    apiRequest<T>(path, { ...opts, method: 'POST', body }),
  put: <T = unknown>(path: string, body?: unknown, opts?: RequestOptions) =>
    apiRequest<T>(path, { ...opts, method: 'PUT', body }),
  patch: <T = unknown>(path: string, body?: unknown, opts?: RequestOptions) =>
    apiRequest<T>(path, { ...opts, method: 'PATCH', body }),
  delete: <T = unknown>(path: string, opts?: RequestOptions) =>
    apiRequest<T>(path, { ...opts, method: 'DELETE' }),
  upload: <T = unknown>(path: string, formData: FormData, opts?: RequestOptions) =>
    apiRequest<T>(path, { ...opts, method: 'POST', body: formData }),
  download: (path: string, opts?: RequestOptions) =>
    apiRequest<Blob>(path, { ...opts, method: 'GET', blob: true }),
};

export default api;
