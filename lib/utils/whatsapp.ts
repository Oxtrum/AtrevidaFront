import type { ReservaBD } from '@/types/reserva';
import type { ReservaDuplicada } from '@/lib/api/reservas';
import { resolvePhoneE164 } from './phone';

/** Número comercial en E.164: no se le antepone ningún prefijo. */
export const ATREVIDA_WHATSAPP_E164 = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '+59177411855';

export function buildWhatsappUrl(e164: string | null | undefined, message?: string): string | null {
  const digits = e164?.replace(/\D/g, '') ?? '';
  if (!digits) return null;
  return `https://api.whatsapp.com/send?phone=${digits}${message ? `&text=${encodeURIComponent(message)}` : ''}`;
}

export function buildClientWhatsappUrl(
  telefonoE164: string | null | undefined,
  numeroTelefono: string | null | undefined,
  message?: string,
): string | null {
  return buildWhatsappUrl(resolvePhoneE164(telefonoE164, numeroTelefono), message);
}

export function buildBusinessWhatsappUrl(message?: string): string | null {
  return buildWhatsappUrl(resolvePhoneE164(ATREVIDA_WHATSAPP_E164), message);
}

const getDateISOWithOffset = (daysOffset: number) => {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toLocaleDateString('en-CA');
};

const formatFechaLarga = (fecha: string) => {
  const [year, month, day] = fecha.split('-').map(Number);
  if (!year || !month || !day) return fecha;
  return new Date(year, month - 1, day).toLocaleDateString('es-BO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
};

const getDayLabel = (fecha: string) => {
  if (fecha === getDateISOWithOffset(0)) return 'Hoy';
  if (fecha === getDateISOWithOffset(1)) return 'Mañana';
  return `El ${formatFechaLarga(fecha)}`;
};

/** "8:00" / "08:00:00" -> "8:00AM" */
const formatHora12 = (hora: string) => {
  const [rawHour, rawMinute] = hora.split(':');
  const hour = Number(rawHour);
  if (Number.isNaN(hour)) return hora;
  const sufijo = hour < 12 ? 'AM' : 'PM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${(rawMinute ?? '00').padStart(2, '0')}${sufijo}`;
};

/** Saludo según la hora en que se envía el recordatorio. */
const getSaludo = () => {
  const hora = new Date().getHours();
  if (hora < 12) return 'Hola buenos días 🌞';
  if (hora < 19) return 'Hola buenas tardes ✨';
  return 'Hola buenas noches 🌙';
};

/** Nombres con tilde para el mensaje; el resto cae a Capitalizado. */
const LOCAL_LABELS: Record<string, string> = {
  'SAN MARTIN': 'San Martín',
};

const formatLocal = (local: string) =>
  LOCAL_LABELS[local.trim().toUpperCase()] ??
  local
    .toLocaleLowerCase('es-BO')
    .replace(/(^|\s)\p{L}/gu, letra => letra.toLocaleUpperCase('es-BO'));

/**
 * Construye el deep-link de WhatsApp para recordar una cita al cliente.
 * Calcula el día relativo (Hoy / Mañana / la fecha) desde `reserva.fecha`.
 * Devuelve null si la reserva no tiene teléfono.
 */
export const buildReminderWhatsappHref = (reserva: ReservaBD): string | null => {
  const message = [
    getSaludo(),
    `${getDayLabel(reserva.fecha)} te esperamos para tu cita ${formatHora12(reserva.hora_desde)} 🌹`,
    `📍Sucursal ${formatLocal(reserva.local)}`,
  ].join('\n');

  return buildClientWhatsappUrl(reserva.telefono_e164, reserva.numero_telefono, message);
};

/**
 * Mensaje al cliente cuando el panel detecta que tiene más de una reserva el mismo día
 * (puede ser una confusión al registrar). `fecha` es YYYY-MM-DD y es opcional.
 * Devuelve null si no hay teléfono utilizable.
 */
export const buildDuplicadaWhatsappHref = (
  params: {
    telefonoE164?: string | null;
    numeroTelefono?: string | null;
    fecha?: string;
    reservas: ReservaDuplicada[];
  },
): string | null => {
  const dia = params.fecha ? getDayLabel(params.fecha).toLowerCase() : 'ese día';
  const lista = params.reservas.map(
    r => `• ${formatHora12(r.hora_desde)} · Sucursal ${formatLocal(r.local)}`,
  );
  const message = [
    getSaludo(),
    `Revisando la agenda vemos que ${dia} tienes más de una cita:`,
    ...lista,
    '¿Nos confirmas si todas están bien?',
  ].join('\n');

  return buildClientWhatsappUrl(params.telefonoE164, params.numeroTelefono, message);
};

const comidaPrevia = (horaDesde: string) => {
  const hora = Number((horaDesde.split(':')[0] ?? '0'));
  return Number.isFinite(hora) && hora < 12 ? 'desayuno' : 'almuerzo';
};

const diaCorto = (fecha: string) => {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  if (!anio || !mes || !dia) return fecha;
  return new Date(anio, mes - 1, dia).toLocaleDateString('es-BO', { weekday: 'short', day: 'numeric', month: 'short' });
};

/**
 * Mensaje con el que se le confirma una cita agendada al cliente. Devuelve null si no hay telefono utilizable.
 */
export const buildConfirmacionWhatsappHref = (reserva: ReservaBD): string | null => {
  const tratamiento = reserva.servicio_confirmado || reserva.servicio_solicitado || reserva.servicio || 'Tratamiento confirmado';
  const message = [
    '*Tu cita ha sido confirmada en Atrevida Fit* 🌸',
    '',
    `*Fecha:* ${diaCorto(reserva.fecha)} (${reserva.fecha})`,
    `*Horario:* ${reserva.hora_desde} - ${reserva.hora_hasta}`,
    `*Tratamiento:* ${tratamiento}`,
    `*Sucursal:* ${reserva.local}`,
    '',
    `Ven con el estómago lleno (${comidaPrevia(reserva.hora_desde)}) y 1 litro de agua.`,
    '',
    'Te esperamos.',
  ].join('\n');

  return buildClientWhatsappUrl(reserva.telefono_e164, reserva.numero_telefono, message);
};
