import type { ReservaBD } from '@/types/reserva';
import { resolvePhoneE164 } from './phone';

/** Número comercial en E.164: no se le antepone ningún prefijo. */
export const ATREVIDA_WHATSAPP_E164 = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '+59177411855';

export function buildWhatsappUrl(e164: string | null | undefined, message?: string): string | null {
  const digits = e164?.replace(/\D/g, '') ?? '';
  if (!digits) return null;
  return `https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
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

/**
 * Construye el deep-link de WhatsApp para recordar una cita al cliente.
 * Calcula el día relativo (Hoy / Mañana / la fecha) desde `reserva.fecha`.
 * Devuelve null si la reserva no tiene teléfono.
 */
export const buildReminderWhatsappHref = (reserva: ReservaBD): string | null => {
  const dayLabel = getDayLabel(reserva.fecha);
  const message = [
    'Hola, buenas tardes 🌸',
    `${dayLabel} la esperamos para su cita a las ${reserva.hora_desde}.`,
    `Sucursal: ${reserva.local}`,
  ].join('\n');

  return buildClientWhatsappUrl(reserva.telefono_e164, reserva.numero_telefono, message);
};
