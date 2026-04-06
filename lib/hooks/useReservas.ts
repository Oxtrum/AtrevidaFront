'use client';

import { useState, useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import type { ApiResponse } from '@/types/reserva';

interface UseReservasParams {
    local: string;
    semana: number;
}

interface UseReservasReturn {
    data: ApiResponse | null;
    loading: boolean;
    error: string | null;
    fetch: (params: UseReservasParams) => Promise<void>;
}

/**
 * Hook para obtener reservas directamente del API.

 * Responsabilidad única: fetch directo + estado.
 */
export function useReservas(): UseReservasReturn {
    const [data, setData] = useState<ApiResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetch = useCallback(async (params: UseReservasParams) => {
        if (!params.local) {
            setData(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await apiClient.get<ApiResponse>('/reservas', {
                params: {
                    local: params.local,
                    semana: params.semana,
                },
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
