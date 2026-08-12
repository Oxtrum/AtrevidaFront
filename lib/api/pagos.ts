import { apiClient } from './client';
import { withLocalIdScope, withNombreLocalScope } from './localScope';
import type { ApiResponse } from '@/types/reserva';
import type { PaginationMetadata, PaginationParams } from './pagination';

export interface DetalleServicio {
  servicio_id: number | null;
  servicio: string;
  precio_unitario: number;
  cantidad: number;
  subtotal: number;
}

export interface CrearPagoData {
  local_id: number;
  local_nombre: string;
  cliente_id: number | null;
  cliente_nit: string;
  cliente_nombre: string;
  descuento: number;
  estado: string;
  tipo_pago: 'qr' | 'efectivo';
  activo: boolean;
  detalle: DetalleServicio[];
}

export interface Pago {
  codigo_pago: string;
  local_id: number;
  local_nombre: string;
  cliente_nit: string;
  cliente_nombre: string;
  subtotal: number;
  descuento: number;
  total_final: number;
  estado: string;
  tipo_pago?: string;
  activo: boolean;
  fecha_creacion: string;
  fecha_modificacion: string;
}

export interface GetPagosParams extends PaginationParams {
  codigo_pago?: string;
  local_id?: number;
  local_nombre?: string;
  cliente_nit?: string;
  cliente_nombre?: string;
  estado?: string;
  activo?: boolean;
}

export interface PagosListResponse {
  total: number;
  filtros: {
    codigo_pago: string;
    local_nombre: string;
    cliente_nit: string;
    cliente_nombre: string;
    estado: string;
    activo: boolean;
  };
  pagos: Pago[];
  paginacion?: PaginationMetadata;
}

export interface PagosResumenParams {
  fecha_desde: string;
  fecha_hasta: string;
  local?: string;
}

export interface ServicioResumenFinanciero {
  servicio: string;
  cantidad: number;
  monto_total: number;
}

export interface VentaPorTipoPago {
  tipo_pago: string;
  cantidad_pagos: number;
  total: number;
}

export interface ReporteFinanciero {
  tipo_reporte: string;
  local: string;
  total_periodo: number;
  subtotal: number;
  descuentos: number;
  cantidad_pagos: number;
  cantidad_servicios_vendidos: number;
  ticket_promedio: number;
  servicio_mas_comprado: ServicioResumenFinanciero | null;
  servicio_mas_dinero_genera: ServicioResumenFinanciero | null;
  ventas_por_tipo_pago: VentaPorTipoPago[];
}

export interface PagosResumenResponse {
  filtros: {
    fecha_desde: string;
    fecha_hasta: string;
    local: string;
  };
  reporte: ReporteFinanciero;
  detalle_reportes: ReporteFinanciero[];
}

export async function getPagosDB(params?: GetPagosParams): Promise<ApiResponse<PagosListResponse>> {
  const scopedParams = withLocalIdScope<GetPagosParams>(params ?? {});

  return apiClient.get<ApiResponse<PagosListResponse>>('/bd/pagos', {
    params: {
      codigo_pago: scopedParams.codigo_pago,
      local_id: scopedParams.local_id,
      local_nombre: scopedParams.local_nombre,
      cliente_nit: scopedParams.cliente_nit,
      cliente_nombre: scopedParams.cliente_nombre,
      estado: scopedParams.estado,
      activo: scopedParams.activo === undefined ? undefined : String(scopedParams.activo),
	  limit: scopedParams.limit,
	  cursor: scopedParams.cursor,
	  include_total: scopedParams.include_total,
    },
  });
}

export async function getPagoByID(codigo: string): Promise<ApiResponse<{ pago: Pago }>> {
  return apiClient.get<ApiResponse<{ pago: Pago }>>(`/bd/pagos/${codigo}`);
}

export async function crearPagoDB(data: CrearPagoData): Promise<ApiResponse<{ codigo_pago: string }>> {
  return apiClient.post<ApiResponse<{ codigo_pago: string }>>('/bd/pagos', data);
}

export async function getPagosResumenDB(
  params: PagosResumenParams,
): Promise<ApiResponse<PagosResumenResponse>> {
  const scopedParams = withNombreLocalScope(params);

  return apiClient.get<ApiResponse<PagosResumenResponse>>('/bd/pagos/resumen', {
    params: {
      fecha_desde: scopedParams.fecha_desde,
      fecha_hasta: scopedParams.fecha_hasta,
      local: scopedParams.local,
    },
  });
}
