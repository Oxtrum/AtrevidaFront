/**
 * Base API client — única fuente de fetch en todo el proyecto.
 * Centraliza: base URL, headers, manejo de errores y tipado.
 */

import {
  clearExpiredAdminSession,
  expireAdminSessionAndRedirect,
  getActiveAdminToken,
  isAdminProtectedRoute,
  isRedirectingToAdminLogin,
  requireActiveAdminSession,
  shouldRedirectToAdminLogin,
  waitForAdminLoginRedirect,
} from '@/lib/auth/adminSession';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

type AuthMode = 'admin' | 'optional' | 'none';

/**
 * Protected admin endpoints require an active token. Public endpoints can still
 * run without credentials, and stale admin credentials are ignored there.
 */
function resolveAuthMode(endpoint: string, explicitMode?: AuthMode): AuthMode {
  if (explicitMode) return explicitMode;
  if (!isAdminProtectedRoute()) return 'optional';
  if (endpoint.startsWith('/bd/')) return 'admin';
  if (endpoint.startsWith('/auth/') && endpoint !== '/auth/login') return 'admin';
  return 'optional';
}

function getAuthToken(authMode: AuthMode): string | null {
  if (authMode === 'none') return null;
  if (authMode === 'admin') return requireActiveAdminSession();

  if (clearExpiredAdminSession()) return null;
  return getActiveAdminToken();
}

// ─── Error tipado ──────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly data?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ─── Opciones ─────────────────────────────────────────────────────────────────

type RequestOptions = Omit<RequestInit, 'body'> & {
  params?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  auth?: AuthMode;
  /** Segundos de revalidación (solo server-side). 0 = sin caché. */
  revalidate?: number;
};

// ─── Cliente ──────────────────────────────────────────────────────────────────

async function request<T>(
  endpoint: string,
  { params, body, auth, revalidate = 0, ...init }: RequestOptions = {},
): Promise<T> {
  // Construir URL + query params
  const url = new URL(`${BASE_URL}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      const s = String(v);
      if (s === '') return;
      url.searchParams.set(k, s);
    });
  }

  const authMode = resolveAuthMode(endpoint, auth);
  const token = getAuthToken(authMode);

  if (authMode === 'admin' && !token && isRedirectingToAdminLogin()) {
    return waitForAdminLoginRedirect<T>();
  }

  const res = await fetch(url.toString(), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...init.headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    next: { revalidate },
  });

  // Intentar parsear siempre para incluir detalles en el error
  const json = await res.json().catch(() => null);

  if (!res.ok) {
    if (authMode === 'admin' && shouldRedirectToAdminLogin(res.status, json)) {
      expireAdminSessionAndRedirect();
      if (isRedirectingToAdminLogin()) return waitForAdminLoginRedirect<T>();
    }

    throw new ApiError(
      json?.message ?? `HTTP ${res.status}`,
      res.status,
      json,
    );
  }

  return json as T;
}

// ─── Métodos exportados ───────────────────────────────────────────────────────

export const apiClient = {
  get:    <T>(endpoint: string, opts?: RequestOptions) =>
    request<T>(endpoint, { method: 'GET', ...opts }),

  post:   <T>(endpoint: string, body: unknown, opts?: RequestOptions) =>
    request<T>(endpoint, { method: 'POST', body, ...opts }),

  put:    <T>(endpoint: string, body: unknown, opts?: RequestOptions) =>
    request<T>(endpoint, { method: 'PUT', body, ...opts }),

  patch:  <T>(endpoint: string, body: unknown, opts?: RequestOptions) =>
    request<T>(endpoint, { method: 'PATCH', body, ...opts }),

  delete: <T>(endpoint: string, opts?: RequestOptions) =>
    request<T>(endpoint, { method: 'DELETE', ...opts }),
};
