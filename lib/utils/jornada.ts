/** Franjas del día para ordenar la Jornada como un horario. */
export type Franja = 'MANANA' | 'TARDE' | 'NOCHE';

export const FRANJA_TITULO: Record<Franja, string> = { MANANA: 'Mañana', TARDE: 'Tarde', NOCHE: 'Noche' };

const minutos = (hora: string) => {
  const [h, m] = hora.split(':').map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : NaN;
};

export function franjaDe(hora: string): Franja {
  const min = minutos(hora);
  if (!Number.isFinite(min) || min < 12 * 60) return 'MANANA';
  return min < 18 * 60 ? 'TARDE' : 'NOCHE';
}

/** Agrupa filas por franja conservando su orden; las franjas sin filas no aparecen. */
export function agruparPorFranja<T extends { hora_desde: string }>(filas: T[]): { franja: Franja; titulo: string; filas: T[] }[] {
  const grupos = new Map<Franja, T[]>();
  for (const fila of filas) {
    const franja = franjaDe(fila.hora_desde);
    grupos.set(franja, [...(grupos.get(franja) ?? []), fila]);
  }
  return (['MANANA', 'TARDE', 'NOCHE'] as Franja[])
    .filter((franja) => grupos.has(franja))
    .map((franja) => ({ franja, titulo: FRANJA_TITULO[franja], filas: grupos.get(franja)! }));
}

/** La cita programada que sigue (o que está en curso) a la hora `ahora` (HH:MM). */
export function proximaReservaId(
  filas: { reserva_id: number; hora_desde: string; hora_hasta: string; estado_operativo: string }[],
  ahora: string,
): number | undefined {
  const actual = minutos(ahora);
  return filas
    .filter((f) => f.estado_operativo === 'PROGRAMADA' && minutos(f.hora_hasta) > actual)
    .sort((a, b) => minutos(a.hora_desde) - minutos(b.hora_desde))[0]?.reserva_id;
}
