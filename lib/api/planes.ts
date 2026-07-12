import { apiClient } from './client';

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

export async function getPlanesDB(params: {
  local?: string;
  local_id?: number;
  cliente?: string;
  estado?: string;
}) {
  return apiClient.get('/bd/planes', { params });
}

export async function getPlanByID(id: number) {
  return apiClient.get(`/bd/planes/${id}`);
}

export async function crearPlan(data: CrearPlanData) {
  return apiClient.post('/bd/planes', data);
}

export async function actualizarPlan(id: number, data: { notas?: string }) {
  return apiClient.patch(`/bd/planes/${id}`, data);
}

export async function cambiarEstadoPlan(id: number, estado: string) {
  return apiClient.patch(`/bd/planes/${id}/estado`, { estado });
}
