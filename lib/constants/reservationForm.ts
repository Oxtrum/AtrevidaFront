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
