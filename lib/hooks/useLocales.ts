'use client';

import { useState, useEffect, useCallback } from 'react';
import { getLocalesDB } from '@/lib/api/servicios';

interface Local {
  id: number;
  nombre: string;
  activo: boolean;
  espacios: Array<{ tipo_espacio: string; cantidad_espacios: number }> | null;
}

interface UseLocalesReturn {
  locales: Local[];
  loading: boolean;
  error: string | null;
  fetchLocales: () => Promise<void>;
}

export function useLocales(): UseLocalesReturn {
  const [locales, setLocales] = useState<Local[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLocales = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await getLocalesDB();
      const data = (response as any)?.data?.locales ?? [];
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
