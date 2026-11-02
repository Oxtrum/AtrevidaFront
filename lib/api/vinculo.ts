import { apiClient } from './client';
import type { ApiResponse } from '@/types/reserva';
import type { ClientePG } from './clientes';

/** Reserva vigente que todavia no tiene un cliente registrado. */
export interface ReservaPorVincular {
  id: number;
  fecha: string;
  hora_desde: string;
  hora_hasta: string;
  local: string;
  cliente: string;
  numero_telefono?: string;
  telefono_e164?: string;
  servicio?: string;
  estado?: string;
}

export interface ReservasPorVincularResponse {
  total: number;
  reservas: ReservaPorVincular[];
}

/** Cliente que podria ser el dueño de una reserva: solo una pista, el cajero decide. */
export interface ClienteSugerido extends ClientePG {
  por_telefono: boolean;
  por_nombre: boolean;
}

export interface VincularReservaData {
  cliente_id: number;
  /** Tambien vincula las demas reservas sin cliente que tengan exactamente el mismo telefono. */
  vincular_mismo_telefono?: boolean;
}

export async function getReservasPorVincular(
  params: { limit?: number; offset?: number } = {},
  signal?: AbortSignal,
): Promise<ApiResponse<ReservasPorVincularResponse>> {
  return apiClient.get<ApiResponse<ReservasPorVincularResponse>>('/bd/reservas/por-vincular', {
    params: { limit: params.limit, offset: params.offset },
    signal,
  });
}

export async function getSugerenciasCliente(
  reservaId: number,
  signal?: AbortSignal,
): Promise<ApiResponse<ClienteSugerido[]>> {
  return apiClient.get<ApiResponse<ClienteSugerido[]>>(`/bd/reservas/${reservaId}/sugerencias-cliente`, { signal });
}

export async function vincularReservaCliente(
  reservaId: number,
  data: VincularReservaData,
): Promise<ApiResponse<{ vinculadas: number }>> {
  return apiClient.patch<ApiResponse<{ vinculadas: number }>>(`/bd/reservas/${reservaId}/cliente`, data);
}
