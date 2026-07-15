import type { ReservaBD } from '@/types/reserva';

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
  const phoneDigits = reserva.numero_telefono?.replace(/\D/g, '') ?? '';
  if (!phoneDigits) return null;

  const phone = phoneDigits.startsWith('591') ? phoneDigits : '591' + phoneDigits;
  const dayLabel = getDayLabel(reserva.fecha);
  const message = [
    'Hola, buenas tardes 🌸',
    `${dayLabel} la esperamos para su cita a las ${reserva.hora_desde}.`,
    `Sucursal: ${reserva.local}`,
  ].join('\n');

  return `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
};
