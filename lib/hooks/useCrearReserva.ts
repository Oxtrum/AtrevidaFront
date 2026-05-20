'use client';

import { useState, useCallback } from 'react';
import { crearReservaDB } from '@/lib/api/reservas';
import type { DiaSemana, EstadoReserva, ReservaFormData } from '@/types/reserva';

interface CrearReservaResult {
    id: string;
    mensaje: string;
}

interface UseCrearReservaReturn {
    loading: boolean;
    error: string | null;
    crearReserva: (data: CrearReservaData) => Promise<CrearReservaResult>;
}

interface CrearReservaData {
    local: string;
    semana?: string;
    dia?: DiaSemana;
    fecha?: string;
    hora_desde: string;
    hora_hasta: string;
    tipo: string;
    cliente: string;
    numero_telefono?: string;
    servicio: string;
    precio?: number;
    notas?: string;
    estado?: EstadoReserva;
}

/**
 * Hook para crear una reserva en la base de datos.
 */
export function useCrearReserva(): UseCrearReservaReturn {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const crearReservaFn = useCallback(async (data: CrearReservaData): Promise<CrearReservaResult> => {
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
                    numero_telefono: data.numero_telefono || '',
                    servicio: data.servicio,
                    precio: data.precio,
                    notas: data.notas,
                    estado: 'PENDIENTE',
                });
                return result;
            }
            
            // Si no tiene fecha, usar Sheets (legacy)
            const { crearReserva } = await import('@/lib/api/reservas');
            return await crearReserva(data as ReservaFormData);
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
