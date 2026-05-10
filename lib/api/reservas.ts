/**
 * Servicio de Reservas — todas las llamadas a /reservas pasan por aquí.
 * Importar SOLO este módulo en componentes y server actions, nunca fetch directo.
 */

import { apiClient } from './client';
import type { ApiResponse, ReservaFormData, ReservasBDApiResponse } from '@/types/reserva';

// ─── Parámetros (Sheets - DEPRECATED) ──────────────────────────────────────

export interface GetReservasSheetsParams {
  local: string;
  /** Número de semana relativo (1 = semana actual, 2 = siguiente, …) */
  semana?: number;
  dia?: string;
  tipo?: 'M' | 'B';
  cliente?: string;
  reservados?: boolean;
}

// ─── Parámetros (DB) ────────────────────────────────────────────────────────

export interface GetReservasDBParams {
  local: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  tipo?: string; // "mesa" | "bicicleta" (backend espera strings en GET)
  cliente?: string;
  reservados?: boolean;
}

export interface GetReservasCalendarioParams {
  local: string;
  fecha_desde: string;
  fecha_hasta: string;
  tipo?: 'M' | 'B';
  cliente?: string;
  reservados?: boolean;
}

export interface CrearReservaDBData {
  local: string;
  fecha: string;
  hora_desde: string;
  hora_hasta: string;
  tipo: 'M' | 'B';
  cliente: string;
  servicio?: string;
}

export interface ActualizarReservaDBData {
  id: number;
  local: string;
  fecha: string;
  hora: string;
  tipo: 'M' | 'B';
  cliente: string;
  nueva_fecha?: string;
  nueva_hora_desde?: string;
  nuevo_tipo?: 'M' | 'B';
}

export interface CrearReservaResult {
  id: string;
  mensaje: string;
}

// ─── Queries (Sheets - DEPRECATED) ──────────────────────────────────────────

/** (DEPRECATED) Obtiene la grilla de reservas para una sucursal y semana. */
export async function getReservasSheets(params: GetReservasSheetsParams): Promise<ApiResponse> {
  return apiClient.get<ApiResponse>('/reservas', {
    params: {
      local: params.local,
      semana: params.semana,
      dia: params.dia,
      tipo: params.tipo,
      cliente: params.cliente,
      reservados: params.reservados?.toString(),
    },
  });
}

// ─── Queries (DB) ───────────────────────────────────────────────────────────

/** Obtiene reservas filtradas desde la base de datos. */
export async function getReservasDB(params: GetReservasDBParams): Promise<ReservasBDApiResponse> {
  return apiClient.get<ReservasBDApiResponse>('/bd/reservas', {
    params: {
      local: params.local,
      fecha_desde: params.fecha_desde,
      fecha_hasta: params.fecha_hasta,
      tipo: params.tipo,
      cliente: params.cliente,
      reservados: params.reservados?.toString(),
    },
  });
}

/** Obtiene una reserva por su ID. */
export async function getReservaByID(id: string | number): Promise<ApiResponse<{ reserva: ReservaBD }>> {
  return apiClient.get<ApiResponse<{ reserva: ReservaBD }>>(`/bd/reservas/${id}`);
}

/** Obtiene reservas para vista calendario desde la base de datos. */
export async function getReservasCalendario(params: GetReservasCalendarioParams): Promise<ApiResponse> {
  return apiClient.get<ApiResponse>('/bd/reservas/calendario', {
    params: {
      local: params.local,
      fecha_desde: params.fecha_desde,
      fecha_hasta: params.fecha_hasta,
      tipo: params.tipo,
      cliente: params.cliente,
      reservados: params.reservados?.toString(),
    },
  });
}

/** Crea una nueva reserva en la base de datos. */
export async function crearReservaDB(data: CrearReservaDBData): Promise<CrearReservaResult> {
  return apiClient.post<CrearReservaResult>('/bd/reservas', data);
}

/** Actualiza una reserva existente en la base de datos. */
export async function actualizarReservaDB(data: ActualizarReservaDBData): Promise<CrearReservaResult> {
  return apiClient.patch<CrearReservaResult>('/bd/reservas', data);
}

// ─── Helpers (Sheets - DEPRECATED) ─────────────────────────────────────────

/** (DEPRECATED) Crea una nueva reserva. */
export async function crearReserva(data: ReservaFormData): Promise<CrearReservaResult> {
  return apiClient.post<CrearReservaResult>('/reservas', data);
}

/** Elimina una reserva por ID. */
export async function eliminarReserva(id: string): Promise<void> {
  return apiClient.delete<void>(`/reservas/${id}`);
}