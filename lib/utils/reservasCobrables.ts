import type { ReservaBD } from '@/types/reserva';

type ReservaCobrable = Pick<ReservaBD, 'estado' | 'fecha' | 'hora_desde' | 'estado_cobro' | 'plan_id'>;

/** Cómo se presenta una reserva en la lista de caja. */
export type EtiquetaCobro = 'COMPLETADA' | 'HOY' | 'ATRASADA' | 'ADELANTADA' | 'PENDIENTE' | 'CANCELADA';

/** Completada sin cobro, o agendada que no paga un paquete (se completa al cobrarla). */
export function esCobrable(reserva: ReservaCobrable): boolean {
  if (reserva.estado === 'COMPLETADO') return reserva.estado_cobro === 'POR_COBRAR';
  return reserva.estado === 'AGENDADO' && !reserva.plan_id;
}

/**
 * Todo lo del cliente que no está pagado: también lo que quedó agendado sin completarse, sigue pendiente o se canceló,
 * para poder cobrarlo sin buscarlo en otra pantalla. Quedan fuera lo cobrado y lo que paga un paquete.
 */
export function faltaPagar(reserva: ReservaCobrable): boolean {
  if (reserva.estado === 'COMPLETADO') return reserva.estado_cobro === 'POR_COBRAR';
  return !reserva.plan_id;
}

export function etiquetaCobro(reserva: Pick<ReservaCobrable, 'estado' | 'fecha'>, hoy: string): EtiquetaCobro {
  if (reserva.estado === 'COMPLETADO') return 'COMPLETADA';
  if (reserva.estado === 'PENDIENTE') return 'PENDIENTE';
  if (reserva.estado === 'RECHAZADO') return 'CANCELADA';
  if (reserva.fecha === hoy) return 'HOY';
  return reserva.fecha < hoy ? 'ATRASADA' : 'ADELANTADA';
}

const ORDEN: Record<EtiquetaCobro, number> = { COMPLETADA: 0, HOY: 1, ATRASADA: 2, ADELANTADA: 3, PENDIENTE: 4, CANCELADA: 5 };

/** Primero lo ya brindado, luego lo de hoy; dentro de cada grupo, por fecha y hora. No modifica la lista recibida. */
export function ordenarCobrables<T extends ReservaCobrable>(reservas: T[], hoy: string): T[] {
  return [...reservas].sort((a, b) =>
    ORDEN[etiquetaCobro(a, hoy)] - ORDEN[etiquetaCobro(b, hoy)]
    || a.fecha.localeCompare(b.fecha)
    || a.hora_desde.padStart(5, '0').localeCompare(b.hora_desde.padStart(5, '0')),
  );
}
