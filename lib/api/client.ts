/**
 * Base API client — única fuente de fetch en todo el proyecto.
 * Centraliza: base URL, headers, manejo de errores y tipado.
 */

import { redirectToAdminLogin, shouldRedirectToAdminLogin } from '@/lib/auth/adminSession';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

/**
 * Reads the admin token from localStorage on the client.
 * Returns null on the server or when the user is not authenticated.
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem('adminToken');
  } catch {
    return null;
  }
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
  params?: Record<string, string | number | undefined>;
  body?: unknown;
  /** Segundos de revalidación (solo server-side). 0 = sin caché. */
  revalidate?: number;
};

// ─── Cliente ──────────────────────────────────────────────────────────────────

async function request<T>(
  endpoint: string,
  { params, body, revalidate = 0, ...init }: RequestOptions = {},
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

  const token = getAuthToken();
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
    if (shouldRedirectToAdminLogin(res.status, json)) {
      redirectToAdminLogin();
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
