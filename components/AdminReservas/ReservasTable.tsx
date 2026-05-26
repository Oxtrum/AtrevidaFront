'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { AlertTriangle, ClipboardList, Pencil, Trash2 } from 'lucide-react';
import type { ReservaBD } from '@/types/reserva';
import styles from './ReservasTable.module.css';

interface ReservasTableProps {
  reservas: ReservaBD[];
  total: number;
  loading: boolean;
  error: string | null;
  title?: string;
  onDelete?: (reserva: ReservaBD) => void;
  deletingId?: number | string | null;
}

export function ReservasTable({
  reservas,
  total,
  loading,
  error,
  title = 'Reservas',
  onDelete,
  deletingId,
}: ReservasTableProps) {
  const tableRef = useRef<HTMLDivElement>(null);
  const rowsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && rowsRef.current && reservas.length > 0) {
      gsap.fromTo(
        rowsRef.current.children,
        { opacity: 0, y: 10 },
        {
          opacity: 1,
          y: 0,
          duration: 0.32,
          stagger: 0.035,
          ease: 'power2.out',
          clearProps: 'transform',
        }
      );
    }
  }, [loading, reservas]);

  /* ── Loading ── */
  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner} />
        <p>Cargando reservas…</p>
      </div>
    );
  }

  /* ── Error ── */
  if (error) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorIcon}>
          <AlertTriangle size={22} strokeWidth={1.5} />
        </div>
        <p className={styles.errorMessage}>{error}</p>
      </div>
    );
  }

  /* ── Empty ── */
  if (reservas.length === 0) {
    return (
      <div className={styles.emptyContainer}>
        <div className={styles.emptyIcon}>
          <ClipboardList size={22} strokeWidth={1.4} />
        </div>
        <p className={styles.emptyMessage}>
          No se encontraron reservas
        </p>
        <p className={styles.emptyHint}>Ajusta los filtros de búsqueda para ver resultados</p>
      </div>
    );
  }

  /* ── Helpers ── */
  const getTipoLabel = (tipo: string) => {
    const t = tipo?.toLowerCase();
    if (t === 'b' || t === 'bicicleta') return 'Bicicleta';
    if (t === 'm' || t === 'mesa') return 'Mesa';
    return tipo || '-';
  };

  const getTipoClass = (tipo: string) => {
    const t = tipo?.toLowerCase();
    if (t === 'b' || t === 'bicicleta') return styles.tipoBicicleta;
    if (t === 'm' || t === 'mesa') return styles.tipoMesa;
    return '';
  };

  const getEstadoClass = (estado?: string) => {
    if (estado === 'AGENDADO' || estado === 'COMPLETADO') return styles.estadoAprobado;
    if (estado === 'RECHAZADO') return styles.estadoRechazado;
    return styles.estadoPendiente;
  };

  const getServicioFinal = (reserva: ReservaBD) => {
    return reserva.servicio_confirmado || reserva.servicio || reserva.servicio_solicitado || 'Por definir';
  };

  /* ── Table ── */
  return (
    <div ref={tableRef} className={styles.tableContainer}>

      {/* Header */}
      <div className={styles.tableHeader}>
        <span className={styles.totalCount}>
          {title} &mdash; <strong>{total}</strong>
        </span>
      </div>

      <div className={styles.tableWrapper}>
        <div className={styles.table}>

          {/* Column headers */}
          <div className={styles.tableHead}>
            <div className={styles.cell}>Fecha</div>
            <div className={styles.cell}>Hora</div>
            <div className={styles.cell}>Cliente</div>
            <div className={styles.cell}>Tipo</div>
            <div className={styles.cell}>Servicio final</div>
            <div className={styles.cell}>Estado</div>
            <div className={styles.cell}>Local</div>
            <div className={styles.cell}>Acciones</div>
          </div>

          {/* Rows */}
          <div ref={rowsRef}>
            {reservas.map((reserva) => (
              <div key={reserva.id} className={styles.tableRow}>

                <div className={styles.cell} data-label="Fecha">
                  {reserva.fecha}
                </div>

                <div className={styles.cell} data-label="Hora">
                  {reserva.hora_desde} – {reserva.hora_hasta}
                </div>

                <div className={styles.cell} data-label="Cliente">
                  {reserva.cliente || '—'}
                </div>

                <div className={styles.cell} data-label="Tipo">
                  <span className={`${styles.tipoBadge} ${getTipoClass(reserva.tipo)}`}>
                    {getTipoLabel(reserva.tipo)}
                  </span>
                </div>

                <div className={styles.cell} data-label="Servicio final">
                  <span className={styles.servicioText}>
                    {getServicioFinal(reserva)}
                  </span>
                </div>

                <div className={styles.cell} data-label="Estado">
                  <span className={`${styles.estadoBadge} ${getEstadoClass(reserva.estado)}`}>
                    {reserva.estado || 'PENDIENTE'}
                  </span>
                </div>

                <div className={styles.cell} data-label="Local">
                  <span className={styles.localBadge}>{reserva.local}</span>
                </div>

                <div className={styles.cell} data-label="Acciones">
                  <div className={styles.actionGroup}>
                    <a
                      href={`/admin/reservas/editar/${reserva.id}`}
                      className={styles.editButton}
                      title="Editar reserva"
                      aria-label={`Editar reserva de ${reserva.cliente || reserva.id}`}
                    >
                      <Pencil size={13} strokeWidth={1.8} />
                    </a>
                    {onDelete && (
                      <button
                        type="button"
                        className={styles.deleteButton}
                        onClick={() => onDelete(reserva)}
                        disabled={deletingId === reserva.id}
                        title="Eliminar reserva"
                        aria-label={`Eliminar reserva de ${reserva.cliente || reserva.id}`}
                      >
                        <Trash2 size={13} strokeWidth={1.8} />
                      </button>
                    )}
                  </div>
                </div>

              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
