'use client';

import { useState, useCallback } from 'react';
import { getReservasDB, actualizarReservaDB, type GetReservasDBParams, type ActualizarReservaDBData } from '@/lib/api/reservas';
import type { ReservaBD, ReservasBDApiResponse } from '@/types/reserva';

interface UseReservasFiltradasReturn {
  reservas: ReservaBD[];
  total: number;
  loading: boolean;
  error: string | null;
  fetch: (params: GetReservasDBParams) => Promise<void>;
  actualizarReserva: (data: ActualizarReservaDBData) => Promise<{ success: boolean; message: string }>;
}

export function useReservasFiltradas(): UseReservasFiltradasReturn {
  const [reservas, setReservas] = useState<ReservaBD[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async (params: GetReservasDBParams) => {
    if (!params.local || !params.fecha_desde || !params.fecha_hasta) {
      setReservas([]);
      setTotal(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result: ReservasBDApiResponse = await getReservasDB(params);
      
      if (result.error) {
        setError(result.message || 'Error al obtener reservas');
        setReservas([]);
        setTotal(0);
      } else {
        setReservas(result.data.reservas || []);
        setTotal(result.data.total || 0);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setReservas([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  const actualizarReserva = useCallback(async (data: ActualizarReservaDBData) => {
    setLoading(true);
    setError(null);

    try {
      const result = await actualizarReservaDB(data);
      
      if (result.mensaje?.toLowerCase().includes('error') || result.mensaje?.toLowerCase().includes('no encontrada')) {
        return { success: false, message: result.mensaje };
      }

      return { success: true, message: result.mensaje || 'Reserva actualizada correctamente' };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al actualizar reserva';
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, []);

  return { reservas, total, loading, error, fetch, actualizarReserva };
}