'use client';
import { useState, useCallback } from 'react';
import { getReservasCalendario } from '@/lib/api/reservas';
import type { ApiResponse } from '@/types/reserva';

interface UseReservasCalendarioParams {
  local: string;
  fecha_desde: string;
  fecha_hasta: string;
}

interface UseReservasCalendarioReturn {
  data: ApiResponse | null;
  loading: boolean;
  error: string | null;
  fetch: (params: UseReservasCalendarioParams) => Promise<void>;
}

export function useReservasCalendario(): UseReservasCalendarioReturn {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async (params: UseReservasCalendarioParams) => {
    if (!params.local) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await getReservasCalendario({
        local: params.local,
        fecha_desde: params.fecha_desde,
        fecha_hasta: params.fecha_hasta,
      });
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, fetch };
}