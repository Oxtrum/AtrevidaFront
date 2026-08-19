/**
 * Selección de rangos en la rejilla de horas.
 *
 * La rejilla es de media hora y la selección se arma en un ciclo de 2 clicks:
 *
 *   - Click de inicio  → fija la hora de inicio y toma automáticamente la
 *     duración del servicio elegido (ej. 1h → 2 bloques). El próximo click
 *     será de ajuste.
 *   - Click de ajuste   → **el bloque clickeado queda incluido** en la
 *     reserva: clickear antes acorta, clickear después alarga. La duración
 *     del servicio es sólo el valor inicial, no un tope: el ajuste puede
 *     dejar la reserva más corta o más larga. El próximo click vuelve a ser
 *     un click de inicio.
 *
 * Que el bloque clickeado siempre quede dentro es lo que hace que cada click
 * mueva algo visible, en vez de sentirse muerto.
 *
 * Ninguna de las dos funciones falla ni devuelve mensajes de error: lo que no
 * se puede aplicar se recorta en silencio al límite válido más cercano (slots
 * ocupados, cierre del local). Un click que no sirve como ajuste (cae antes
 * del inicio) lo resuelve el hook tratándolo como un click de inicio — ver
 * `puedeAjustarFin`.
 *
 * La lógica vive acá porque la comparten los tres formularios (público, admin
 * crear y admin editar), cada uno con su propio estado y disponibilidad.
 */

import { HORAS, SLOT_MIN, calcularHoraFin, getBusinessClosingTime, timeToMinutes } from '@/lib/constants/reservationForm';

export interface RangoSlots {
    desde: string;
    hasta: string;
}

export interface SeleccionSlotParams {
    /** Hora en la que se hizo click: ese bloque queda incluido en la reserva. */
    hora: string;
    /** Inicio actual de la selección ('' si todavía no hay). */
    horaDesde: string;
    /** Fin actual de la selección ('' si todavía no hay). */
    horaHasta: string;
    local: string;
    fecha: Date;
    /** `true` si en esa media hora todavía se puede reservar. */
    esSlotLibre: (hora: string) => boolean;
}

/**
 * `true` si un click en `hora` puede interpretarse como ajuste del fin de la
 * selección actual: hay un rango armado y el click no cae antes del inicio.
 * Si es `false`, el hook lo trata como click de inicio en vez de mostrar un
 * error.
 */
export function puedeAjustarFin(hora: string, horaDesde: string, horaHasta: string): boolean {
    const idxClick = HORAS.indexOf(hora);
    const idxDesde = HORAS.indexOf(horaDesde);
    const idxHasta = HORAS.indexOf(horaHasta);
    if (idxClick === -1 || idxDesde === -1 || idxHasta === -1) return false;
    return idxClick >= idxDesde;
}

/** Click de inicio: el click manda y la duración la pone el servicio. */
export function iniciarSeleccion(
    hora: string,
    slotsPorDefecto: number,
    local: string,
    fecha: Date,
    esSlotLibre: (hora: string) => boolean,
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

    return { desde: hora, hasta: HORAS[idxFinal] ?? hasta };
}

/** Recorta el fin al cierre del local. Devuelve `null` si no hay hora válida. */
function limitarACierre(hasta: string, local: string, fecha: Date): string | null {
    const cierre = getBusinessClosingTime(local, fecha);
    if (!cierre) return null;
    return timeToMinutes(hasta) > timeToMinutes(cierre) ? cierre : hasta;
}

/**
 * Click de ajuste: el bloque clickeado pasa a ser el último de la reserva, la
 * acorte o la alargue. La duración del servicio no es tope acá. Recorta en
 * silencio si el tramo pisa un slot ocupado o el cierre del local, y devuelve
 * el rango actual sin cambios sólo si no se puede aplicar nada.
 */
export function modificarFin({
    hora,
    horaDesde,
    horaHasta,
    local,
    fecha,
    esSlotLibre,
}: SeleccionSlotParams): RangoSlots {
    const actual = { desde: horaDesde, hasta: horaHasta };
    const idxClick = HORAS.indexOf(hora);
    const idxDesde = HORAS.indexOf(horaDesde);

    if (idxClick === -1 || idxDesde === -1 || idxClick < idxDesde) return actual;

    // El bloque clickeado queda dentro de la reserva: el fin es el borde
    // siguiente ("clic en 12:30" → la reserva llega hasta las 13:00).
    let idxNuevoFin = Math.min(idxClick + 1, HORAS.length - 1);

    // Frenar en el primer slot no disponible del tramo cubierto.
    for (let i = idxDesde; i < idxNuevoFin; i++) {
        if (!esSlotLibre(HORAS[i])) { idxNuevoFin = i; break; }
    }

    if (idxNuevoFin <= idxDesde) return actual;

    const nuevoHasta = limitarACierre(HORAS[idxNuevoFin], local, fecha);
    if (!nuevoHasta || timeToMinutes(nuevoHasta) <= timeToMinutes(horaDesde)) return actual;

    return { desde: horaDesde, hasta: nuevoHasta };
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
