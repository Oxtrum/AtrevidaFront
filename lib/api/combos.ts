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

// ─── Imagen de portada (Supabase Storage) ───────────────────────────

/** Límite de tamaño para la portada del combo. */
export const MAX_IMAGEN_COMBO_BYTES = 5 * 1024 * 1024; // 5 MB

interface ComboImagenUpload {
  upload_url: string;
  token: string;
  path: string;
}

/** Valida tipo y tamaño de la imagen antes de subirla. Devuelve mensaje de error o null. */
export function validarImagenCombo(file: File): string | null {
  if (!file.type.startsWith('image/')) return 'El archivo debe ser una imagen.';
  if (file.size > MAX_IMAGEN_COMBO_BYTES) return 'La imagen no debe superar 5 MB.';
  return null;
}

/**
 * Sube la portada de un combo en tres pasos: pide URL firmada al backend, sube
 * el archivo directo a Supabase y confirma. Devuelve la URL pública final.
 */
export async function subirImagenCombo(id: number, file: File): Promise<string> {
  const firma = await apiClient.post<ApiResponse<ComboImagenUpload>>(
    `/bd/combos/${id}/imagen/upload-url`,
    {},
  );

  const res = await fetch(firma.data.upload_url, {
    method: 'PUT',
    headers: { 'Content-Type': file.type, 'x-upsert': 'true' },
    body: file,
  });
  if (!res.ok) {
    throw new Error(`No se pudo subir la imagen (Supabase respondió ${res.status}).`);
  }

  const confirm = await apiClient.put<ApiResponse<{ imagen_url: string }>>(
    `/bd/combos/${id}/imagen`,
    {},
  );
  return confirm.data.imagen_url;
}

/** DELETE /bd/combos/{id}/imagen — borra la portada del bucket y limpia el path. */
export async function eliminarImagenCombo(id: number) {
  return apiClient.delete(`/bd/combos/${id}/imagen`);
}
