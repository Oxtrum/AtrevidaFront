import { apiClient } from './client';
import type { ApiResponse } from '@/types/reserva';
import type { PaginationMetadata, PaginationParams } from './pagination';

export interface CrearPlanData {
  combo_id: number;
  cliente_id: number;
  local_id: number;
  tipo_pago?: string;
  fecha_inicio?: string;
  notas?: string;
  /** Código del pago de caja a aplicar a la cuota (UNICO): marca la cuota PAGADO. */
  pago_codigo?: string;
}

export interface PlanItem {
  id: number;
  codigo: string;
  cliente: string;
  cliente_id?: number;
  cliente_nombre_texto?: string;
  local_nombre_texto?: string;
  combo_id_origen?: number;
  combo_nombre_texto?: string;
  sesiones_totales: number;
  sesiones_usadas: number;
  precio_total: number;
  estado: string;
  activo?: boolean;
  estado_cobranza: string;
  creado_en: string;
}

export interface GetPlanesParams extends PaginationParams, Record<string, string | number | boolean | undefined> {
  busqueda?: string;
  orden?: 'prioridad_estado';
  local?: string;
  local_id?: number;
  cliente?: string;
  estado?: string;
}

export async function getPlanesDB(params: GetPlanesParams, signal?: AbortSignal): Promise<ApiResponse<{ total: number; planes: PlanItem[]; paginacion?: PaginationMetadata }>> {
  return apiClient.get<ApiResponse<{ total: number; planes: PlanItem[]; paginacion?: PaginationMetadata }>>('/bd/planes', { params, signal });
}

export interface PlanServicioDetalle {
  id: number;
  nombre_texto: string;
  sesion_numero: number;
  realizado: boolean;
  fecha_realizado?: string;
  orden: number;
}

export interface PlanDetalle extends PlanItem {
  servicios: PlanServicioDetalle[];
}

export async function getPlanByID(id: number, signal?: AbortSignal): Promise<ApiResponse<{ plan: PlanDetalle }>> {
  return apiClient.get<ApiResponse<{ plan: PlanDetalle }>>(`/bd/planes/${id}`, { signal });
}

/** PATCH /bd/planes/{id}/sesiones/{numero} — marca/desmarca una sesión. */
export async function marcarSesionPlan(id: number, numero: number, realizado: boolean) {
  return apiClient.patch(`/bd/planes/${id}/sesiones/${numero}`, { realizado });
}

export async function crearPlan(data: CrearPlanData): Promise<ApiResponse<{ id: number }>> {
  return apiClient.post<ApiResponse<{ id: number }>>('/bd/planes', data);
}

export async function actualizarPlan(id: number, data: { notas?: string }): Promise<ApiResponse<{ mensaje: string }>> {
  return apiClient.patch<ApiResponse<{ mensaje: string }>>(`/bd/planes/${id}`, data);
}

export async function cambiarEstadoPlan(id: number, estado: string): Promise<ApiResponse<{ mensaje: string }>> {
  return apiClient.patch<ApiResponse<{ mensaje: string }>>(`/bd/planes/${id}/estado`, { estado });
}

/** POST /bd/planes/{id}/cobrar — adjunta un pago existente y activa el plan reservado. */
export async function cobrarPlan(id: number, pago_codigo: string): Promise<ApiResponse<{ mensaje: string }>> {
  return apiClient.post<ApiResponse<{ mensaje: string }>>(`/bd/planes/${id}/cobrar`, { pago_codigo });
}
