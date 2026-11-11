import { apiClient } from './client';
import type { PaginationMetadata, PaginationParams } from './pagination';
import type { CalendarioConsumoEvento, CalendarioPersonalEvento } from '@/types/atencionesVistas';

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
  cliente_nombre: string;
  empleado_id?: number;
  empleado_nombre: string;
  fecha_atencion: string;
  hora_inicio?: string;
  hora_fin?: string;
  local_id?: number;
  local_nombre: string;
  lugar: string;
  observaciones?: string;
  creado_en: string;
  activo: boolean;
  resultado: 'ATENDIDA' | 'CANCELADA';
  motivo_cancelacion_tipo?: string;
  motivo_cancelacion_detalle?: string;
  insumos_registrados: number;
  insumos_resumen?: string;
  insumos_pendientes: number;
  insumos_pendientes_detalle?: string;
  insumos: AtencionInsumo[];
}

export interface PersonalSugerido { id: number; nombre: string; cargo?: string; local_id?: number; local_nombre?: string }
export interface InsumoSugerido { item_id: number; item_nombre: string; unidad_medida: string; cantidad_por_sesion: number; disponible: number }

/** Filtros del historial de atenciones; se combinan con la paginación por cursor. */
export interface AtencionesFiltros extends PaginationParams {
  local_id?: number;
  fecha_desde?: string;
  fecha_hasta?: string;
  cliente?: string;
  servicio?: string;
  empleado?: string;
  empleado_id?: number;
  item_id?: number;
  pendientes_stock?: boolean;
  resultado?: 'ATENDIDA' | 'CANCELADA' | 'INASISTENCIA';
  q?: string;
}

export interface AtencionesPage {
  atenciones: Atencion[];
  paginacion?: PaginationMetadata;
  total_registros?: number;
}

export type EstadoOperativoJornada = 'PROGRAMADA' | 'PENDIENTE_CIERRE' | 'ATENDIDA' | 'CANCELADA';

export interface JornadaAtencion {
  reserva_id: number;
  fecha: string;
  hora_desde: string;
  hora_hasta: string;
  cliente: string;
  servicio: string;
  local_id?: number;
  local_nombre: string;
  estado_reserva: string;
  motivo_cancelacion_tipo?: string;
  estado_operativo: EstadoOperativoJornada;
  atencion_id?: number;
  empleado_nombre?: string;
  insumos_registrados: number;
  insumos_resumen?: string;
  insumos_pendientes: number;
  puede_atender: boolean;
  puede_ver_atencion: boolean;
  puede_editar_atencion: boolean;
}

export interface JornadaResumen {
  programadas: number;
  atendidas: number;
  pendientes_cierre: number;
  canceladas: number;
  no_asistieron: number;
  deducciones_pendientes: number;
}

export interface JornadaPage {
  fecha: string;
  hoy: string;
  items: JornadaAtencion[];
  resumen: JornadaResumen;
  paginacion?: PaginationMetadata;
  total_registros?: number;
}

export interface JornadaFiltros extends PaginationParams {
  fecha?: string;
  local_id?: number;
  estado?: EstadoOperativoJornada;
  q?: string;
}

const RESUMEN_VACIO: JornadaResumen = {
  programadas: 0,
  atendidas: 0,
  pendientes_cierre: 0,
  canceladas: 0,
  no_asistieron: 0,
  deducciones_pendientes: 0,
};
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

export async function getAtenciones(params: AtencionesFiltros = {}, signal?: AbortSignal): Promise<AtencionesPage> {
  const response = await apiClient.get<{ data?: AtencionesPage }>('/bd/atenciones', { params: { ...params }, signal });
  return response.data ?? { atenciones: [] };
}

export async function getJornada(params: JornadaFiltros = {}, signal?: AbortSignal): Promise<JornadaPage> {
  const response = await apiClient.get<{ data?: JornadaPage }>('/bd/atenciones/jornada', {
    params: { ...params },
    signal,
  });
  return response.data ?? { fecha: '', hoy: '', items: [], resumen: RESUMEN_VACIO };
}

