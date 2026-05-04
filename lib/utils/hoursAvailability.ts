/**
 * buildHoursAvailability
 * ─────────────────────
 * SIEMPRE muestra 8:00-20:00
 * Marca 'occupied' si hay reservas, 'free' si no, 'past' si ya pasó
 */

import { HORAS } from '@/lib/constants/reservationForm';
import type { DiaSemana } from '@/types/reserva';

export type SlotStatus = 'free' | 'occupied' | 'past';

export type HoursAvailability = Map<string, SlotStatus>;

interface Params {
  fechaDia: Date | null;
}

function calcPastStatus(hora: string, fechaDia: Date | null): boolean {
  if (!fechaDia) return false;

  const hoy = new Date();
  const diaFecha = new Date(fechaDia);
  diaFecha.setHours(0, 0, 0, 0);
  const hoyMid = new Date(hoy);
  hoyMid.setHours(0, 0, 0, 0);

  if (diaFecha < hoyMid) return true;

  if (diaFecha.getTime() === hoyMid.getTime()) {
    const [hh, mm] = hora.split(':').map(Number);
    const slotMin = hh * 60 + mm;
    const ahoraMin = hoy.getHours() * 60 + hoy.getMinutes();
    return slotMin <= ahoraMin;
  }

  return false;
}

export function buildHoursAvailability({
  fechaDia,
}: Params): HoursAvailability {
  const result: HoursAvailability = new Map();

  for (const hora of HORAS) {
    const isPast = calcPastStatus(hora, fechaDia);
    result.set(hora, isPast ? 'past' : 'free');
  }

  return result;
}
