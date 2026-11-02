'use client';

import { useCallback, useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { AdminButton, AlertBanner, SectionLabel } from '@/components/AdminConfig';
import { toast } from '@/components/Shared/Toast';
import { actualizarReservaNotificadoDB, getReservasDB } from '@/lib/api/reservas';
import { buildConfirmacionWhatsappHref, buildReminderWhatsappHref } from '@/lib/utils/whatsapp';
import type { ReservaBD } from '@/types/reserva';
import { AprobacionReservasTable } from './AprobacionReservasTable';

const diaISO = (desplazamiento: number) => {
  const d = new Date();
  d.setDate(d.getDate() + desplazamiento);
  return d.toLocaleDateString('en-CA');
};

const horaActual = () => {
  const ahora = new Date();
  return `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;
};

interface HoyYMananaProps {
  /** Sucursal a mostrar; vacio = todas. */
  local?: string;
}

/**
 * Las citas agendadas de hoy y de mañana, en orden, para avisarle a cada cliente: Confirmar si todavia no se le
 * envio la confirmacion, Recordar si ya se le envio. Las que ya pasaron hoy no aparecen.
 */
export function HoyYManana({ local }: HoyYMananaProps) {
  const [reservas, setReservas] = useState<ReservaBD[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const hoy = diaISO(0);
      const res = await getReservasDB({
        fecha_desde: hoy,
        fecha_hasta: diaISO(1),
        local: local || undefined,
        estado: 'AGENDADO',
        vigente_fecha: hoy,
        vigente_hora: horaActual(),
        orden: 'cronologico',
        limit: 100,
      }, signal);
      if (signal?.aborted) return;
      setReservas(res.data?.reservas ?? []);
    } catch (err) {
      if (signal?.aborted) return;
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las citas.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [local]);

  useEffect(() => {
    const control = new AbortController();
    void cargar(control.signal);
    return () => control.abort();
  }, [cargar]);

  const marcarNotificada = (id: number) => {
    setReservas((actuales) => actuales.map((r) => (r.id === id ? { ...r, notificado: true } : r)));
    actualizarReservaNotificadoDB({ id, notificado: true }).catch((err) => {
      setReservas((actuales) => actuales.map((r) => (r.id === id ? { ...r, notificado: false } : r)));
      toast.error(err instanceof Error ? err.message : 'No se pudo marcar la reserva como notificada.');
    });
  };

  const acciones = (reserva: ReservaBD) => {
    const confirmada = Boolean(reserva.notificado);
    const href = confirmada ? buildReminderWhatsappHref(reserva) : buildConfirmacionWhatsappHref(reserva);
    return (
      <AdminButton
        size="xs"
        variant={confirmada ? 'secondary' : 'primary'}
        icon={<MessageCircle size={13} strokeWidth={2} />}
        href={href ?? undefined}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => { if (!confirmada) marcarNotificada(reserva.id); }}
        disabled={!href}
      >
        {!href ? 'Sin teléfono' : confirmada ? 'Recordar' : 'Confirmar'}
      </AdminButton>
    );
  };

  // Sin tarjeta propia: la tabla ya trae la suya y dos tarjetas anidadas se ven como una caja dentro de otra.
  return (
    <section className="admin-stack">
      <SectionLabel>Hoy y mañana{loading || error ? '' : ` · ${reservas.length} ${reservas.length === 1 ? 'cita' : 'citas'}`}</SectionLabel>
      {error ? (
        <AlertBanner tone="danger">{error}</AlertBanner>
      ) : loading ? (
        <AlertBanner tone="info">Cargando citas…</AlertBanner>
      ) : reservas.length === 0 ? (
        <AlertBanner tone="info">No hay citas agendadas para hoy ni mañana.</AlertBanner>
      ) : (
        <AprobacionReservasTable
          reservas={reservas}
          showLocal={!local}
          renderActions={acciones}
          onVinculado={() => void cargar()}
        />
      )}
    </section>
  );
}
