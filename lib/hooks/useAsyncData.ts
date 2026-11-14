'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface UseAsyncDataResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

/**
 * Carga datos al montar y cada vez que cambia `key`. Descarta respuestas
 * de cargas anteriores (filtros que cambian rápido). `fetcher` puede cambiar de
 * identidad entre renders: solo `key` dispara una nueva carga.
 */
export function useAsyncData<T>(fetcher: () => Promise<T>, key: string): UseAsyncDataResult<T> {
  const fetcherRef = useRef(fetcher);
  const requestRef = useRef(0);
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const reload = useCallback(async () => {
    const id = ++requestRef.current;
    setLoading(true);
    setError(null);
    try {
      const result = await fetcherRef.current();
      if (id === requestRef.current) setData(result);
    } catch (err) {
      if (id === requestRef.current) setError(err instanceof Error ? err.message : 'Error al cargar datos');
    } finally {
      if (id === requestRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!window.localStorage.getItem('adminToken')) return;
    void reload();
  }, [key, reload]);

  return { data, loading, error, reload };
}
