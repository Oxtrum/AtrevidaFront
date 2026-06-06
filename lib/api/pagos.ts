import { apiClient } from './client';
import type { ApiResponse } from '@/types/reserva';

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

export interface GetPagosParams {
  codigo_pago?: string;
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
}

export async function getPagosDB(params?: GetPagosParams): Promise<ApiResponse<PagosListResponse>> {
  return apiClient.get<ApiResponse<PagosListResponse>>('/bd/pagos', {
    params: {
      codigo_pago: params?.codigo_pago,
      local_nombre: params?.local_nombre,
      cliente_nit: params?.cliente_nit,
      cliente_nombre: params?.cliente_nombre,
      estado: params?.estado,
      activo: params?.activo ? 'true' : 'false',
    },
  });
}

export async function getPagoByID(codigo: string): Promise<ApiResponse<{ pago: Pago }>> {
  return apiClient.get<ApiResponse<{ pago: Pago }>>(`/bd/pagos/${codigo}`);
}

export async function crearPagoDB(data: CrearPagoData): Promise<ApiResponse<{ codigo_pago: string }>> {
  return apiClient.post<ApiResponse<{ codigo_pago: string }>>('/bd/pagos', data);
}
