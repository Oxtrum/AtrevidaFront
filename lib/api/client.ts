/**
 * Base API client — única fuente de fetch en todo el proyecto.
 * Centraliza: base URL, headers, manejo de errores y tipado.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

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
      if (v !== undefined) url.searchParams.set(k, String(v));
    });
  }

  const res = await fetch(url.toString(), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    next: { revalidate },
  });

  // Intentar parsear siempre para incluir detalles en el error
  const json = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(
      json?.error ?? `HTTP ${res.status}`,
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