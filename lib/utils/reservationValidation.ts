/**
 * Validación y lógica del formulario de reservas.
 * Mantiene el componente limpio y testeable.
 */

import type { DiaSemana, EstadoReserva } from '@/types/reserva';

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
  precio?: number;
  notas?: string;
  estado: EstadoReserva;
}

export function validateReservationForm(
    sucursal: string,
    fecha: string,
    cliente: string,
    numeroTelefono: string,
    servicio: string,
    horaDesde: string,
    horaHasta: string,
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
        }
    }

    if (!cliente.trim()) {
        errors.cliente = 'Ingresa el nombre del cliente';
    }

    const phoneDigits = numeroTelefono.replace(/\D/g, '');
    if (!phoneDigits) {
        errors.numeroTelefono = 'Ingresa el teléfono del cliente';
    } else if (!/^[67]\d{7}$/.test(phoneDigits)) {
        errors.numeroTelefono = 'Ingresa 8 dígitos locales de Bolivia';
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
  numeroTelefono?: string,
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
    precio,
    notas,
    estado,
  };
}
