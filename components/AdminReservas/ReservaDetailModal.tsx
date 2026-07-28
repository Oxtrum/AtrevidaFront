'use client';

import { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Pencil, Trash2, Clock, CalendarDays } from 'lucide-react';
import type { ReservaBD } from '@/types/reserva';
import { WhatsappIcon } from '@/components/icons/WhatsappIcon';
import { buildReminderWhatsappHref } from '@/lib/utils/whatsapp';
import styles from './ReservaDetailModal.module.css';

interface ReservaDetailModalProps {
  reserva: ReservaBD | null;
  onClose: () => void;
  onEdit: (reserva: ReservaBD) => void;
  onDelete: (reserva: ReservaBD) => void;
  deleting?: boolean;
}

const ESTADO_CLASS: Record<string, string> = {
  AGENDADO: styles.estadoAgendado,
  PENDIENTE: styles.estadoPendiente,
  COMPLETADO: styles.estadoCompletado,
  RECHAZADO: styles.estadoRechazado,
};

function formatTimestamp(ts?: string) {
  if (!ts) return null;
  try {
    const d = new Date(ts);
    return d.toLocaleString('es-BO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return ts;
  }
}

export function ReservaDetailModal({
  reserva,
  onClose,
  onEdit,
  onDelete,
  deleting = false,
}: ReservaDetailModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  if (!reserva) return null;

  const tipoRaw = (reserva.tipo || '').toLowerCase();
  const tipoLabel = tipoRaw === 'm' || tipoRaw === 'mesa' ? 'Mesa' : 'Bicicleta';
  const tipoClass = tipoRaw === 'm' || tipoRaw === 'mesa' ? styles.tipoMesa : styles.tipoBicicleta;
  const estado = reserva.estado || 'PENDIENTE';
  const estadoClass = ESTADO_CLASS[estado] || styles.estadoPendiente;
  const reminderHref = buildReminderWhatsappHref(reserva);

  const content = (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.titleGroup}>
            <h2 className={styles.title}>Detalle de Reserva</h2>
            <span className={styles.idBadge}>#{reserva.id}</span>
          </div>
          <button className={styles.closeButton} onClick={onClose} aria-label="Cerrar">
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.dataGrid}>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Cliente</span>
              <span className={styles.fieldValue}>{reserva.cliente || '—'}</span>
            </div>

            <div className={styles.field}>
              <span className={styles.fieldLabel}>Local</span>
              <span className={styles.fieldValue}>{reserva.local}</span>
            </div>

            <div className={styles.field}>
              <span className={styles.fieldLabel}>Tipo</span>
              <span className={styles.fieldValue}>
                <span className={`${styles.badge} ${tipoClass}`}>{tipoLabel}</span>
              </span>
            </div>

            <div className={styles.field}>
              <span className={styles.fieldLabel}>Estado</span>
              <span className={styles.fieldValue}>
                <span className={`${styles.badge} ${estadoClass}`}>{estado}</span>
              </span>
            </div>

            <div className={styles.field}>
              <span className={styles.fieldLabel}>Fecha</span>
              <span className={styles.fieldValue}>{reserva.fecha}</span>
            </div>

            <div className={styles.field}>
              <span className={styles.fieldLabel}>Horario</span>
              <span className={styles.fieldValue}>
                {reserva.hora_desde} – {reserva.hora_hasta}
              </span>
            </div>

            <div className={styles.field}>
              <span className={styles.fieldLabel}>Servicio</span>
              <span className={styles.fieldValue}>{reserva.servicio || <span className={styles.fieldEmpty}>Sin definir</span>}</span>
            </div>

            <div className={styles.field}>
              <span className={styles.fieldLabel}>Servicio Solicitado</span>
              <span className={styles.fieldValue}>
                {reserva.servicio_solicitado || <span className={styles.fieldEmpty}>—</span>}
              </span>
            </div>

            <div className={styles.field}>
              <span className={styles.fieldLabel}>Servicio Confirmado</span>
              <span className={styles.fieldValue}>
                {reserva.servicio_confirmado || <span className={styles.fieldEmpty}>Pendiente</span>}
              </span>
            </div>

            <div className={styles.field}>
              <span className={styles.fieldLabel}>Precio</span>
              <span className={styles.fieldValue}>
                {reserva.precio != null ? `Bs ${reserva.precio}` : <span className={styles.fieldEmpty}>—</span>}
              </span>
            </div>

            <div className={styles.field}>
              <span className={styles.fieldLabel}>Teléfono</span>
              <span className={styles.fieldValue}>
                {reserva.numero_telefono || <span className={styles.fieldEmpty}>—</span>}
              </span>
            </div>

            <div className={styles.field}>
              <span className={styles.fieldLabel}>Notificado</span>
              <span className={styles.fieldValue}>
                <span className={`${styles.badge} ${reserva.notificado ? styles.notificadoSi : styles.notificadoNo}`}>
                  {reserva.notificado ? 'Sí' : 'No'}
                </span>
              </span>
            </div>

            {reserva.notas && (
              <div className={`${styles.field} ${styles.fieldFull}`}>
                <span className={styles.fieldLabel}>Notas</span>
                <span className={styles.fieldValue}>{reserva.notas}</span>
              </div>
            )}

            {(reserva.creado_en || reserva.actualizado_en) && (
              <div className={styles.timestamps}>
                {reserva.creado_en && (
                  <span className={styles.timestamp}>
                    <CalendarDays size={11} />
                    <span className={styles.timestampLabel}>Creado:</span>
                    {formatTimestamp(reserva.creado_en)}
                  </span>
                )}
                {reserva.actualizado_en && (
                  <span className={styles.timestamp}>
                    <Clock size={11} />
                    <span className={styles.timestampLabel}>Actualizado:</span>
                    {formatTimestamp(reserva.actualizado_en)}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className={styles.footer}>
          {reminderHref ? (
            <a
              className={styles.reminderButton}
              href={reminderHref}
              target="_blank"
              rel="noopener noreferrer"
            >
              <WhatsappIcon size={15} />
              Enviar recordatorio
            </a>
          ) : (
            <button
              className={styles.reminderButton}
              type="button"
              disabled
              title="La reserva no tiene teléfono registrado"
            >
              <WhatsappIcon size={15} />
              Enviar recordatorio
            </button>
          )}
          <button
            className={styles.deleteButton}
            onClick={() => onDelete(reserva)}
            disabled={deleting}
          >
            <Trash2 size={14} strokeWidth={2} />
            {deleting ? 'Eliminando...' : 'Eliminar'}
          </button>
          {reserva.estado !== 'COMPLETADO' && (
            <button className={styles.editButton} onClick={() => onEdit(reserva)}>
              <Pencil size={14} strokeWidth={2} />
              Editar
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
