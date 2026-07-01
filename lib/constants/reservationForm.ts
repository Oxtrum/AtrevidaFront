/**
 * Constantes compartidas para el formulario de reservas.
 * Mantiene ReservationForm.tsx limpio de datos estáticos.
 */

import type { DiaSemana } from '@/types/reserva';

export const HORAS: string[] = [
    '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
    '14:00', '15:00', '16:00', '17:00', '18:00', '19:00',
    '20:00',
];

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
    const hastaMinutes = horaHasta ? timeToMinutes(horaHasta) : desdeMinutes + 60;

    return desdeMinutes >= closingMinutes || hastaMinutes > closingMinutes;
}
