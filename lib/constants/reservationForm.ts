/**
 * Constantes compartidas para el formulario de reservas.
 * Mantiene ReservationForm.tsx limpio de datos estáticos.
 */

import type { DiaSemana } from '@/types/reserva';

export const HORAS: string[] = [
    '8:00', '8:30', '9:00', '9:30', '10:00', '10:30',
    '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
    '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
    '20:00',
];

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
