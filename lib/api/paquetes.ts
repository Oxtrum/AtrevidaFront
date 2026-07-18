import { apiClient } from './client';
import type { ApiResponse } from '@/types/reserva';

// ─── Tipos ───────────────────────────────────────────────────────────

/** Línea de servicio base incluida en un paquete. */
export interface PaqueteServicioBase {
  id?: number;
  servicio_id?: number;
  servicio_texto?: string;
  costo: number;
  orden: number;
}

/** Nivel (tier) de sesiones/precio de un paquete. */
export interface PaqueteTier {
  id?: number;
  nombre?: string;
  sesiones_totales?: number;
  precio_final?: number;
  precio_paquete?: number;
  precio_regular?: number;
  moneda?: string;
}

/** Local donde se publica el paquete. */
export interface PaqueteLocal {
  id: number;
  nombre: string;
}

/** Detalle completo de un paquete: metadata + servicios base + locales + tiers. */
export interface PaqueteDetalle {
  paquete: {
    id: number;
    nombre: string;
    descripcion?: string;
    categoria_id?: number;
    categoria?: string;
    imagen_url?: string;
    moneda: string;
    activo: boolean;
  };
  servicios_base: PaqueteServicioBase[];
  locales: PaqueteLocal[];
  tiers: PaqueteTier[];
}

/** Payload de create/replace (POST y PATCH usan el mismo shape). */
export interface CrearPaqueteBody {
  nombre: string;
  descripcion?: string;
  categoria_id?: number;
  moneda?: string;
  local_ids: number[];
  servicios_base: {
    servicio_id?: number;
    servicio_texto?: string;
    costo: number;
    orden: number;
  }[];
  tiers: {
    id?: number;
    sesiones: number;
    precio_contado: number;
    precio_regular?: number;
  }[];
}

// ─── Admin CRUD (admin_sys) ─────────────────────────────────────────

export interface GetPaquetesParams {
  local?: string;
  categoria?: string;
  nombre?: string;
  activo?: boolean;
}

/** GET /bd/paquetes — lista paquetes filtrados. */
export async function getPaquetesDB(
  params: GetPaquetesParams = {},
): Promise<ApiResponse<{ total: number; paquetes: PaqueteDetalle[] }>> {
  return apiClient.get<ApiResponse<{ total: number; paquetes: PaqueteDetalle[] }>>(
    '/bd/paquetes',
    {
      params: {
        local: params.local,
        categoria: params.categoria,
        nombre: params.nombre,
        activo: params.activo?.toString(),
      },
    },
  );
}

/** GET /bd/paquetes/{id} — detalle de un paquete. */
export async function getPaquete(id: number): Promise<ApiResponse<{ paquete: PaqueteDetalle }>> {
  return apiClient.get<ApiResponse<{ paquete: PaqueteDetalle }>>(`/bd/paquetes/${id}`);
}

/** POST /bd/paquetes — crea el paquete con locales, servicios base y tiers. */
export async function crearPaquete(body: CrearPaqueteBody): Promise<ApiResponse<{ id: number }>> {
  return apiClient.post<ApiResponse<{ id: number }>>('/bd/paquetes', body);
}

/** PATCH /bd/paquetes/{id} — reemplazo completo del paquete. */
export async function actualizarPaquete(
  id: number,
  body: CrearPaqueteBody,
): Promise<ApiResponse<unknown>> {
  return apiClient.patch<ApiResponse<unknown>>(`/bd/paquetes/${id}`, body);
}

/** DELETE /bd/paquetes/{id} — borrado lógico (activo=false). */
export async function eliminarPaquete(id: number): Promise<ApiResponse<unknown>> {
  return apiClient.delete<ApiResponse<unknown>>(`/bd/paquetes/${id}`);
}

// ─── Imagen de portada (Supabase Storage) ───────────────────────────

/** Límite de tamaño para la portada del paquete. */
export const MAX_IMAGEN_PAQUETE_BYTES = 5 * 1024 * 1024; // 5 MB

interface PaqueteImagenUpload {
  upload_url: string;
  token: string;
  path: string;
}

/** Valida tipo y tamaño de la imagen antes de subirla. Devuelve mensaje de error o null. */
export function validarImagenPaquete(file: File): string | null {
  if (!file.type.startsWith('image/')) return 'El archivo debe ser una imagen.';
  if (file.size > MAX_IMAGEN_PAQUETE_BYTES) return 'La imagen no debe superar 5 MB.';
  return null;
}

/**
 * Sube la portada de un paquete en tres pasos: pide URL firmada al backend, sube
 * el archivo directo a Supabase y confirma. Devuelve la URL pública final.
 */
export async function subirImagenPaquete(id: number, file: File): Promise<string> {
  const firma = await apiClient.post<ApiResponse<PaqueteImagenUpload>>(
    `/bd/paquetes/${id}/imagen/upload-url`,
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
    `/bd/paquetes/${id}/imagen`,
    {},
  );
  return confirm.data.imagen_url;
}

/** DELETE /bd/paquetes/{id}/imagen — borra la portada del bucket y limpia el path. */
export async function eliminarImagenPaquete(id: number) {
  return apiClient.delete(`/bd/paquetes/${id}/imagen`);
}
