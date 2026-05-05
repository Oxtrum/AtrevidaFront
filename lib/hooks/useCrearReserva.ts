'use client';

import { useState, useCallback } from 'react';
import { crearReservaDB } from '@/lib/api/reservas';

interface CrearReservaResult {
    id: string;
    mensaje: string;
}

interface UseCrearReservaReturn {
    loading: boolean;
    error: string | null;
    crearReserva: (data: any) => Promise<CrearReservaResult>;
}

/**
 * Hook para crear una reserva en la base de datos.
 */
export function useCrearReserva(): UseCrearReservaReturn {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const crearReservaFn = useCallback(async (data: any): Promise<CrearReservaResult> => {
        setLoading(true);
        setError(null);

        try {
            // Si tiene fecha (BD), usar crearReservaDB
            if (data.fecha) {
                const result = await crearReservaDB({
                    local: data.local,
                    fecha: data.fecha,
                    hora_desde: data.hora_desde,
                    hora_hasta: data.hora_hasta,
                    tipo: data.tipo,
                    cliente: data.cliente,
                    servicio: data.servicio,
                });
                return result;
            }
            
            // Si no tiene fecha, usar Sheets (legacy)
            const { crearReserva } = await import('@/lib/api/reservas');
            return await crearReserva(data);
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
            setError(errorMsg);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    return { loading, error, crearReserva: crearReservaFn };
}
