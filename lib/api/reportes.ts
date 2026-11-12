import { apiClient } from './client';
import { withNombreLocalScope } from './localScope';
import type { ApiResponse } from '@/types/reserva';
import type { GetReporteFinancieroParams, ReporteFinancieroResponse } from '@/types/finanzas';
import type { PaginationMetadata, PaginationParams } from './pagination';
import type { ClienteReporte, ReporteClientes } from '@/types/reporteClientes';
import type { PeriodoReporte } from '@/types/rrhh';

/** Ingresos vs egresos del periodo (PLAN §5.6). `/bd/pagos/resumen` sigue intacto. */
export async function getReporteFinancieroDB(
  params: GetReporteFinancieroParams,
): Promise<ReporteFinancieroResponse> {
  const scoped = withNombreLocalScope(params);
  const res = await apiClient.get<ApiResponse<ReporteFinancieroResponse>>('/bd/reportes/financiero', {
    params: { ...scoped },
  });
  return res.data;
}

/** Ranking de clientes del periodo que contiene a `fecha` (YYYY-MM-DD), general y por local. */
export async function getReporteClientes(periodo: PeriodoReporte, fecha: string): Promise<ReporteClientes> {
  const res = await apiClient.get<ApiResponse<{ reporte: ReporteClientes }>>('/bd/reportes/clientes', {
    params: { periodo, fecha },
  });
  return res.data.reporte;
}

export interface GetReporteClientesDetalleParams extends PaginationParams {
  periodo: PeriodoReporte;
  /** Cualquier día del periodo, YYYY-MM-DD. */
  fecha: string;
  /** Sin él, todos los locales. */
  local_id?: number;
  busqueda?: string;
}

export interface ReporteClientesDetallePage {
  clientes: ClienteReporte[];
  paginacion?: PaginationMetadata;
}

/**
 * Página del detalle de clientes del reporte. El servidor siempre pagina (máximo 100 por página), busca y ordena
 * (ordenar_por + sentido); sin orden, quien más dinero generó primero.
 */
export async function getReporteClientesDetalle(
  params: GetReporteClientesDetalleParams,
  signal?: AbortSignal,
): Promise<ReporteClientesDetallePage> {
  const res = await apiClient.get<ApiResponse<ReporteClientesDetallePage>>('/bd/reportes/clientes/detalle', {
    params: { ...params, include_total: params.include_total ? 'true' : undefined },
    signal,
  });
  return { clientes: res.data?.clientes ?? [], paginacion: res.data?.paginacion };
}
