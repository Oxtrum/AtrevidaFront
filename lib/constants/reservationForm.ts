/**
 * Constantes compartidas para el formulario de reservas.
 * Mantiene ReservationForm.tsx limpio de datos estáticos.
 */

import type { DiaSemana } from '@/types/reserva';

/** Granularidad de la rejilla de la agenda, en minutos. */
export const SLOT_MIN = 30;

/** Cuántos slots de la rejilla ocupa una hora. Duración por defecto de una reserva. */
export const SLOTS_POR_HORA = 60 / SLOT_MIN;

export const HORAS: string[] = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
    '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
    '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
    '20:00',
];

/** Horas donde se puede *empezar* una reserva: todas menos el cierre. */
export const HORAS_INICIO: string[] = HORAS.slice(0, -1);

export const DIAS_SEMANA: readonly { value: DiaSemana; label: string }[] = [
    { value: 'LUNES', label: 'Lun' },
    { value: 'MARTES', label: 'Mar' },
    { value: 'MIÉRCOLES', label: 'Mié' },
    { value: 'JUEVES', label: 'Jue' },
    { value: 'VIERNES', label: 'Vie' },
    { value: 'SÁBADO', label: 'Sáb' },
] as const;

export const DIAS_COMPLETO: Record<DiaSemana, string> = {
    LUNES: 'Lunes',
    MARTES: 'Martes',
    MIÉRCOLES: 'Miércoles',
    JUEVES: 'Jueves',
    VIERNES: 'Viernes',
    SÁBADO: 'Sábado',
} as const;

export function timeToMinutes(time: string): number {
    const [hh, mm] = time.split(':').map(Number);
    return (hh || 0) * 60 + (mm || 0);
}

export function getSaturdayClosingTime(local: string): string {
    return local.trim().toUpperCase() === 'PASEO ARANJUEZ' ? '18:00' : '15:00';
}

export function getBusinessClosingTime(local: string, date: Date): string | null {
    if (date.getDay() === 0) return null;
    if (date.getDay() === 6) return getSaturdayClosingTime(local);
    return '20:00';
}

export function isSlotOutsideBusinessHours(local: string, date: Date, horaDesde: string, horaHasta?: string): boolean {
    const closingTime = getBusinessClosingTime(local, date);
    if (!closingTime) return true;

    const closingMinutes = timeToMinutes(closingTime);
    const desdeMinutes = timeToMinutes(horaDesde);
    // Sin horaHasta la pregunta es "¿cabe algo empezando acá?", así que se usa
    // el bloque más corto posible. Con horaHasta se valida el rango real.
    const hastaMinutes = horaHasta ? timeToMinutes(horaHasta) : desdeMinutes + SLOT_MIN;

    return desdeMinutes >= closingMinutes || hastaMinutes > closingMinutes;
}

/**
 * Calcula la hora de fin de una reserva a partir de su inicio y su duración en
 * slots, recortada al cierre del local. Click en 19:30 con duración de 1 hora
 * produce 20:00, no 20:30. Si el local está cerrado ese día (domingo), no hay
 * hora de fin válida y se devuelve `desde` (rango de largo cero), igual que
 * cuando `desde` no pertenece a `HORAS`.
 */
export function calcularHoraFin(desde: string, slots: number, local: string, fecha: Date): string {
    const idxInicio = HORAS.indexOf(desde);
    if (idxInicio === -1) return desde;

    const idxFin = Math.min(idxInicio + Math.max(slots, 1), HORAS.length - 1);
    const fin = HORAS[idxFin];

    // Local cerrado ese día (domingo): no hay hora de fin válida.
    const cierre = getBusinessClosingTime(local, fecha);
    if (!cierre) return desde;
    if (timeToMinutes(fin) > timeToMinutes(cierre)) return cierre;
    return fin;
}

/**
 * Parsea el campo `tiempo` de un servicio a minutos. Se guarda como texto
 * humano ("50 min", "1 hora", "1 hora y 30 min") desde el panel de
 * configuración, y en datos viejos aparece como número suelto ("50").
 */
export function tiempoAMinutos(texto: string | null | undefined): number {
    if (!texto) return 0;

    const raw = Number(texto.trim());
    if (!isNaN(raw) && raw > 0) return raw;

    let total = 0;
    const horasMatch = texto.match(/(\d+)\s*hora/i);
    const minsMatch = texto.match(/(\d+)\s*min/i);
    if (horasMatch) total += parseInt(horasMatch[1], 10) * 60;
    if (minsMatch) total += parseInt(minsMatch[1], 10);
    return total;
}
