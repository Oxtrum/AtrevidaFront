'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardCheck, Pencil, Trash2, XCircle } from 'lucide-react';
import { ConfirmDialog, ReasonDialog, RowActionsMenu } from '@/components/AdminConfig';
import type { RowAction } from '@/components/AdminConfig';
import { WhatsappIcon } from '@/components/icons/WhatsappIcon';
import { toast } from '@/components/Shared/Toast';
import { actualizarEstadoReservaDB, eliminarReservaDB } from '@/lib/api/reservas';
import { AtencionFormModal } from '@/components/AdminAtenciones/AtencionFormModal';
import { CancelarReservaModal } from './CancelarReservaModal';
import { buildContactoWhatsappHref } from '@/lib/utils/whatsapp';
import type { ReservaBD } from '@/types/reserva';
import styles from './ReservaAcciones.module.css';


const formatDate = (fecha: string) => {
  const [year, month, day] = fecha.split('-').map(Number);
  if (!year || !month || !day) return fecha;
  return new Date(year, month - 1, day).toLocaleDateString('es-BO', { weekday: 'short', day: 'numeric', month: 'short' });
};

const normalizar = (value?: string | number | null) =>
  String(value ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const resumenServicios = (reserva: ReservaBD) => {
  const vistos = new Set<string>();
  const servicios = [reserva.servicio_confirmado, reserva.servicio_solicitado, reserva.servicio]
    .flatMap((valor) => (valor ?? '').split(/\s*(?:\n|,|;|\s\+\s)\s*/))
    .map((valor) => valor.trim())
    .filter((valor) => {
      if (!valor) return false;
      const clave = normalizar(valor);
      if (vistos.has(clave)) return false;
      vistos.add(clave);
      return true;
    });
  const lista = servicios.length > 0 ? servicios : ['Servicio por definir'];
  return { visible: lista.slice(0, 3), remaining: Math.max(lista.length - 3, 0) };
};

/** Datos de la reserva que se confirman al eliminarla. */
function ReservaResumen({ reserva }: { reserva: ReservaBD }) {
  const servicios = useMemo(() => resumenServicios(reserva), [reserva]);
  return (
    <div className={styles.resumen}>
      <dl className={styles.resumenGrid}>
        <div><dt>Cliente</dt><dd>{reserva.cliente || 'Cliente sin nombre'}</dd></div>
        <div><dt>Fecha</dt><dd>{formatDate(reserva.fecha)}</dd></div>
        <div><dt>Horario</dt><dd>{reserva.hora_desde} - {reserva.hora_hasta}</dd></div>
        <div><dt>Local</dt><dd>{reserva.local}</dd></div>
      </dl>
      <div className={styles.resumenServicios}>
        <span>Servicios</span>
        <ul>
          {servicios.visible.map((servicio) => <li key={servicio}>{servicio}</li>)}
          {servicios.remaining > 0 && <li>+{servicios.remaining}</li>}
        </ul>
      </div>
    </div>
  );
}

interface ReservaAccionesProps {
  reserva: ReservaBD;
  /** La reserva cambio (completada, rechazada o eliminada): quien la muestra debe recargar. */
  onCambio: () => void;
}

/**
 * Menú de acciones de una reserva: contactar, atender, editar, rechazar y eliminar.
 */
export function ReservaAcciones({ reserva, onCambio }: ReservaAccionesProps) {
  const router = useRouter();
  const [rechazando, setRechazando] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [atendiendo, setAtendiendo] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [ocupada, setOcupada] = useState(false);

  const estado = reserva.estado;
  const whatsappHref = buildContactoWhatsappHref(reserva);

  const acciones: RowAction[] = [
    ...(whatsappHref ? [{
      label: 'Contactar por WhatsApp',
      icon: <WhatsappIcon size={14} />,
      onClick: () => { window.open(whatsappHref, '_blank', 'noopener,noreferrer'); },
    }] : []),
    ...(estado === 'AGENDADO' ? [{
      label: 'Atender y cerrar reserva',
      icon: <ClipboardCheck size={14} strokeWidth={1.8} />,
      onClick: () => setAtendiendo(true),
    }] : []),
    ...(estado !== 'COMPLETADO' && estado !== 'CANCELADO' ? [{
      label: 'Editar o reprogramar',
      icon: <Pencil size={14} strokeWidth={1.8} />,
      onClick: () => router.push(`/atrevida-gestion/reservas/editar/${reserva.id}`),
    }] : []),
    ...(estado === 'PENDIENTE' ? [{
      label: 'Rechazar',
      icon: <XCircle size={14} strokeWidth={1.8} />,
      variant: 'danger' as const,
      onClick: () => setRechazando(true),
    }] : []),
    ...(estado === 'AGENDADO' ? [{
      label: 'Cancelar reserva',
      icon: <XCircle size={14} strokeWidth={1.8} />,
      variant: 'danger' as const,
      onClick: () => setCancelando(true),
    }] : []),
    {
      label: 'Eliminar reserva',
      icon: <Trash2 size={14} strokeWidth={1.8} />,
      variant: 'danger' as const,
      onClick: () => setEliminando(true),
    },
  ];

  const eliminar = async () => {
    setOcupada(true);
    try {
      await eliminarReservaDB(reserva.id);
      setEliminando(false);
      toast.success(`Reserva #${reserva.id} eliminada.`);
      onCambio();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo eliminar la reserva.');
    } finally {
      setOcupada(false);
    }
  };

  /** Rechaza con la causa del dialogo; si falla, el error vuelve al dialogo para que no se cierre. */
  const rechazar = async (causa: string) => {
    setOcupada(true);
    try {
      await actualizarEstadoReservaDB({ id: reserva.id, estado: 'RECHAZADO', causa });
      toast.success('Reserva rechazada correctamente.');
      onCambio();
    } finally {
      setOcupada(false);
    }
  };

  return (
    <>
      <RowActionsMenu ariaLabel={`Acciones de reserva ${reserva.id}`} disabled={ocupada} actions={acciones} />

      <ReasonDialog
        isOpen={rechazando}
        title="Rechazar reserva"
        message={`La causa queda registrada en la reserva de ${reserva.cliente || `#${reserva.id}`}.`}
        confirmLabel="Rechazar"
        onConfirm={rechazar}
        onClose={() => setRechazando(false)}
      />

      <CancelarReservaModal
        reserva={cancelando ? reserva : null}
        onClose={() => setCancelando(false)}
        onCancelled={onCambio}
      />

      <AtencionFormModal reserva={atendiendo ? reserva : null} onClose={() => setAtendiendo(false)} onSaved={onCambio} />

      <ConfirmDialog
        isOpen={eliminando}
        title="¿Seguro que quieres eliminar la reserva?"
        message={<ReservaResumen reserva={reserva} />}
        confirmLabel="Eliminar reserva"
        danger
        loading={ocupada}
        onConfirm={eliminar}
        onClose={() => { if (!ocupada) setEliminando(false); }}
      />
    </>
  );
}
