/**
 * Servicio de Reservas — todas las llamadas a /reservas pasan por aquí.
 * Importar SOLO este módulo en componentes y server actions, nunca fetch directo.
 */

import { apiClient } from './client';
import { withNombreLocalScope } from './localScope';
import type { ApiResponse, EstadoReserva, ReservaBD, ReservaFormData, ReservasBDApiResponse } from '@/types/reserva';
import type { PaginationParams } from './pagination';

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

/** Tipo de reserva en filtros GET (mesa/bicicleta). */
export type ReservaTipoBackend = 'mesa' | 'bicicleta';
/** Tipo de reserva en body POST/PATCH (M/B). */
export type ReservaTipoBody = 'M' | 'B';

export interface GetReservasDBParams extends PaginationParams {
  local?: string;
  fecha?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  tipo?: ReservaTipoBackend;
  cliente?: string;
  estado?: EstadoReserva;
  numero_telefono?: string;
  servicio_solicitado?: string;
  servicio_confirmado?: string;
}

export interface GetReservasCalendarioParams {
  local?: string;
  fecha?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  tipo?: ReservaTipoBackend;
  cliente?: string;
  reservados?: boolean;
}

export interface ReservasResumenSemana {
  total_reservas: number;
  lunes?: number;
  martes?: number;
  miercoles?: number;
  jueves?: number;
  viernes?: number;
  sabado?: number;
}

export interface ReservasResumenIngresos {
  total_ingresos: number;
  lunes?: number;
  martes?: number;
  miercoles?: number;
  jueves?: number;
  viernes?: number;
  sabado?: number;
}

export interface ReservasResumenData {
  reservas_agendadas_dia: number;
  servicios_completados_dia: number;
  ingresos_hoy: number;
  cancelaciones_hoy: number;
  ingresos_semana?: number;
  semana: ReservasResumenSemana;
  ingresos?: ReservasResumenIngresos;
}

export interface GetReservasResumenParams {
  fecha: string;
  local?: string;
}

export interface CrearReservaDBData {
  local: string;
  fecha: string;
  hora_desde: string;
  hora_hasta: string;
  tipo: ReservaTipoBody;
  cliente: string;
  numero_telefono: string;
  servicio: string;
  servicio_solicitado?: string | null;
  servicio_confirmado?: string | null;
  notas?: string;
  plan_id?: number;
  precio?: number;
  estado: EstadoReserva;
}

/**
 * PATCH /bd/reservas — sólo se envían los campos que cambian; el backend
 * localiza la reserva por id + local. Editable en estado PENDIENTE, RECHAZADO
 * y AGENDADO; una reserva COMPLETADO responde 409.
 * No cambia `estado` — para eso está `actualizarEstadoReservaDB`.
 */
export interface ActualizarReservaDBData {
  id: number;
  local: string;
  nueva_fecha?: string;
  nueva_hora_desde?: string;
  nueva_hora_hasta?: string;
  nuevas_notas?: string;
  nuevo_cliente?: string;
  nuevo_numero_telefono?: string;
  nuevo_precio?: number;
  nuevo_servicio?: string;
  nuevo_servicio_solicitado?: string | null;
  nuevo_servicio_confirmado?: string | null;
  nuevo_tipo?: ReservaTipoBody;
  /** Local destino cuando se mueve la reserva de sucursal. */
  nuevo_local?: string;
  /** Plan o paquete al que se imputa la reserva. */
  nuevo_plan_id?: number;
  /** Desvincula la reserva de su plan actual; tiene prioridad sobre `nuevo_plan_id`. */
  limpiar_plan_id?: boolean;
}

export interface ActualizarEstadoReservaDBData {
  id: number;
  estado: EstadoReserva;
  causa?: string;
  servicio_confirmado?: string | null;
  precio?: number;
  tipo?: ReservaTipoBody;
}