/** Resumen estable de Jornada: depende solo de fecha y local, no de la lista filtrada. */
export async function getJornadaResumen(
  params: Pick<JornadaFiltros, 'fecha' | 'local_id'> = {},
  signal?: AbortSignal,
): Promise<JornadaPage> {
  const response = await apiClient.get<{ data?: JornadaPage }>('/bd/atenciones/jornada/resumen', {
    params,
    signal,
  });
  return response.data ?? { fecha: '', hoy: '', items: [], resumen: RESUMEN_VACIO };
}

export interface CalendarioPersonalFiltros extends PaginationParams {
  fecha_desde?: string;
  fecha_hasta?: string;
  local_id?: number;
  cliente?: string;
  servicio?: string;
  empleado?: string;
  q?: string;
}

export interface CalendarioPersonalPage {
  eventos: CalendarioPersonalEvento[];
  paginacion?: PaginationMetadata;
  total_registros?: number;
}

/** Atenciones activas para el calendario semanal que prioriza el personal atendiente. */
export async function getCalendarioPersonal(
  params: CalendarioPersonalFiltros = {},
  signal?: AbortSignal,
): Promise<CalendarioPersonalPage> {
  const response = await apiClient.get<{ data?: CalendarioPersonalPage }>('/bd/atenciones/calendario-personal', {
    params: { ...params, include_total: params.include_total ? 'true' : undefined },
    signal,
  });
  return response.data ?? { eventos: [] };
}

export interface CalendarioConsumoFiltros extends PaginationParams {
  fecha_desde?: string;
  fecha_hasta?: string;
  local_id?: number;
  item_id?: number;
  cliente?: string;
  servicio?: string;
  empleado?: string;
  estado_descuento?: 'DESCONTADO' | 'PENDIENTE';
  q?: string;
}

export interface CalendarioConsumoPage {
  eventos: CalendarioConsumoEvento[];
  paginacion?: PaginationMetadata;
  total_registros?: number;
}

export type TipoSeguimiento = 'DEDUCCION_PENDIENTE' | 'INASISTENCIA' | 'CANCELACION' | 'PENDIENTE_CIERRE';
export interface SeguimientoItem {
  tipo: TipoSeguimiento;
  atencion_id?: number;
  reserva_id: number;
  fecha: string;
  hora_inicio?: string;
  hora_fin?: string;
  cliente: string;
  servicio: string;
  local_id?: number;
  local_nombre: string;
  empleado_nombre?: string;
  motivo?: string;
  insumos_pendientes: number;
  detalle_insumos_pendientes?: string;
  puede_atender: boolean;
  puede_editar_atencion: boolean;
}
export interface SeguimientoResumen { deducciones_pendientes: number; inasistencias: number; cancelaciones: number; pendientes_cierre: number }
export interface SeguimientoPage { items: SeguimientoItem[]; paginacion?: PaginationMetadata; total_registros?: number }
export interface SeguimientoFiltros extends PaginationParams { local_id?: number; fecha_desde?: string; fecha_hasta?: string; tipo?: TipoSeguimiento; q?: string }
export async function getSeguimiento(params: SeguimientoFiltros = {}, signal?: AbortSignal): Promise<SeguimientoPage> {
  const response = await apiClient.get<{ data?: SeguimientoPage }>('/bd/atenciones/seguimiento', { params: { ...params, include_total: params.include_total ? 'true' : undefined }, signal });
  return response.data ?? { items: [] };
}
export async function getSeguimientoResumen(params: Pick<SeguimientoFiltros, 'local_id' | 'fecha_desde' | 'fecha_hasta'> = {}, signal?: AbortSignal): Promise<SeguimientoResumen> {
  const response = await apiClient.get<{ data?: SeguimientoResumen }>('/bd/atenciones/seguimiento/resumen', { params, signal });
  return response.data ?? { deducciones_pendientes: 0, inasistencias: 0, cancelaciones: 0, pendientes_cierre: 0 };
}

/** Atenciones activas para el calendario semanal que prioriza insumos declarados. */
export async function getCalendarioConsumo(
  params: CalendarioConsumoFiltros = {},
  signal?: AbortSignal,
): Promise<CalendarioConsumoPage> {
  const response = await apiClient.get<{ data?: CalendarioConsumoPage }>('/bd/atenciones/calendario-consumo', {
    params: { ...params, include_total: params.include_total ? 'true' : undefined },
    signal,
  });
  return response.data ?? { eventos: [] };
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
