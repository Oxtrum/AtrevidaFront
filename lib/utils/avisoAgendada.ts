import { actualizarReservaNotificadoDB } from '@/lib/api/reservas';
import { toast } from '@/components/Shared/Toast';
import type { ReservaBD } from '@/types/reserva';
import { buildConfirmacionWhatsappHref } from './whatsapp';

/**
 * Despues de agendar una reserva: un aviso con el boton para confirmarle la cita al cliente por WhatsApp. Al
 * pulsarlo la reserva queda marcada como notificada. Sin telefono solo se informa.
 */
export function avisarReservaAgendada(reserva: ReservaBD): void {
  const href = buildConfirmacionWhatsappHref(reserva);
  if (!href) {
    toast.success(`Reserva #${reserva.id} agendada. No tiene teléfono para avisarle.`);
    return;
  }
  toast.successWithAction('Envía la confirmación por WhatsApp al cliente.', {
    title: `Reserva #${reserva.id} agendada`,
    action: {
      label: 'Enviar WhatsApp',
      href,
      onClick: () => {
        actualizarReservaNotificadoDB({ id: reserva.id, notificado: true }).catch((err) => {
          toast.error(err instanceof Error ? err.message : 'No se pudo marcar la reserva como notificada.');
        });
      },
    },
  });
}
