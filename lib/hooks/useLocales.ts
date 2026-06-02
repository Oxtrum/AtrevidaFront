'use client';

import { useState, useEffect, useCallback } from 'react';

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
      const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
      const res = await fetch('/api/bd/locales', {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      const response = await res.json() as LocalesResponse;
      const data = response.data?.locales ?? [];
      setLocales(data.filter((l: Local) => l.activo));
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
