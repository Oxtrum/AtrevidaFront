/**
 * Validación y lógica del formulario de reservas.
 * Mantiene el componente limpio y testeable.
 */

import type { DiaSemana, ReservaFormData } from '@/types/reserva';

export function validateReservationForm(
    sucursal: string,
    semanaActual: any,
    cliente: string,
    servicio: string,
    horaDesde: string,
    horaHasta: string,
): Record<string, string> {
    const errors: Record<string, string> = {};

    if (!sucursal) {
        errors.sucursal = 'Selecciona una sucursal';
    }

    if (!semanaActual) {
        errors.semana = 'Selecciona una semana';
    }

    if (!cliente.trim()) {
        errors.cliente = 'Ingresa el nombre del cliente';
    }

    if (!servicio) {
        errors.servicio = 'Selecciona un servicio';
    }

    if (!horaDesde) {
        errors.horaDesde = 'Selecciona hora de inicio';
    } else if (!horaHasta) {
        errors.horaHasta = 'Selecciona hora de fin';
    } else if (horaDesde >= horaHasta) {
        errors.horaHasta = 'La hora de fin debe ser mayor a la de inicio';
    }

    return errors;
}

export function buildReservaPayload(
    sucursal: string,
    semanaTitle: string,
    dia: DiaSemana,
    horaDesde: string,
    horaHasta: string,
    tipo: 'm' | 'b',
    cliente: string,
    servicio: string,
): ReservaFormData {
    return {
        local: sucursal,
        semana: semanaTitle,
        dia,
        hora_desde: horaDesde,
        hora_hasta: horaHasta,
        tipo,
        cliente,
        servicio,
    };
}
