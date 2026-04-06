/**
 * Servicio de Reservas — todas las llamadas a /reservas pasan por aquí.
 * Importar SOLO este módulo en componentes y server actions, nunca fetch directo.
 */

import { apiClient } from './client';
import type { ApiResponse, ReservaFormData } from '@/types/reserva';

export interface GetReservasParams {
  local: string;
  /** Número de semana relativo (1 = semana actual, 2 = siguiente, …) */
  semana?: number;
}

export interface CrearReservaResult {
  id: string;
  mensaje: string;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/** Obtiene la grilla de reservas para una sucursal y semana. */
export async function getReservas(params: GetReservasParams): Promise<ApiResponse> {
  return apiClient.get<ApiResponse>('/reservas', {
    params: {
      local: params.local,
      semana: params.semana,
    },
  });
}

/** Crea una nueva reserva. */
export async function crearReserva(data: ReservaFormData): Promise<CrearReservaResult> {
  return apiClient.post<CrearReservaResult>('/reservas', data);
}

/** Elimina una reserva por ID. */
export async function eliminarReserva(id: string): Promise<void> {
  return apiClient.delete<void>(`/reservas/${id}`);
}