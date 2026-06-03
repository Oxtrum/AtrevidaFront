'use client';

import { useState, useCallback } from 'react';
import type { ReservasBDApiResponse } from '@/types/reserva';

interface UseReservasParams {
    local: string;
    semana?: number;
    fecha?: string;
    fecha_desde?: string;
    fecha_hasta?: string;
}

interface UseReservasReturn {
    data: ReservasBDApiResponse | null;
    loading: boolean;
    error: string | null;
    fetch: (params: UseReservasParams) => Promise<void>;
}

/**
 * Hook para obtener reservas directamente del API.
 * Soporta tanto el endpoint nuevo (DB) como el anterior (Sheets).
 */
export function useReservas(): UseReservasReturn {
    const [data, setData] = useState<ReservasBDApiResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadReservas = useCallback(async (params: UseReservasParams) => {
        if (!params.local) {
            setData(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
            const searchParams = new URLSearchParams();
            if (params.local) searchParams.set('local', params.local);
            if (params.fecha) searchParams.set('fecha', params.fecha);
            if (params.fecha_desde) searchParams.set('fecha_desde', params.fecha_desde);
            if (params.fecha_hasta) searchParams.set('fecha_hasta', params.fecha_hasta);
            const res = await fetch(`/api/bd/reservas?${searchParams.toString()}`, {
                headers: {
                    ...(token && { Authorization: `Bearer ${token}` }),
                },
            });
            const result = await res.json() as ReservasBDApiResponse;

            setData(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error desconocido');
            setData(null);
        } finally {
            setLoading(false);
        }
    }, []);

    return { data, loading, error, fetch: loadReservas };
}
