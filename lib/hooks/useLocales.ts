'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getAdminTokenForCurrentRoute,
  getStoredAdminWorkplace,
  isAdminProtectedRoute,
  isRedirectingToAdminLogin,
  redirectToAdminLogin,
  shouldScopeAdminToLocal,
  shouldRedirectToAdminLogin,
  waitForAdminLoginRedirect,
} from '@/lib/auth/adminSession';

interface Local {
  id: number;
  nombre: string;
  activo: boolean;
  espacios: Array<{ tipo_espacio: string; cantidad_espacios: number }> | null;
  capacidad_mesas?: number;
  capacidad_bicis?: number;
}

interface UseLocalesReturn {
  locales: Local[];
  loading: boolean;
  error: string | null;
  fetchLocales: () => Promise<void>;
}

interface LocalesResponse {
  data?: {
    locales?: Local[];
  };
}

export function useLocales(): UseLocalesReturn {
  const [locales, setLocales] = useState<Local[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLocales = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = getAdminTokenForCurrentRoute();
      if (!token && isRedirectingToAdminLogin()) {
        await waitForAdminLoginRedirect<void>();
        return;
      }

      const res = await fetch('/api/bd/locales', {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      const response = await res.json() as LocalesResponse;

      if (!res.ok) {
        if (isAdminProtectedRoute() && shouldRedirectToAdminLogin(res.status, response)) {
          redirectToAdminLogin();
          if (isRedirectingToAdminLogin()) {
            await waitForAdminLoginRedirect<void>();
            return;
          }
        }
        throw new Error(`HTTP ${res.status}`);
      }

      const data = response.data?.locales ?? [];
      const activeLocales = data.filter((l: Local) => l.activo);
      const workplace = getStoredAdminWorkplace();
      const scopedLocales = shouldScopeAdminToLocal() && workplace
        ? activeLocales.filter((local) => local.id === workplace.local_id || local.nombre === workplace.nombre_local)
        : activeLocales;

      setLocales(scopedLocales);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar locales');
      setLocales([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocales();
  }, [fetchLocales]);

  return { locales, loading, error, fetchLocales };
}
