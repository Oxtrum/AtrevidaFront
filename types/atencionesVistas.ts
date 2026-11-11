import type { ConsumoInsumo } from './inventario';

/** Contratos de las vistas de Atenciones; cada vista expresa una intención distinta. */
export type TipoSeguimiento =
  | 'DEDUCCION_PENDIENTE'
  | 'INASISTENCIA'
  | 'CANCELACION'
  | 'PENDIENTE_CIERRE';

export interface CalendarioPersonalEvento {
  atencion_id: number;
  reserva_id: number;
  fecha: string;
  hora_inicio?: string | null;
  hora_fin?: string | null;
  cliente: string;
  servicio: string;
  local_id?: number | null;
  local_nombre: string;
  empleado_id?: number | null;
  empleado_nombre: string;
  lugar: string;
  insumos_pendientes: number;
}

export interface CalendarioConsumoEvento {
  atencion_id: number;
  reserva_id: number;
  fecha: string;
  hora_inicio?: string | null;
  hora_fin?: string | null;
  cliente: string;
  servicio: string;
  local_id?: number | null;
  local_nombre: string;
  empleado_nombre: string;
  insumos: ConsumoInsumo[];
  insumos_registrados: number;
  insumos_pendientes: number;
}

export interface SeguimientoItem {
  tipo: TipoSeguimiento;
  atencion_id?: number | null;
  reserva_id: number;
  fecha: string;
  hora_inicio?: string | null;
  hora_fin?: string | null;
  cliente: string;
  servicio: string;
  local_id?: number | null;
  local_nombre: string;
  empleado_nombre?: string | null;
  motivo?: string | null;
  insumos_pendientes: number;
  detalle_insumos_pendientes?: string | null;
  puede_atender: boolean;
  puede_editar_atencion: boolean;
}

export interface SeguimientoResumen {
  deducciones_pendientes: number;
  inasistencias: number;
  cancelaciones: number;
  pendientes_cierre: number;
}
