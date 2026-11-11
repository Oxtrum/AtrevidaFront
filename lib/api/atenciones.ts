import { apiClient } from './client';

export interface AtencionInsumo {
  id: number;
  item_id?: number;
  item_nombre: string;
  unidad_medida: string;
  cantidad_usada: number;
  cantidad_descontada: number;
  estado_descuento: string;
}

export interface Atencion {
  id: number;
  reserva_id: number;
  servicio_reserva: string;
  empleado_id?: number;
  empleado_nombre: string;
  fecha_atencion: string;
  hora_inicio?: string;
  hora_fin?: string;
  local_id?: number;
  lugar: string;
  observaciones?: string;
  creado_en: string;
  activo: boolean;
  insumos_pendientes: number;
  insumos_pendientes_detalle?: string;
  insumos: AtencionInsumo[];
}

export interface PersonalSugerido { id: number; nombre: string; cargo?: string; local_id?: number; local_nombre?: string }
export interface InsumoSugerido { item_id: number; item_nombre: string; unidad_medida: string; cantidad_por_sesion: number; disponible: number }
export interface AtencionesPage { atenciones: Atencion[]; total: number; limit: number; offset: number }
export interface AtencionInput {
  empleado_id?: number;
  empleado_nombre: string;
  fecha_atencion: string;
  hora_inicio?: string;
  hora_fin?: string;
  lugar: string;
  observaciones?: string;
  insumos: Array<{ item_id: number; cantidad: number }>;
  confirmar_stock_insuficiente?: boolean;
}

/** Atenciones de la más reciente a la más antigua. `fecha_desde`/`fecha_hasta` (YYYY-MM-DD, incluidas) acotan por fecha de atención. */
export async function getAtenciones(params: { limit: number; offset: number; local_id?: number; fecha_desde?: string; fecha_hasta?: string }): Promise<AtencionesPage> {
  const response = await apiClient.get<{ data?: AtencionesPage }>('/bd/atenciones', { params });
  return response.data ?? { atenciones: [], total: 0, ...params };
}

export async function getAtencion(id: number): Promise<Atencion> {
  const response = await apiClient.get<{ data?: Atencion }>(`/bd/atenciones/${id}`);
  if (!response.data) throw new Error('No se encontró la atención.');
  return response.data;
}

export async function getPersonalSugerido(q: string, signal?: AbortSignal): Promise<PersonalSugerido[]> {
  const response = await apiClient.get<{ data?: { personal?: PersonalSugerido[] } }>('/bd/personal/sugerencias', { params: { q }, signal });
  return response.data?.personal ?? [];
}

export async function getInsumosSugeridos(id: number, signal?: AbortSignal): Promise<InsumoSugerido[]> {
  const response = await apiClient.get<{ data?: { insumos?: InsumoSugerido[] } }>('/bd/atenciones/insumos-sugeridos', { params: { reserva_id: id }, signal });
  return response.data?.insumos ?? [];
}

export async function registrarAtencion(id: number, data: AtencionInput): Promise<Atencion> {
  const response = await apiClient.post<{ data?: Atencion }>(`/bd/reservas/${id}/atencion`, data);
  return response.data as Atencion;
}

export async function actualizarAtencion(id: number, data: AtencionInput): Promise<Atencion> {
  const response = await apiClient.put<{ data?: Atencion }>(`/bd/atenciones/${id}`, data);
  return response.data as Atencion;
}

export async function desactivarAtencion(id: number, restituirStock: boolean): Promise<void> {
  await apiClient.post(`/bd/atenciones/${id}/desactivar`, { restituir_stock: restituirStock });
}
