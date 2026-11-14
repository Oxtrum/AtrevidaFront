'use client';

import { ModalPortal } from '@/components/AdminConfig/ModalPortal';
import { WhatsappIcon } from '@/components/icons/WhatsappIcon';
import modal from '@/components/AdminConfig/FormModal.module.css';
import detail from './ReservaDetailModal.module.css';
import styles from './ReservaDuplicadaDialog.module.css';
import type { ReservaDuplicada } from '@/lib/api/reservas';
import { buildDuplicadaWhatsappHref } from '@/lib/utils/whatsapp';

const ESTADO: Record<string, { label: string; className: string }> = {
  PENDIENTE: { label: 'Pendiente', className: detail.estadoPendiente },
  AGENDADO: { label: 'Agendado', className: detail.estadoAgendado },
  COMPLETADO: { label: 'Completado', className: detail.estadoCompletado },
};

interface ReservaDuplicadaDialogProps {
  /** Reservas que el cliente ya tiene ese día; vacío o null cierra el diálogo. */
  reservas: ReservaDuplicada[] | null;
  cliente: string;
  telefonoE164?: string | null;
  numeroTelefono?: string | null;
  /** Día en cuestión (YYYY-MM-DD), para el texto del mensaje de WhatsApp. */
  fecha?: string;
  /** Texto del botón de confirmar: cambia entre crear y mover una reserva. */
  confirmLabel: string;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Aviso previo a crear o mover una reserva cuando el cliente ya tiene otra el mismo día
 * (en cualquier sucursal). Deja confirmar o escribirle por WhatsApp para aclararlo.
 */
export function ReservaDuplicadaDialog({
  reservas, cliente, telefonoE164, numeroTelefono, fecha, confirmLabel, loading, onConfirm, onClose,
}: ReservaDuplicadaDialogProps) {
  const lista = reservas ?? [];
  if (lista.length === 0) return null;

  const whatsappHref = buildDuplicadaWhatsappHref({ telefonoE164, numeroTelefono, fecha, reservas: lista });
  const cantidad = lista.length === 1 ? 'una reserva' : `${lista.length} reservas`;

  return (
    <ModalPortal>
    <div className={modal.overlay} onClick={onClose}>
      <div
        className={modal.modal}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="reserva-duplicada-titulo"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={modal.header}>
          <h2 id="reserva-duplicada-titulo" className={modal.title}>¿Seguro?</h2>
        </div>

        <div className={modal.body}>
          <p className={styles.lead}>
            <strong>{cliente || 'Este cliente'}</strong> ya tiene {cantidad} ese día.
          </p>
          <ul className={styles.list}>
            {lista.map((r) => {
              const estado = ESTADO[r.estado];
              return (
                <li key={r.id} className={styles.item}>
                  <span className={styles.time}>
                    <span className={styles.timeStart}>{r.hora_desde}</span>
                    <span className={styles.timeEnd}>a {r.hora_hasta}</span>
                  </span>
                  <span className={styles.detail}>
                    {r.servicio && <span className={styles.service}>{r.servicio}</span>}
                    <span className={styles.local}>{r.local}</span>
                  </span>
                  <span className={`${detail.badge} ${estado?.className ?? detail.estadoPendiente}`}>
                    {estado?.label ?? r.estado}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className={`${modal.footer} ${styles.footer}`}>
          {whatsappHref ? (
            <a className={detail.reminderButton} href={whatsappHref} target="_blank" rel="noopener noreferrer">
              <WhatsappIcon size={15} />
              WhatsApp
            </a>
          ) : (
            <button className={detail.reminderButton} type="button" disabled title="El cliente no tiene un teléfono válido">
              <WhatsappIcon size={15} />
              WhatsApp
            </button>
          )}
          <button type="button" className={modal.cancelButton} onClick={onClose} disabled={loading} autoFocus>
            Cancelar
          </button>
          <button type="button" className={modal.submitButton} onClick={onConfirm} disabled={loading}>
            {loading ? 'Procesando…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}
