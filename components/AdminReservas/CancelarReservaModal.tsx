'use client';

import { useEffect, useState } from 'react';
import { FormField, FormModal } from '@/components/AdminConfig';
import { toast } from '@/components/Shared/Toast';
import { actualizarEstadoReservaDB } from '@/lib/api/reservas';
import type { ReservaBD } from '@/types/reserva';
import styles from './CancelarReservaModal.module.css';

type MotivoCancelacion = 'INASISTENCIA' | 'REPROGRAMACION' | 'SOLICITUD_CLIENTE' | 'OPERATIVO_LOCAL' | 'OTRO';

interface CancelarReservaModalProps {
  reserva: ReservaBD | null;
  onClose: () => void;
  onCancelled: () => void;
}

export function CancelarReservaModal({ reserva, onClose, onCancelled }: CancelarReservaModalProps) {
  const [motivo, setMotivo] = useState<MotivoCancelacion>('INASISTENCIA');
  const [detalle, setDetalle] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!reserva) return;
    setMotivo('INASISTENCIA');
    setDetalle('');
    setError('');
  }, [reserva]);

  const cancelar = async () => {
    if (!reserva) return;
    if (motivo === 'OTRO' && !detalle.trim()) {
      setError('Describe el motivo de la cancelación.');
      return;
    }
    setLoading(true);
    try {
      await actualizarEstadoReservaDB({
        id: reserva.id,
        estado: 'CANCELADO',
        motivo_cancelacion_tipo: motivo,
        motivo_cancelacion_detalle: detalle.trim() || undefined,
      });
      toast.success('Reserva cancelada correctamente.');
      onClose();
      onCancelled();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo cancelar la reserva.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormModal
      isOpen={!!reserva}
      onClose={() => { if (!loading) onClose(); }}
      title="Cancelar reserva"
      onSubmit={() => void cancelar()}
      loading={loading}
      submitLabel="Cancelar reserva"
    >
      <p className={styles.message}>La cancelación libera el horario y, si corresponde, revierte el stock o sesión comprometida.</p>
      <FormField label="Motivo" htmlFor="motivo-cancelacion" required>
        <select id="motivo-cancelacion" value={motivo} onChange={(event) => { setMotivo(event.target.value as MotivoCancelacion); setError(''); }}>
          <option value="INASISTENCIA">Inasistencia</option>
          <option value="REPROGRAMACION">Reprogramación</option>
          <option value="SOLICITUD_CLIENTE">Solicitud del cliente</option>
          <option value="OPERATIVO_LOCAL">Operativo del local</option>
          <option value="OTRO">Otro</option>
        </select>
      </FormField>
      <FormField label={motivo === 'OTRO' ? 'Detalle' : 'Detalle (opcional)'} htmlFor="detalle-cancelacion" required={motivo === 'OTRO'} error={error}>
        <textarea id="detalle-cancelacion" value={detalle} onChange={(event) => { setDetalle(event.target.value); setError(''); }} />
      </FormField>
    </FormModal>
  );
}
