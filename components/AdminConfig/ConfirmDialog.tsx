'use client';

import modal from './FormModal.module.css';

interface ConfirmDialogProps {
  isOpen: boolean;
  title?: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Diálogo de confirmación reutilizable — reemplaza window.confirm/alert.
 * Reusa los estilos de FormModal para mantener consistencia visual.
 */
export function ConfirmDialog({
  isOpen,
  title = 'Confirmar acción',
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = false,
  loading = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className={modal.overlay} onClick={onClose}>
      <div className={modal.modal} onClick={(e) => e.stopPropagation()}>
        <div className={modal.header}>
          <h2 className={modal.title}>{title}</h2>
        </div>
        <div className={modal.body}>
          {/* `div` y no `p`: hay diálogos que pasan varios párrafos o listas. */}
          <div style={{ color: 'var(--admin-foreground)', fontSize: '0.9rem', lineHeight: 1.6 }}>{message}</div>
        </div>
        <div className={modal.footer}>
          {/* `type="button"` explícito: el diálogo puede vivir dentro de un
              <form> y el default `submit` lo re-enviaría al confirmar. */}
          <button type="button" className={modal.cancelButton} onClick={onClose} disabled={loading}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={modal.submitButton}
            onClick={onConfirm}
            disabled={loading}
            style={danger ? { background: 'var(--admin-accent-danger)' } : undefined}
          >
            {loading ? 'Procesando…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
