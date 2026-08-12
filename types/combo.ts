import type { ApiResponse } from './reserva';
import type { PaginationMetadata } from '@/lib/api/pagination';

/** Local donde se publica un combo (subset usado por el catálogo público). */
export interface ComboLocal {
  id: number;
  nombre: string;
  activo: boolean;
}

/** Línea de servicio incluida en un combo. */
export interface ComboServicioDetalle {
  id: number;
  servicio_texto?: string;
  servicio_nombre: string;
  tiempo?: string;
  sesiones: number;
  orden: number;
}

/** Promoción de catálogo (paquete). Refleja `models.ComboCatalogoPG` del backend. */
export interface ComboCatalogo {
  id: number;
  nombre: string;
  descripcion?: string;
  categoria: string;
  tipo_precio: string;
  precio_paquete?: number;
  precio_final: number;
  moneda: string;
  sesiones_totales: number;
  activo: boolean;
  locales: ComboLocal[];
  servicios: ComboServicioDetalle[];
}

export interface CombosData {
  total: number;
  combos: ComboCatalogo[];
  paginacion?: PaginationMetadata;
}

export type CombosApiResponse = ApiResponse<CombosData>;
