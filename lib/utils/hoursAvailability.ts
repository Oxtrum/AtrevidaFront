/**
 * buildHoursAvailability
 * ─────────────────────
 * Calcula el estado de cada hora para un día/tipo dado.
 *
 * Estados:
 *   'free'        → existe al menos un puesto libre del tipo requerido
 *   'full'        → existen puestos del tipo pero todos tienen cliente
 *   'unavailable' → no existe ningún puesto del tipo en esa hora (o es feriado)
 *   'past'        → la hora ya pasó (override sobre todo lo demás)
 */

import { HORAS } from '@/lib/constants/reservationForm';
import type { ApiResponse, DiaSemana } from '@/types/reserva';

export type SlotStatus = 'free' | 'full' | 'unavailable' | 'past';

export type HoursAvailability = Map<string, SlotStatus>;

interface Params {
  disponibilidadData: ApiResponse | null;
  dia: DiaSemana;
  tipoRequerido: 'm' | 'b' | '';
  fechaDia: Date | null;
  semanaTitulo: string; // ← nuevo
}


/** Normaliza "8:00" → "08:00" para comparación consistente con HORAS */
function normalizeHora(h: string): string {
  return h.length === 4 ? '0' + h : h;
}

/** Estado de la hora según el reloj actual */
function calcPastStatus(hora: string, fechaDia: Date | null): boolean {
  if (!fechaDia) return false;

  const hoy = new Date();
  const diaFecha = new Date(fechaDia);
  diaFecha.setHours(0, 0, 0, 0);
  const hoyMid = new Date(hoy);
  hoyMid.setHours(0, 0, 0, 0);

  // Día entero pasado
  if (diaFecha < hoyMid) return true;

  // Hoy: comparar minutos
  if (diaFecha.getTime() === hoyMid.getTime()) {
    const [hh, mm] = hora.split(':').map(Number);
    const slotMin = hh * 60 + mm;
    const ahoraMin = hoy.getHours() * 60 + hoy.getMinutes();
    return slotMin <= ahoraMin;
  }

  return false;
}

export function buildHoursAvailability({
  disponibilidadData,
  dia,
  tipoRequerido,
  fechaDia,
  semanaTitulo
}: Params): HoursAvailability {
  const result: HoursAvailability = new Map();

  // Sin servicio aún → todas las horas free visualmente (nada que filtrar)
  if (!tipoRequerido) {
    for (const hora of HORAS) {
      result.set(hora, calcPastStatus(hora, fechaDia) ? 'past' : 'free');
    }
    return result;
  }

  const tipoBuscado = tipoRequerido === 'b' ? 'bicicleta' : 'mesa';

  // Indexar datos del API: hora normalizada → entries del día seleccionado
  const horaEntries = new Map<string, { tipo: string; cliente?: string }[]>();

  const reservasData = disponibilidadData?.data?.reservas ?? [];
  for (const local of disponibilidadData?.data?.reservas ?? []) {
    for (const semana of local.semanas ?? []) {
      const norm = (t: string) => t.replace(/\b0(\d)\b/g, '$1'); // "06" → "6"
      if (norm(semana.titulo) !== norm(semanaTitulo)) continue; for (const reserva of semana.reservas ?? []) {
        const match = reserva.hora.match(/^(\d{1,2}:\d{2})/);
        if (!match) continue;
        const horaNorm = normalizeHora(match[1]);

        // Buscar el día (el API puede enviarlo en cualquier case)
        const diasReserva = reserva.dias as Record<string, { tipo: string; cliente?: string }[]>;
        const diaData =
          diasReserva[dia] ??
          diasReserva[dia.toLowerCase()] ??
          [];

        if (!Array.isArray(diaData)) continue;

        const existing = horaEntries.get(horaNorm) ?? [];
        horaEntries.set(horaNorm, [...existing, ...diaData]);
      }
    }
  }

  // Calcular estado para cada hora de la constante HORAS
  for (const hora of HORAS) {
    // Past override
    if (calcPastStatus(hora, fechaDia)) {
      result.set(hora, 'past');
      continue;
    }

    // ✅ normalizar para buscar en el mapa (claves son "08:00", HORAS tiene "8:00")
    const claveHora = normalizeHora(hora);
    const entries = horaEntries.get(claveHora) ?? [];

    // Feriado en esa hora → unavailable para cualquier servicio
    const esFeriado = entries.some(e => e.tipo === 'feriado');
    if (esFeriado) {
      result.set(hora, 'unavailable');
      continue;
    }

    const puestosTipo = entries.filter(e => e.tipo === tipoBuscado);

    if (puestosTipo.length === 0) {
      // No existe ese tipo de puesto en esta hora
      result.set(hora, 'unavailable');
    } else if (puestosTipo.every(e => !!e.cliente)) {
      // Todos ocupados
      result.set(hora, 'full');
    } else {
      // Al menos uno libre
      result.set(hora, 'free');
    }
  }

  return result;
}