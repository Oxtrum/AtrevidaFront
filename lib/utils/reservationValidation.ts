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

    const toMin = (h: string) => {
        const [hh, mm] = h.split(':').map(Number);
        return hh * 60 + (mm || 0);
    };

    if (!horaDesde) {
        errors.horaDesde = 'Selecciona hora de inicio';
    } else if (!horaHasta) {
        errors.horaHasta = 'Selecciona hora de fin';
    } else if (toMin(horaDesde) >= toMin(horaHasta)) {
        errors.horaHasta = 'La hora de fin debe ser mayor a la de inicio';
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
  fecha?: string, // Fecha ISO para DB: "2025-04-04"
): any {
  // Para BD, usar fecha (si se proporciona)
  if (fecha && fecha.trim() !== '') {
    return {
      local,
      fecha,
      hora_desde: horaDesde,
      hora_hasta: horaHasta,
      tipo, // 'mesa' o 'bicicleta' (lowercase, full name)
      cliente,
      servicio,
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
    servicio,
  };
}
