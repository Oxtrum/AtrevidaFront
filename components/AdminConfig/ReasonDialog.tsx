'use client';

import { useEffect, useState } from 'react';
import { FormField, FormSubmitError } from './FormField';
import { FormModal } from './FormModal';

interface ReasonDialogProps {
  isOpen: boolean;
  title: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  /** Si lanza, el mensaje se muestra en el diálogo y no se cierra. */
  onConfirm: (reason: string) => Promise<void>;
  onClose: () => void;
}

/** Diálogo que exige un motivo (anular compra, anular egreso…). */
export function ReasonDialog({ isOpen, title, message, confirmLabel = 'Confirmar', onConfirm, onClose }: ReasonDialogProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setReason('');
    setError('');
  }, [isOpen]);

  const submit = async () => {
    if (!reason.trim()) {
      setError('El motivo es obligatorio');
      return;
    }
    setBusy(true);
    try {
      await onConfirm(reason.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo completar la acción');
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormModal isOpen={isOpen} onClose={onClose} title={title} onSubmit={submit} loading={busy} submitLabel={confirmLabel}>
      {message && <div style={{ marginBottom: '1rem', color: 'var(--admin-foreground)', fontSize: '0.9rem', lineHeight: 1.6 }}>{message}</div>}
      <FormField label="Motivo" htmlFor="reason-input" required error={error && !reason.trim() ? error : undefined}>
        <textarea id="reason-input" value={reason} onChange={(e) => { setReason(e.target.value); setError(''); }} autoFocus />
      </FormField>
      {reason.trim() && <FormSubmitError message={error} />}
    </FormModal>
  );
}
