import { apiClient } from './client';
import type { ApiResponse } from '@/types/reserva';

export interface CrearPlanData {
  combo_id: number;
  cliente_id: number;
  local_id: number;
  tipo_pago?: string;
  fecha_inicio?: string;
  notas?: string;
}

export interface PlanItem {
  id: number;
  codigo: string;
  cliente: string;
  cliente_id?: number;
  combo_id_origen?: number;
  combo_nombre_snapshot?: string;
  sesiones_totales: number;
  sesiones_usadas: number;
  precio_total: number;
  estado: string;
  estado_cobranza: string;
  creado_en: string;
}

export interface GetPlanesParams {
  local?: string;
  local_id?: number;
  cliente?: string;
  estado?: string;
}

export async function getPlanesDB(params: GetPlanesParams): Promise<ApiResponse<{ planes: PlanItem[] }>> {
  return apiClient.get<ApiResponse<{ planes: PlanItem[] }>>('/bd/planes', { params });
}

export async function getPlanByID(id: number): Promise<ApiResponse<{ plan: unknown }>> {
  return apiClient.get<ApiResponse<{ plan: unknown }>>(`/bd/planes/${id}`);
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
