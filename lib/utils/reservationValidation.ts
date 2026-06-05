/**
 * Validación y lógica del formulario de reservas.
 * Mantiene el componente limpio y testeable.
 */

import type { DiaSemana, EstadoReserva } from '@/types/reserva';
import { getBusinessClosingTime, getSaturdayClosingTime, isSlotOutsideBusinessHours, timeToMinutes } from '@/lib/constants/reservationForm';

export function normalizeBolivianPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  const local = digits;
  return local.slice(0, 8);
}

interface ReservaPayload {
  local: string;
  semana?: string;
  dia?: DiaSemana;
  fecha?: string;
  hora_desde: string;
  hora_hasta: string;
  tipo: string;
  cliente: string;
  numero_telefono?: string;
  servicio: string;
  servicio_solicitado?: string | null;
  servicio_confirmado?: string | null;
  precio?: number;
  notas?: string;
  estado: EstadoReserva;
}

export function getReservationDateRestriction(fecha: string): string | null {
    if (!fecha) return null;

    const date = new Date(`${fecha}T00:00:00`);
    const day = date.getDay();

    if (day === 0) {
        return 'Los domingos no hay atención. Elige una fecha de lunes a sábado.';
    }

    if (day === 6) {
        return 'Los sábados tienen horario reducido según sucursal.';
    }

    return null;
}

export function getReservationSlotRestriction(
    sucursal: string,
    fecha: string,
    horaDesde: string,
    horaHasta: string,
): string | null {
    if (!fecha) return null;

    const date = new Date(`${fecha}T00:00:00`);
    const day = date.getDay();

    if (day === 0) {
        return 'No se pueden hacer reservas los domingos.';
    }

    if (horaDesde && horaHasta) {
        if (isSlotOutsideBusinessHours(sucursal, date, horaDesde, horaHasta)) {
            if (day === 6) {
                return `Los sábados en ${sucursal} solo se puede reservar hasta las ${getSaturdayClosingTime(sucursal)}.`;
            }

            const closingTime = getBusinessClosingTime(sucursal, date);
            return closingTime
                ? `Solo se puede reservar hasta las ${closingTime}.`
                : 'Ese horario está fuera de atención.';
        }
    }

    return null;
}

export function validateReservationForm(
    sucursal: string,
    fecha: string,
    cliente: string,
    numeroTelefono: string,
    servicio: string,
    horaDesde: string,
    horaHasta: string,
    servicioSolicitado?: string,
    skipSlotRestrictions = false,
): Record<string, string> {
    const errors: Record<string, string> = {};

    if (!sucursal) {
        errors.sucursal = 'Selecciona una sucursal';
    }

    if (!fecha) {
        errors.fecha = 'Selecciona una fecha';
    } else {
        const hoy = new Date().toLocaleDateString('en-CA');
        if (fecha < hoy) {
            errors.fecha = 'Selecciona una fecha vigente';
        } else if (new Date(`${fecha}T00:00:00`).getDay() === 0) {
            errors.fecha = 'Los domingos no hay atención';
        }
    }

    if (!cliente.trim()) {
        errors.cliente = 'Ingresa el nombre del cliente';
    }

    const phoneDigits = numeroTelefono.replace(/\D/g, '');
    if (!phoneDigits) {
        errors.numeroTelefono = 'Ingresa el teléfono del cliente';
    } else if (!/^\d{8}$/.test(phoneDigits)) {
        errors.numeroTelefono = 'Ingresa 8 dígitos del teléfono';
    }

    if (!servicio) {
        errors.servicio = 'Selecciona un servicio';
    }

    if (servicio === 'tratamiento_especializado' && !servicioSolicitado) {
        errors.servicioSolicitado = 'Selecciona el tratamiento que te interesa';
    }

    if (!horaDesde) {
        errors.horaDesde = 'Selecciona hora de inicio';
    } else if (!horaHasta) {
        errors.horaHasta = 'Selecciona hora de fin';
    } else if (timeToMinutes(horaDesde) >= timeToMinutes(horaHasta)) {
        errors.horaHasta = 'La hora de fin debe ser mayor a la de inicio';
    } else if (!skipSlotRestrictions) {
        const slotRestriction = getReservationSlotRestriction(sucursal, fecha, horaDesde, horaHasta);
        if (slotRestriction) {
            errors.horaDesde = slotRestriction;
        }
    }

    return errors;
}

export function buildReservaPayload(
  local: string,
  semanaTitle: string,
  dia: DiaSemana,
  horaDesde: string,
  horaHasta: string,
  tipo: string, // 'mesa' o 'bicicleta'
  cliente: string,
  servicio: string,
  numeroTelefono?: string,
  servicioSolicitado?: string | null,
  servicioConfirmado?: string | null,
  precio?: number,
  notas?: string,
  estado: EstadoReserva = 'PENDIENTE',
  fecha?: string, // Fecha ISO para DB: "2025-04-04"
): ReservaPayload {
  // Para BD, usar fecha (si se proporciona)
  if (fecha && fecha.trim() !== '') {
    return {
      local,
      fecha,
      hora_desde: horaDesde,
      hora_hasta: horaHasta,
      tipo, // 'mesa' o 'bicicleta' (lowercase, full name)
      cliente,
      numero_telefono: numeroTelefono,
      servicio,
      servicio_solicitado: servicioSolicitado,
      servicio_confirmado: servicioConfirmado,
      precio,
      notas,
      estado,
    };
  }
  
  // Para Sheets (legacy), usar semana/dia
  return {
    local,
    semana: semanaTitle,
    dia,
    hora_desde: horaDesde,
    hora_hasta: horaHasta,
    tipo,
    cliente,
    numero_telefono: numeroTelefono,
    servicio,
    servicio_solicitado: servicioSolicitado,
    servicio_confirmado: servicioConfirmado,
    precio,
    notas,
    estado,
  };
}
