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
