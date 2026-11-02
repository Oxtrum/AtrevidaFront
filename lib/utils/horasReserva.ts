import { HORAS } from '@/lib/constants/reservationForm';

/** Inserta una hora ya guardada que no esta en la rejilla de 30 minutos, para no perderla de la lista. */
function conActual(horas: string[], actual?: string): string[] {
  if (!actual || horas.includes(actual)) return horas;
  return [...horas, actual].sort();
}

/**
 * Horas en las que puede empezar una reserva ese dia: bloques de 30 minutos antes del cierre. Sin cierre (dia
 * cerrado) no hay ninguna. `actual` es la hora ya guardada; si esta fuera de la rejilla (12:10) se conserva.
 */
export function horasInicioDisponibles(cierre: string | null, actual?: string): string[] {
  if (!cierre) return [];
  return conActual(HORAS.filter((h) => h < cierre), actual);
}

/** Horas en las que puede terminar una reserva que empieza en `inicio`: despues del inicio y hasta el cierre. */
export function horasFinDisponibles(inicio: string, cierre: string | null, actual?: string): string[] {
  if (!cierre) return [];
  return conActual(HORAS.filter((h) => h > inicio && h <= cierre), actual);
}
