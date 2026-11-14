import type { BadgeTone } from '@/components/AdminConfig/StatusBadge';

/** Estados que Atenciones muestra en cualquiera de sus vistas. Un solo lugar para etiqueta y tono. */
export type EstadoAtencion =
  | 'PROGRAMADA'
  | 'PENDIENTE_CIERRE'
  | 'ATENDIDA'
  | 'CANCELADA'
  | 'INASISTENCIA'
  | 'STOCK_PENDIENTE';

export const ATENCION_ESTADO: Record<EstadoAtencion, { label: string; tone: BadgeTone }> = {
  PROGRAMADA: { label: 'Programada', tone: 'info' },
  PENDIENTE_CIERRE: { label: 'Pendiente de cierre', tone: 'warning' },
  ATENDIDA: { label: 'Atendida', tone: 'success' },
  CANCELADA: { label: 'Cancelada', tone: 'danger' },
  INASISTENCIA: { label: 'Inasistencia', tone: 'danger' },
  STOCK_PENDIENTE: { label: 'Descuento de inventario pendiente', tone: 'warning' },
};

/** Jornada: la cancelación por inasistencia se distingue de la cancelación normal. */
export function estadoDeJornada(row: { estado_operativo: string; motivo_cancelacion_tipo?: string | null }): EstadoAtencion {
  if (row.estado_operativo === 'CANCELADA' && row.motivo_cancelacion_tipo === 'INASISTENCIA') return 'INASISTENCIA';
  return row.estado_operativo as EstadoAtencion;
}

const DE_SEGUIMIENTO: Record<string, EstadoAtencion> = {
  DEDUCCION_PENDIENTE: 'STOCK_PENDIENTE',
  CANCELACION: 'CANCELADA',
  INASISTENCIA: 'INASISTENCIA',
  PENDIENTE_CIERRE: 'PENDIENTE_CIERRE',
};

export function estadoDeSeguimiento(tipo: string): EstadoAtencion {
  return DE_SEGUIMIENTO[tipo] ?? (tipo as EstadoAtencion);
}

/** Atención ya registrada: atendida, o con el descuento de inventario pendiente si algún insumo no se pudo descontar. */
export function estadoDeAtencion(row: { insumos_pendientes: number }): EstadoAtencion {
  return row.insumos_pendientes > 0 ? 'STOCK_PENDIENTE' : 'ATENDIDA';
}

/** Historial: resultado con el que se cerró la atención. */
export function estadoDeResultado(row: { resultado: string; motivo_cancelacion_tipo?: string | null }): EstadoAtencion {
  if (row.resultado !== 'CANCELADA') return 'ATENDIDA';
  return row.motivo_cancelacion_tipo === 'INASISTENCIA' ? 'INASISTENCIA' : 'CANCELADA';
}
