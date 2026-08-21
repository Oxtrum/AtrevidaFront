import { apiClient } from './client';
import type { ApiResponse } from '@/types/reserva';
import type { PaginationMetadata, PaginationParams } from './pagination';

export interface ClientePG {
  id: number;
  nombre: string;
  apellido: string;
  numero_telefono: string;
  telefono_e164?: string;
  /** Cedula de identidad. Cadena vacia si no se registro. */
  ci?: string;
  /** NIT de facturacion por defecto. Cadena vacia si no se registro. */
  nit?: string;
}

export interface GetClientesParams extends PaginationParams {
  nombre?: string;
  apellido?: string;
  numero_telefono?: string;
	busqueda?: string;
	include_total?: boolean;
}

export interface ClientesListResponse {
  clientes: ClientePG[];
  filtros: {
    nombre?: string;
    apellido?: string;
    numero_telefono?: string;
  };
	total: number;
	total_registros?: number;
	paginacion?: PaginationMetadata;
}

export interface CrearClienteData {
  nombre: string;
  apellido: string;
  numero_telefono: string;
  telefono_e164?: string;
  ci?: string;
  nit?: string;
}

export interface ActualizarClienteData {
  nombre?: string;
  apellido?: string;
  numero_telefono?: string;
  telefono_e164?: string;
  /** Cadena vacia borra el dato. */
  ci?: string;
  /** Cadena vacia borra el dato. */
  nit?: string;
}

export async function getClientesDB(params: GetClientesParams, signal?: AbortSignal): Promise<ApiResponse<ClientesListResponse>> {
  return apiClient.get<ApiResponse<ClientesListResponse>>('/bd/clientes', {
    params: {
      nombre: params.nombre,
      apellido: params.apellido,
      numero_telefono: params.numero_telefono,
	  busqueda: params.busqueda,
	  limit: params.limit,
	  cursor: params.cursor,
	  include_total: params.include_total ? 'true' : undefined,
    },
    signal,
  });
}

export async function getClienteByID(id: number | string): Promise<ApiResponse<{ cliente: ClientePG }>> {
  return apiClient.get<ApiResponse<{ cliente: ClientePG }>>(`/bd/clientes/${id}`);
}

export async function crearClienteDB(data: CrearClienteData): Promise<ApiResponse<{ id: number }>> {
  return apiClient.post<ApiResponse<{ id: number }>>('/bd/clientes', data);
}

export async function actualizarClienteDB(
  id: number | string,
  data: ActualizarClienteData,
): Promise<ApiResponse<{ mensaje: string }>> {
  return apiClient.patch<ApiResponse<{ mensaje: string }>>(`/bd/clientes/${id}`, data);
}

export async function eliminarClienteDB(id: number | string): Promise<ApiResponse<{ mensaje: string }>> {
  return apiClient.delete<ApiResponse<{ mensaje: string }>>(`/bd/clientes/${id}`);
}
