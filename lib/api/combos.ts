import { apiClient } from './client';
import type { ApiResponse } from '@/types/reserva';
import type { CombosApiResponse } from '@/types/combo';

/**
 * Obtiene los combos (paquetes) del catálogo público.
 * Sin filtro de local: devuelve todos los combos activos publicados.
 */
export async function getCombosDB(): Promise<CombosApiResponse> {
  return apiClient.get<CombosApiResponse>('/bd/combos');
}

// ─── Admin CRUD (admin_sys) ─────────────────────────────────────────

export type TipoPrecio = 'POR_ITEMS' | 'PRECIO_PAQUETE';

/** Línea de servicio incluida en un combo (payload de create/replace). */
export interface ComboServicioLineaInput {
  servicio_id?: number;
  servicio_texto?: string;
  tiempo?: string;
  costo?: number;
  sesiones: number;
  sesion_numero: number;
  orden: number;
}

export interface CrearComboData {
  nombre: string;
  descripcion?: string;
  categoria_id?: number;
  tipo_precio: TipoPrecio;
  precio_paquete?: number;
  moneda?: string;
  duracion_min?: number;
  local_ids: number[];
  servicios: ComboServicioLineaInput[];
}

/** Solo metadata; locales y servicios tienen endpoints dedicados. */
export interface ActualizarComboData {
  nombre?: string;
  descripcion?: string;
  categoria_id?: number;
  tipo_precio?: TipoPrecio;
  precio_paquete?: number;
  moneda?: string;
  duracion_min?: number;
}

/** POST /bd/combos — crea el combo con sus locales y líneas de servicio. */
export async function crearCombo(data: CrearComboData) {
  return apiClient.post<ApiResponse<{ id: number }>>('/bd/combos', data);
}

/** PATCH /bd/combos/{id} — actualiza metadata del combo. */
export async function actualizarCombo(id: number, data: ActualizarComboData) {
  return apiClient.patch(`/bd/combos/${id}`, data);
}

/** PUT /bd/combos/{id}/locales — reemplaza los locales donde se publica. */
export async function reemplazarLocalesCombo(id: number, localIds: number[]) {
  return apiClient.put(`/bd/combos/${id}/locales`, { local_ids: localIds });
}

/** PUT /bd/combos/{id}/servicios — reemplaza todas las líneas de servicio del combo. */
export async function reemplazarServiciosCombo(id: number, servicios: ComboServicioLineaInput[]) {
  return apiClient.put(`/bd/combos/${id}/servicios`, { servicios });
}

/** DELETE /bd/combos/{id} — borrado lógico (activo=false). */
export async function eliminarCombo(id: number) {
  return apiClient.delete(`/bd/combos/${id}`);
}
