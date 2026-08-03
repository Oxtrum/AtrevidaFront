/**
 * Selección de rangos en la rejilla de horas.
 *
 * La rejilla es de media hora y antes cada click reemplazaba la selección
 * entera (siempre la duración del servicio). Ahora los clicks se acumulan,
 * como si se arrastrara sobre la rejilla:
 *
 *   - Primer click  → arranca la reserva (duración por defecto del servicio).
 *   - Click sobre el borde final → suma media hora (9:30 → 10:00 → 10:30 …).
 *   - Click más adelante → mueve el fin directo a esa hora ("de 9:00 a 10:30").
 *   - Click dentro del rango → recorta el rango hasta ahí.
 *   - Click en el inicio o antes → empieza una selección nueva.
 *
 * La lógica vive acá porque la comparten los tres formularios (público, admin
 * crear y admin editar), cada uno con su propio estado y disponibilidad.
 */

import { HORAS, SLOT_MIN, calcularHoraFin, getBusinessClosingTime, timeToMinutes } from '@/lib/constants/reservationForm';

export interface RangoSlots {
    desde: string;
    hasta: string;
    /** Mensaje para el usuario cuando la selección no pudo crecer como pidió. */
    warning: string | null;
}

export interface SeleccionSlotParams {
    /** Hora en la que se hizo click. */
    hora: string;
    /** Inicio actual de la selección ('' si todavía no hay). */
    horaDesde: string;
    /** Fin actual de la selección ('' si todavía no hay). */
    horaHasta: string;
    /** Slots que ocupa el servicio elegido: duración del primer click. */
    slotsPorDefecto: number;
    local: string;
    fecha: Date;
    /** `true` si en esa media hora todavía se puede reservar. */
    esSlotLibre: (hora: string) => boolean;
}

/** Nueva selección mínima: el click manda y la duración la pone el servicio. */
function iniciarSeleccion(
    hora: string,
    slotsPorDefecto: number,
    local: string,
    fecha: Date,
    esSlotLibre: (hora: string) => boolean,
    warning: string | null = null,
): RangoSlots {
    const hasta = calcularHoraFin(hora, slotsPorDefecto, local, fecha);
    const idxDesde = HORAS.indexOf(hora);
    const idxHasta = HORAS.indexOf(hasta);

    // Si la duración del servicio pisa un slot ocupado, se corta antes.
    let idxFinal = idxHasta;
    for (let i = idxDesde; i < idxHasta; i++) {
        if (!esSlotLibre(HORAS[i])) { idxFinal = i; break; }
    }
    if (idxFinal <= idxDesde) idxFinal = idxDesde + 1;

    return { desde: hora, hasta: HORAS[idxFinal] ?? hasta, warning };
}

/** Recorta el fin al cierre del local. Devuelve `null` si no hay hora válida. */
function limitarACierre(hasta: string, local: string, fecha: Date): string | null {
    const cierre = getBusinessClosingTime(local, fecha);
    if (!cierre) return null;
    return timeToMinutes(hasta) > timeToMinutes(cierre) ? cierre : hasta;
}

/**
 * Calcula el rango resultante de hacer click en `hora`, acumulando sobre la
 * selección actual. Nunca devuelve un rango que cruce slots no disponibles.
 */
export function seleccionarSlot({
    hora,
    horaDesde,
    horaHasta,
    slotsPorDefecto,
    local,
    fecha,
    esSlotLibre,
}: SeleccionSlotParams): RangoSlots {
    const idxClick = HORAS.indexOf(hora);
    const idxDesde = HORAS.indexOf(horaDesde);
    const idxHasta = HORAS.indexOf(horaHasta);

    if (idxClick === -1) return { desde: horaDesde, hasta: horaHasta, warning: null };

    // Sin selección previa (o inconsistente) y click en el inicio o antes:
    // arranca de cero.
    if (!horaDesde || !horaHasta || idxDesde === -1 || idxHasta === -1 || idxClick <= idxDesde) {
        return iniciarSeleccion(hora, slotsPorDefecto, local, fecha, esSlotLibre);
    }

    // Click dentro del rango: recorta hasta ahí.
    if (idxClick < idxHasta) {
        return { desde: horaDesde, hasta: HORAS[idxClick], warning: null };
    }

    // Click sobre el borde final: suma un slot. Más adelante: el fin salta a
    // esa hora, que es como se lee en voz alta ("de 9:00 a 10:30").
    const idxNuevoFin = idxClick === idxHasta ? idxClick + 1 : idxClick;
    if (idxNuevoFin >= HORAS.length) {
        return { desde: horaDesde, hasta: horaHasta, warning: 'No se puede extender más allá del horario de atención.' };
    }

    // Todo lo que queda entre el fin actual y el nuevo fin tiene que estar libre.
    for (let i = idxHasta; i < idxNuevoFin; i++) {
        if (!esSlotLibre(HORAS[i])) {
            return iniciarSeleccion(
                hora, slotsPorDefecto, local, fecha, esSlotLibre,
                `No se puede extender hasta las ${hora}: ${HORAS[i]} no está disponible. Se reinició la selección.`,
            );
        }
    }

    const nuevoHasta = limitarACierre(HORAS[idxNuevoFin], local, fecha);
    if (!nuevoHasta || timeToMinutes(nuevoHasta) <= timeToMinutes(horaDesde)) {
        return { desde: horaDesde, hasta: horaHasta, warning: 'No se puede extender más allá del horario de atención.' };
    }

    return {
        desde: horaDesde,
        hasta: nuevoHasta,
        warning: nuevoHasta !== HORAS[idxNuevoFin]
            ? `La reserva se recortó a las ${nuevoHasta}, hora de cierre del local.`
            : null,
    };
}

/** Duración del rango en minutos, para mostrarla junto al horario elegido. */
export function duracionRango(horaDesde: string, horaHasta: string): number {
    if (!horaDesde || !horaHasta) return 0;
    return Math.max(0, timeToMinutes(horaHasta) - timeToMinutes(horaDesde));
}

/** "1 h 30 min" a partir de los minutos del rango. */
export function formatearDuracion(minutos: number): string {
    if (minutos <= 0) return '';
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    if (horas === 0) return `${mins} min`;
    if (mins === 0) return `${horas} h`;
    return `${horas} h ${mins} min`;
}

/** Slots de media hora que cubre el rango. */
export function slotsEnRango(horaDesde: string, horaHasta: string): number {
    return Math.round(duracionRango(horaDesde, horaHasta) / SLOT_MIN);
}
