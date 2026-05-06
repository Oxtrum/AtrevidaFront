import { DiaSemana, ReservaDetalle, ReservaPorHora, normalizeTipo } from '@/types/reserva';

/**
 * Cuenta los slots disponibles por tipo (mesa, bicicleta)
 * @param dia - Array de reservas para un día específico
 * @param tipo - Tipo de servicio ('m' para mesa | 'b' para bicicleta)
 * @returns Número de slots disponibles del tipo especificado
 */
export function contarSlotsPorTipo(
  dia: ReservaDetalle[] | undefined,
  tipo: 'mesa' | 'bicicleta' | 'm' | 'b'
): number {
  if (!dia || dia.length === 0) return 0;
  const tipoNorm = tipo === 'mesa' ? 'm' : tipo === 'bicicleta' ? 'b' : tipo;
  return dia.filter(slot => normalizeTipo(slot.tipo) === tipoNorm).length;
}

/**
 * Obtiene el conteo de slots por tipo para una hora/día específico
 * @param horaObj - Objeto con la información de la hora
 * @param diaSemana - Día de la semana
 * @returns Objeto con conteo de mesas y bicicletas
 */
export function contarSlotsPorTipoEnHora(
  horaObj: ReservaPorHora,
  diaSemana: DiaSemana
): { mesa: number; bicicleta: number } {
  const slotsDelDia = horaObj.dias[diaSemana];

  return {
    mesa: contarSlotsPorTipo(slotsDelDia, 'm'),
    bicicleta: contarSlotsPorTipo(slotsDelDia, 'b'),
  };
}

/**
 * Verifica si hay disponibilidad de un tipo específico
 * @param dia - Array de reservas para un día
 * @param tipo - Tipo a verificar ('mesa' | 'bicicleta' | 'm' | 'b')
 * @returns true si hay al menos un slot disponible del tipo
 */
export function tieneDisponibilidad(
  dia: ReservaDetalle[] | undefined,
  tipo: 'mesa' | 'bicicleta' | 'm' | 'b'
): boolean {
  return contarSlotsPorTipo(dia, tipo) > 0;
}

/**
 * Obtiene la información de disponibilidad general de una hora/día
 * @param horaObj - Objeto con la información de la hora
 * @param diaSemana - Día de la semana
 * @returns Objeto con disponibilidad general
 */
export function obtenerDisponibilidadEnHora(
  horaObj: ReservaPorHora,
  diaSemana: DiaSemana
): {
  tieneDisponibilidad: boolean;
  conMesas: boolean;
  conBicicletas: boolean;
  totalSlots: number;
  slotsMesa: number;
  slotsBicicleta: number;
} {
  const slotsDelDia = horaObj.dias[diaSemana];
  const mesas = contarSlotsPorTipo(slotsDelDia, 'm');
  const bicicletas = contarSlotsPorTipo(slotsDelDia, 'b');
  const total = (slotsDelDia?.length || 0);

  return {
    tieneDisponibilidad: total > 0,
    conMesas: mesas > 0,
    conBicicletas: bicicletas > 0,
    totalSlots: total,
    slotsMesa: mesas,
    slotsBicicleta: bicicletas,
  };
}

/**
 * Obtiene las reservas ocupadas (con cliente) de un día
 * @param dia - Array de reservas para un día
 * @returns Array de reservas que tienen cliente
 */
export function obtenerReservasOcupadas(dia: ReservaDetalle[] | undefined): ReservaDetalle[] {
  if (!dia) return [];
  return dia.filter(slot => slot.cliente && slot.cliente.trim() !== '');
}

/**
 * Obtiene las reservas disponibles (sin cliente) de un día
 * @param dia - Array de reservas para un día
 * @returns Array de reservas sin cliente
 */
export function obtenerReservasDisponibles(dia: ReservaDetalle[] | undefined): ReservaDetalle[] {
  if (!dia) return [];
  return dia.filter(slot => !slot.cliente || slot.cliente.trim() === '');
}

/**
 * Extrae el nombre del servicio formateado
 * @param servicio - String del servicio (ej: "m - Facial", "b - E-Pulse Bike")
 * @returns Nombre del servicio limpio
 */
export function extraerNombreServicio(servicio: string | undefined): string {
  if (!servicio) return '';
  // Si contiene " - " tomar la segunda parte
  if (servicio.includes(' - ')) {
    return servicio.split(' - ')[1];
  }
  return servicio;
}

/**
 * Obtiene etiqueta visual de disponibilidad para público
 * @param slotsPorTipo - Objeto con conteo de mesas y bicicletas
 * @returns String descriptivo de disponibilidad (ej: "3 mesas")
 */
export function obtenerEtiquetaDisponibilidad(slotsPorTipo: {
  mesa: number;
  bicicleta: number;
}): string {
  const { mesa, bicicleta } = slotsPorTipo;
  const partes: string[] = [];

  if (mesa > 0) {
    partes.push(`${mesa} mesa${mesa !== 1 ? 's' : ''}`);
  }

  if (bicicleta > 0) {
    partes.push(`${bicicleta} bicicleta${bicicleta !== 1 ? 's' : ''}`);
  }

  if (partes.length === 0) {
    return 'Ocupado';
  }

  return partes.join(', ');
}

/**
 * Valida si una hora está disponible (no es pasada)
 * @param fecha - Fecha de la hora
 * @returns true si la fecha es hoy o futura
 */
export function esHoraDisponible(fecha: Date): boolean {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fechaComparar = new Date(fecha);
  fechaComparar.setHours(0, 0, 0, 0);
  return fechaComparar >= hoy;
}

/**
 * Obtiene el tipo de icono a mostrar según disponibilidad
 * @param disponibilidad - Objeto con info de disponibilidad
 * @returns String con el tipo ('disponible', 'parcial', 'ocupado')
 */
export function obtenerEstadoSlot(disponibilidad: {
  tieneDisponibilidad: boolean;
  conMesas: boolean;
  conBicicletas: boolean;
}): 'disponible' | 'parcial' | 'ocupado' {
  if (!disponibilidad.tieneDisponibilidad) return 'ocupado';
  if (disponibilidad.conMesas && disponibilidad.conBicicletas) return 'disponible';
  return 'parcial';
}
