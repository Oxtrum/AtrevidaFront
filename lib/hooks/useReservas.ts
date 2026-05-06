'use client';

import { useState, useCallback } from 'react';
import { getReservasDB } from '@/lib/api/reservas';
import type { ReservasBDApiResponse } from '@/types/reserva';

interface UseReservasParams {
    local: string;
    semana: number;
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

    const fetch = useCallback(async (params: UseReservasParams) => {
        if (!params.local) {
            setData(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await getReservasDB({
                local: params.local,
                fecha_desde: params.fecha_desde,
                fecha_hasta: params.fecha_hasta,
            });
            console.log('>>> getReservasDB result:', result);
            
            setData(result);
        } catch (err) {
            console.log('>>> getReservasDB ERROR:', err);
            setError(err instanceof Error ? err.message : 'Error desconocido');
            setData(null);
        } finally {
            setLoading(false);
        }
    }, []);

    return { data, loading, error, fetch };
}
