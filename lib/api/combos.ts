import { apiClient } from './client';
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
  orden: number;
}

export interface CrearComboData {
  nombre: string;
  descripcion?: string;
  categoria_id?: number;
  tipo_precio: TipoPrecio;
  precio_paquete?: number;
  moneda?: string;
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
}

/** POST /bd/combos — crea el combo con sus locales y líneas de servicio. */
export async function crearCombo(data: CrearComboData) {
  return apiClient.post('/bd/combos', data);
}

/** PATCH /bd/combos/{id} — actualiza metadata del combo. */
export async function actualizarCombo(id: number, data: ActualizarComboData) {
  return apiClient.patch(`/bd/combos/${id}`, data);
}

/** PUT /bd/combos/{id}/locales — reemplaza los locales donde se publica. */
export async function reemplazarLocalesCombo(id: number, localIds: number[]) {
  return apiClient.put(`/bd/combos/${id}/locales`, { local_ids: localIds });
}

/** DELETE /bd/combos/{id} — borrado lógico (activo=false). */
export async function eliminarCombo(id: number) {
  return apiClient.delete(`/bd/combos/${id}`);
}
