'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Banknote, CheckCircle2, Pencil, Trash2, XCircle } from 'lucide-react';
import { ConfirmDialog, FormField, FormModal, ReasonDialog, RowActionsMenu } from '@/components/AdminConfig';
import type { RowAction } from '@/components/AdminConfig';
import { WhatsappIcon } from '@/components/icons/WhatsappIcon';
import { toast } from '@/components/Shared/Toast';
import { actualizarEstadoReservaDB, eliminarReservaDB } from '@/lib/api/reservas';
import { buildClientWhatsappUrl } from '@/lib/utils/whatsapp';
import type { ReservaBD } from '@/types/reserva';
import styles from './ReservaAcciones.module.css';

const MOTIVO_COMPLETADA = 'Ya se brindo el servicio';

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

/** Datos de la reserva que se confirman en los dialogos de completar y eliminar. */
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
  /** Agrega Cobrar al menu (cuando la pantalla no lo muestra como boton aparte). */
  conCobrar?: boolean;
}

/**
 * Menu de tres puntos de una reserva con las acciones de siempre: contactar, completar, editar, rechazar,
 * eliminar y (si se pide) cobrar. Trae sus propios dialogos; es el mismo en la Lista, el Dashboard y la ficha del
 * cliente. Aprobar y Confirmar son botones que cada pantalla pone al lado.
 */
export function ReservaAcciones({ reserva, onCambio, conCobrar = false }: ReservaAccionesProps) {
  const router = useRouter();
  const [rechazando, setRechazando] = useState(false);
  const [completando, setCompletando] = useState(false);
  const [otroMotivo, setOtroMotivo] = useState(false);
  const [detalle, setDetalle] = useState('');
  const [errorDetalle, setErrorDetalle] = useState<string | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [sugerirCobro, setSugerirCobro] = useState(false);
  const [ocupada, setOcupada] = useState(false);

  const estado = reserva.estado;
  const completada = estado === 'COMPLETADO';
  const porCobrar = completada && reserva.estado_cobro === 'POR_COBRAR';
  const whatsappHref = buildClientWhatsappUrl(reserva.telefono_e164, reserva.numero_telefono, 'Hola 🌸 Recibimos tu reserva. ¿Qué tratamiento deseas realizar?');

  const acciones: RowAction[] = [
    ...(conCobrar && porCobrar ? [{
      label: 'Cobrar',
      icon: <Banknote size={14} strokeWidth={1.8} />,
      onClick: () => router.push(`/atrevida-gestion/caja?reserva=${reserva.id}`),
    }] : []),
    ...(whatsappHref ? [{
      label: 'Contactar por WhatsApp',
      icon: <WhatsappIcon size={14} />,
      onClick: () => { window.open(whatsappHref, '_blank', 'noopener,noreferrer'); },
    }] : []),
    // Completar exige haber confirmado la cita con el cliente.
    ...(estado === 'AGENDADO' && reserva.notificado ? [{
      label: 'Marcar como completada',
      icon: <CheckCircle2 size={14} strokeWidth={1.8} />,
      onClick: () => { setOtroMotivo(false); setDetalle(''); setErrorDetalle(null); setCompletando(true); },
    }] : []),
    ...(!completada ? [{
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
    {
      label: 'Eliminar reserva',
      icon: <Trash2 size={14} strokeWidth={1.8} />,
      variant: 'danger' as const,
      onClick: () => setEliminando(true),
    },
  ];

  const completar = async () => {
    const causa = otroMotivo ? detalle.trim() : MOTIVO_COMPLETADA;
    if (!causa) {
      setErrorDetalle('Ingresa el motivo para completar la reserva.');
      return;
    }
    setOcupada(true);
    try {
      await actualizarEstadoReservaDB({ id: reserva.id, estado: 'COMPLETADO', causa });
      setCompletando(false);
      // Si la cubre un paquete no hay nada que cobrar y el cajero debe saber por que no se le ofrece el cobro; si no,
      // se sugiere cobrarla (sin obligar).
      if (reserva.plan_id) {
        toast.info(`Reserva #${reserva.id} completada. La cubre un paquete: no hay nada que cobrar.`);
      } else {
        toast.success(`Reserva #${reserva.id} marcada como completada.`);
        setSugerirCobro(true);
      }
      onCambio();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo completar la reserva.');
    } finally {
      setOcupada(false);
    }
  };

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

      {completando && (
        <FormModal
          isOpen
          title="¿Esta reserva ya cumplió su propósito?"
          onClose={() => { if (!ocupada) setCompletando(false); }}
          onSubmit={completar}
          loading={ocupada}
          submitLabel="Marcar como completada"
        >
          <ReservaResumen reserva={reserva} />

          <fieldset className={styles.reasonGroup}>
            <legend>Causa del cierre</legend>
            {([[false, MOTIVO_COMPLETADA], [true, 'Otro']] as const).map(([otro, label]) => (
              <label key={label} className={`${styles.reasonOption} ${otroMotivo === otro ? styles.reasonOptionActive : ''}`}>
                <input
                  type="radio"
                  name={`motivo-${reserva.id}`}
                  checked={otroMotivo === otro}
                  onChange={() => { setOtroMotivo(otro); setErrorDetalle(null); }}
                />
                <span>{label}</span>
              </label>
            ))}
          </fieldset>

          {otroMotivo && (
            <FormField label="Detalle" htmlFor={`detalle-${reserva.id}`} required error={errorDetalle ?? undefined}>
              <textarea
                id={`detalle-${reserva.id}`}
                value={detalle}
                onChange={(e) => { setDetalle(e.target.value); if (errorDetalle) setErrorDetalle(null); }}
                placeholder="Describe el motivo de cierre..."
                autoFocus
              />
            </FormField>
          )}
        </FormModal>
      )}

      <ConfirmDialog
        isOpen={sugerirCobro}
        title="Reserva completada: ¿cobrarla ahora?"
        message={
          <>
            <p style={{ margin: '0 0 0.6rem' }}>
              La reserva #{reserva.id} de <strong>{reserva.cliente || 'cliente sin nombre'}</strong> ya se brindó pero todavía no tiene cobro registrado.
            </p>
            <p style={{ margin: 0 }}>Si lo dejas para después, aparecerá en Por cobrar para que no se olvide.</p>
          </>
        }
        confirmLabel="Cobrar ahora"
        cancelLabel="Después"
        onConfirm={() => {
          setSugerirCobro(false);
          router.push(`/atrevida-gestion/caja?reserva=${reserva.id}`);
        }}
        onClose={() => setSugerirCobro(false)}
      />

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
