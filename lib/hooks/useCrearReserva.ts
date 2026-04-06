'use client';

import { useState, useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import type { ReservaFormData } from '@/types/reserva';

interface CrearReservaResult {
    id: string;
    mensaje: string;
}

interface UseCrearReservaReturn {
    loading: boolean;
    error: string | null;
    crearReserva: (data: ReservaFormData) => Promise<CrearReservaResult>;
}

/**
 * Hook para crear una reserva directamente en el API.
 * Responsabilidad única: POST directo + estado.
 */
export function useCrearReserva(): UseCrearReservaReturn {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const crearReserva = useCallback(async (data: ReservaFormData): Promise<CrearReservaResult> => {
        setLoading(true);
        setError(null);

        try {
            const result = await apiClient.post<CrearReservaResult>('/reservas', data);
            return result;
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
            setError(errorMsg);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    return { loading, error, crearReserva };
}
