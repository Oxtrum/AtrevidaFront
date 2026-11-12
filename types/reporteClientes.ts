import type { PeriodoReporte } from './rrhh';

export interface ResumenClientes {
  /** Clientes que pagaron o completaron una cita en el periodo. */
  clientes_activos: number;
  clientes_activos_anterior: number;
  variacion_clientes_pct: number | null;
  /** Su primera actividad en el negocio cae en este periodo. */
  clientes_nuevos: number;
  clientes_recurrentes: number;
  /** Dinero pagado por clientes registrados. */
  ingresos: number;
  ingresos_anterior: number;
  variacion_ingresos_pct: number | null;
  /** Ventas sin cliente asignado: no entran en ningún ranking. */
  ingresos_sin_cliente: number;
  ingresos_sin_cliente_pct: number;
  clientes_que_pagaron: number;
  ticket_promedio_cliente: number;
  ticket_promedio_cliente_anterior: number;
  /** Citas completadas de clientes registrados. */
  citas: number;
  citas_anterior: number;
  /** Citas completadas con la reserva sin vincular a un cliente. */
  citas_sin_cliente: number;
  canceladas: number;
  inasistencias: number;
  clientes_que_volvieron: number;
  /** null = el periodo anterior no tuvo clientes. */
  tasa_retorno_pct: number | null;
  /** Saldo pendiente de hoy; no depende del periodo. */
  por_cobrar: number;
  deudores: number;
  /** Activos en más de un local; solo en el bloque general. */
  clientes_compartidos: number;
}

export interface ClienteReporte {
  /** Puesto por dinero generado. */
  posicion: number;
  cliente_id: number;
  nombre: string;
  telefono: string;
  /** Locales donde tuvo movimiento, separados por coma. */
  locales: string;
  ingresos: number;
  participacion_pct: number;
  ingresos_anterior: number;
  variacion_pct: number | null;
  pagos: number;
  ticket_promedio: number;
  /** Citas completadas. */
  citas: number;
  citas_anterior: number;
  /** Reservas pendientes o agendadas dentro del periodo. */
  citas_agendadas: number;
  canceladas: number;
  inasistencias: number;
  servicio_top: string;
  servicio_top_cantidad: number;
  /** Periodos seguidos (contando este) con pago o cita completada; se corta en `racha_maxima`. */
  racha_periodos: number;
  es_nuevo: boolean;
  ultima_actividad: string;
  saldo_pendiente: number;
}

export interface ClienteDeuda {
  cliente_id: number;
  nombre: string;
  telefono: string;
  saldo_pendiente: number;
  cargos: number;
  deuda_desde: string;
  dias_deuda: number;
}

export interface ReporteClientesBloque {
  local_id: number | null;
  local_nombre: string;
  resumen: ResumenClientes;
  /** Los 10 que más dinero generaron. La lista completa se pide paginada con `getReporteClientesDetalle`. */
  top_ingresos: ClienteReporte[];
  /** Los 10 con más citas completadas. */
  top_citas: ClienteReporte[];
  /** Los 10 con más periodos seguidos viniendo (mínimo 2). */
  top_fieles: ClienteReporte[];
  /** Los 10 con más reservas canceladas. */
  top_canceladas: ClienteReporte[];
  /** Los 10 que más deben hoy; el total está en `resumen.deudores`. */
  deudores: ClienteDeuda[];
  /** Solo trae los días con movimiento. */
  serie: { fecha: string; clientes: number; ingresos: number }[];
}

export interface ReporteClientes {
  periodo: PeriodoReporte;
  desde: string;
  hasta: string;
  desde_anterior: string;
  hasta_anterior: string;
  racha_maxima: number;
  general: ReporteClientesBloque;
  locales: ReporteClientesBloque[];
}
