import type { DiaSemana, FechaDia } from '@/types/reserva';

/** Fecha del día elegido en la semana visible; `null` mientras no se elija día. */
export function fechaDelDia(
  fechasSemana: Map<DiaSemana, FechaDia> | null | undefined,
  dia: DiaSemana | null,
): Date | null {
  if (!dia) return null;
  return fechasSemana?.get(dia)?.fecha ?? null;
}

/** El horario depende de sucursal y día: sin ambos no se puede elegir hora. */
export function horarioHabilitado(dia: DiaSemana | null, sucursal: string): boolean {
  return Boolean(dia) && Boolean(sucursal);
}

/** Mensaje de validación cuando falta elegir el día de la semana. */
export function errorDiaSemana(dia: DiaSemana | null): string | null {
  return dia ? null : 'Elige el día de la semana';
}
