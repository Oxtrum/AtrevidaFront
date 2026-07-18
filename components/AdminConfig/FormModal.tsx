'use client';

import { X } from 'lucide-react';
import styles from './FormModal.module.css';

interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  onSubmit?: () => void;
  submitLabel?: string;
  loading?: boolean;
  size?: 'md' | 'lg' | 'xl';
  hideFooter?: boolean;
  children: React.ReactNode;
}

export function FormModal({
  isOpen,
  onClose,
  title,
  onSubmit,
  submitLabel = 'Guardar',
  loading = false,
  size = 'md',
  hideFooter = false,
  children,
}: FormModalProps) {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={`${styles.modal} ${size === 'lg' ? styles.modalLg : ''} ${size === 'xl' ? styles.modalXl : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <button className={styles.closeButton} onClick={onClose} aria-label="Cerrar">
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>
        <div className={styles.body}>{children}</div>
        {!hideFooter && (
          <div className={styles.footer}>
            <button className={styles.cancelButton} onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button className={styles.submitButton} onClick={onSubmit} disabled={loading}>
              {loading ? 'Guardando...' : submitLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
