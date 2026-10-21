'use client';

import { useEffect, useState } from 'react';
import { FormField, FormModal, FormSubmitError } from '@/components/AdminConfig';
import { toast } from '@/components/Shared/Toast';
import {
  actualizarMovimientoFinanciero,
  cambiarEstadoMovimientoFinanciero,
  desactivarGastoFijo,
} from '@/lib/api/finanzas';
import type { MovimientoFinanciero } from '@/types/finanzas';
import styles from './AnularEgresoFijoDialog.module.css';

type Opcion = 'deshacer' | 'dejar';

interface AnularEgresoFijoDialogProps {
  isOpen: boolean;
  /** Egreso generado por un gasto fijo (tiene gasto_fijo_id). */
  movimiento: MovimientoFinanciero | null;
  onClose: () => void;
  onDone: () => void;
}

const OPCIONES: { value: Opcion; titulo: string; detalle: string; soloPagado?: boolean }[] = [
  {
    value: 'deshacer',
    titulo: 'Deshacer el pago',
    detalle: 'Vuelve a Pendiente y lo puedes pagar de nuevo desde "Pagar o adelantar". Úsalo si te equivocaste o el pago no salió.',
    soloPagado: true,
  },
  {
    value: 'dejar',
    titulo: 'Dejar de pagarlo',
    detalle: 'Anula este mes y desactiva el gasto fijo: no se generan más cobros ni quedan pendientes. Lo ya pagado se conserva y puedes reactivarlo después.',
  },
];

/** Anular el egreso de un gasto fijo: o se deshace el pago, o se deja de pagar el gasto (no se salta un mes suelto). */
export function AnularEgresoFijoDialog({ isOpen, movimiento, onClose, onDone }: AnularEgresoFijoDialogProps) {
  const [opcion, setOpcion] = useState<Opcion>('dejar');
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const pagado = movimiento?.estado === 'PAGADO';
  const opciones = OPCIONES.filter((o) => !o.soloPagado || pagado);

  useEffect(() => {
    if (!isOpen) return;
    setOpcion(pagado ? 'deshacer' : 'dejar');
    setMotivo('');
    setError('');
  }, [isOpen, pagado]);

  if (!movimiento) return null;

  const handleSubmit = async () => {
    if (opcion !== 'deshacer' && !motivo.trim()) {
      setError('El motivo es obligatorio');
      return;
    }
    setSaving(true);
    try {
      if (opcion === 'deshacer') {
        await actualizarMovimientoFinanciero(movimiento.id, { estado: 'PENDIENTE' });
        toast.success('Pago deshecho: el egreso vuelve a estar pendiente');
      } else {
        await cambiarEstadoMovimientoFinanciero(movimiento.id, 'ANULADO', motivo.trim());
        if (movimiento.gasto_fijo_id) await desactivarGastoFijo(movimiento.gasto_fijo_id);
        toast.success('Egreso anulado y gasto fijo desactivado');
      }
      onDone();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo completar la acción');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Anular ${movimiento.codigo}`}
      onSubmit={handleSubmit}
      loading={saving}
      submitLabel={opcion === 'deshacer' ? 'Deshacer pago' : 'Anular y desactivar'}
    >
      <p className={styles.lead}>
        Este egreso viene de un gasto fijo{movimiento.descripcion ? ` (${movimiento.descripcion})` : ''}. ¿Qué quieres hacer?
      </p>
      <div className={styles.options} role="radiogroup" aria-label="Qué hacer con el egreso fijo">
        {opciones.map((o) => (
          <label key={o.value} className={`${styles.option} ${opcion === o.value ? styles.selected : ''}`}>
            <input type="radio" name="anular-fijo" value={o.value} checked={opcion === o.value} onChange={() => { setOpcion(o.value); setError(''); }} />
            <span>
              <strong>{o.titulo}</strong>
              <small>{o.detalle}</small>
            </span>
          </label>
        ))}
      </div>
      {opcion !== 'deshacer' && (
        <FormField label="Motivo" htmlFor="anf-motivo" required>
          <input id="anf-motivo" type="text" value={motivo} onChange={(e) => { setMotivo(e.target.value); setError(''); }} placeholder="Ej: cancelé la suscripción" />
        </FormField>
      )}
      <FormSubmitError message={error} />
    </FormModal>
  );
}