export interface ActualizarReservaNotificadoDBData {
  id: number;
  notificado: boolean;
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
export async function getReservasDB(params: GetReservasDBParams, signal?: AbortSignal): Promise<ReservasBDApiResponse> {
  const scopedParams = withNombreLocalScope(params);

  return apiClient.get<ReservasBDApiResponse>('/bd/reservas', {
    params: {
      local: scopedParams.local,
      fecha: scopedParams.fecha,
      fecha_desde: scopedParams.fecha_desde,
      fecha_hasta: scopedParams.fecha_hasta,
      tipo: scopedParams.tipo,
      cliente: scopedParams.cliente,
      estado: scopedParams.estado,
      numero_telefono: scopedParams.numero_telefono,
      servicio_solicitado: scopedParams.servicio_solicitado,
      servicio_confirmado: scopedParams.servicio_confirmado,
	  limit: scopedParams.limit,
	  cursor: scopedParams.cursor,
	  include_total: scopedParams.include_total,
    },
	signal,
  });
}

/** Obtiene una reserva por su ID. */
export async function getReservaByID(id: string | number): Promise<ApiResponse<{ reserva: ReservaBD }>> {
  return apiClient.get<ApiResponse<{ reserva: ReservaBD }>>(`/bd/reservas/${id}`);
}

/** Obtiene reservas para vista calendario desde la base de datos. */
export async function getReservasCalendario(params: GetReservasCalendarioParams): Promise<ApiResponse> {
  const scopedParams = withNombreLocalScope(params);

  return apiClient.get<ApiResponse>('/bd/reservas/calendario', {
    params: {
      local: scopedParams.local,
      fecha: scopedParams.fecha,
      fecha_desde: scopedParams.fecha_desde,
      fecha_hasta: scopedParams.fecha_hasta,
      tipo: scopedParams.tipo,
      cliente: scopedParams.cliente,
      reservados: scopedParams.reservados?.toString(),
    },
  });
}

/** Obtiene el resumen operativo de reservas para una fecha. */
export async function getReservasResumenDB(
  params: string | GetReservasResumenParams,
): Promise<ApiResponse<ReservasResumenData>> {
  const rawParams = typeof params === 'string' ? { fecha: params } : params;

  return apiClient.get<ApiResponse<ReservasResumenData>>('/bd/reservas/resumen', {
    params: {
      fecha: rawParams.fecha,
      local: rawParams.local,
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

/** Borrado lógico de una reserva (DELETE /bd/reservas/{id} → activo=false). */
export async function eliminarReservaDB(id: number | string): Promise<CrearReservaResult> {
  return apiClient.delete<CrearReservaResult>(`/bd/reservas/${id}`);
}

/** Actualiza únicamente el estado administrativo de una reserva. */
export async function actualizarEstadoReservaDB(data: ActualizarEstadoReservaDBData): Promise<CrearReservaResult> {
  return apiClient.patch<CrearReservaResult>('/bd/reservas/estado', {
    id: data.id,
    estado: data.estado,
    causa: data.causa ?? '',
    ...(data.servicio_confirmado !== undefined && { servicio_confirmado: data.servicio_confirmado }),
    ...(data.precio !== undefined && { precio: data.precio }),
    ...(data.tipo !== undefined && { tipo: data.tipo }),
  });
}

/** Marca si ya se notificó al cliente por WhatsApp. */
export async function actualizarReservaNotificadoDB(data: ActualizarReservaNotificadoDBData): Promise<CrearReservaResult> {
  return apiClient.patch<CrearReservaResult>('/bd/reservas/notificar', {
    id: data.id,
    notificado: data.notificado,
  });
}

/** Marca una reserva como notificada o no (PATCH /bd/reservas/notificar). */
export async function notificarReservaDB(id: number | string, notificado: boolean): Promise<CrearReservaResult> {
  return apiClient.patch<CrearReservaResult>('/bd/reservas/notificar', { id: Number(id), notificado });
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
