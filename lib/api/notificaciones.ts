import { ApiError, apiClient } from './client';

export interface ReservaNotificacion {
  id: number;
  local: string;
  fecha: string;
  hora_desde: string;
  hora_hasta: string;
  cliente: string;
  numero_telefono?: string | null;
  servicio?: string | null;
  servicio_solicitado?: string | null;
  servicio_confirmado?: string | null;
  creado_en?: string;
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
  return apiClient.get<ReservasNotificacionesResponse>('/bd/notificaciones/reservas', {
    params: { limit },
  });
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
