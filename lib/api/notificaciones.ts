import { ApiError, apiClient } from './client';
import { withNombreLocalScope } from './localScope';
import type { ReservasBDApiResponse } from '@/types/reserva';

export interface ReservaNotificacion {
  id: number;
  local: string;
  tipo: string;
  fecha: string;
  hora_desde: string;
  hora_hasta: string;
  cliente: string;
  estado: string;
  numero_telefono?: string | null;
  servicio?: string | null;
  servicio_solicitado?: string | null;
  servicio_confirmado?: string | null;
  precio?: number | null;
  notificado: boolean;
  creado_en?: string;
  actualizado_en?: string;
}

export interface ReservasNotificacionesData {
  total: number;
  reservas: ReservaNotificacion[];
}

export interface ReservasNotificacionesResponse {
  success: boolean;
  data: ReservasNotificacionesData;
}

export interface MarcarReservasNotificacionesLeidasResponse {
  success?: boolean;
  data?: {
    actualizadas: number;
  };
  message?: string;
}

export async function getReservasNotificaciones(limit = 20) {
  try {
    return await apiClient.get<ReservasNotificacionesResponse>('/bd/notificaciones/reservas', {
      params: { limit },
    });
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 404) {
      throw error;
    }

    const fallbackParams = withNombreLocalScope<{ local?: string; estado: string }>({ estado: 'AGENDADO' });
    const fallback = await apiClient.get<ReservasBDApiResponse>('/bd/reservas', {
      params: fallbackParams,
    });
    const reservas = fallback.data.reservas
      .filter((reserva) => !reserva.notificado)
      .slice(0, limit) as ReservaNotificacion[];

    return {
      success: true,
      data: {
        total: reservas.length,
        reservas,
      },
    };
  }
}

export async function marcarReservasNotificacionesLeidas(ids: number[]) {
  if (ids.length === 0) {
    return { success: true, data: { actualizadas: 0 } };
  }

  try {
    return await apiClient.patch<MarcarReservasNotificacionesLeidasResponse>(
      '/bd/notificaciones/reservas/leer',
      { ids },
    );
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 404) {
      throw error;
    }

    await Promise.all(ids.map((id) => marcarReservaNotificacionLeida(id)));
    return { success: true, data: { actualizadas: ids.length } };
  }
}

export async function marcarReservaNotificacionLeida(id: number) {
  try {
    return await apiClient.patch<{ success?: boolean; message?: string }>(
      `/bd/notificaciones/reservas/${id}/leer`,
      {},
    );
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 404) {
      throw error;
    }

    return apiClient.patch<{ success?: boolean; message?: string }>('/bd/reservas/notificar', {
      id,
      notificado: true,
    });
  }
}
