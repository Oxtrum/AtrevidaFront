'use client';

import { useEffect, useState } from 'react';
import { FormModal, FormSubmitError } from '@/components/AdminConfig';
import { toast } from '@/components/Shared/Toast';
import { actualizarMovimientoFinanciero } from '@/lib/api/finanzas';
import type { MovimientoFinanciero } from '@/types/finanzas';
import styles from './AnularEgresoFijoDialog.module.css';

interface AnularEgresoFijoDialogProps {
  isOpen: boolean;
  /** Egreso pagado generado por un gasto fijo (tiene gasto_fijo_id). */
  movimiento: MovimientoFinanciero | null;
  onClose: () => void;
  onDone: () => void;
}

/** Deshace el pago de un egreso de gasto fijo: vuelve a Pendiente. Dejar de pagar el gasto se hace desde Gastos Fijos. */
export function AnularEgresoFijoDialog({ isOpen, movimiento, onClose, onDone }: AnularEgresoFijoDialogProps) {
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) setError('');
  }, [isOpen]);

  if (!movimiento) return null;

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await actualizarMovimientoFinanciero(movimiento.id, { estado: 'PENDIENTE' });
      toast.success('Pago deshecho: el egreso vuelve a estar pendiente');
      onDone();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo deshacer el pago');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormModal isOpen={isOpen} onClose={onClose} title={`Deshacer pago ${movimiento.codigo}`} onSubmit={handleSubmit} loading={saving} submitLabel="Deshacer pago">
      <p className={styles.lead}>
        Este egreso viene de un gasto fijo{movimiento.descripcion ? ` (${movimiento.descripcion})` : ''}. Vuelve a Pendiente y lo puedes pagar de nuevo desde «Pagar o adelantar». Úsalo si te equivocaste o el pago no salió.
      </p>
      <FormSubmitError message={error} />
    </FormModal>
  );
}
