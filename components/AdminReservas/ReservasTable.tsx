'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { AlertTriangle, ClipboardList } from 'lucide-react';
import type { ReservaBD } from '@/types/reserva';
import styles from './ReservasTable.module.css';

interface ReservasTableProps {
  reservas: ReservaBD[];
  total: number;
  loading: boolean;
  error: string | null;
}

export function ReservasTable({
  reservas,
  total,
  loading,
  error,
}: ReservasTableProps) {
  const tableRef = useRef<HTMLDivElement>(null);
  const rowsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && rowsRef.current && reservas.length > 0) {
      gsap.fromTo(
        rowsRef.current.children,
        { opacity: 0, y: 12 },
        {
          opacity: 1,
          y: 0,
          duration: 0.35,
          stagger: 0.04,
          ease: 'power2.out',
          clearProps: 'transform',
        }
      );
    }
  }, [loading, reservas]);

  /* ── Loading ─────────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner} />
        <p>Cargando reservas…</p>
      </div>
    );
  }

  /* ── Error ───────────────────────────────────────────────────────────── */
  if (error) {
    return (
      <div className={styles.errorContainer}>
        <AlertTriangle size={32} strokeWidth={1.5} className={styles.errorIcon} />
        <p className={styles.errorMessage}>{error}</p>
      </div>
    );
  }

  /* ── Empty ───────────────────────────────────────────────────────────── */
  if (reservas.length === 0) {
    return (
      <div className={styles.emptyContainer}>
        <ClipboardList size={40} strokeWidth={1.4} className={styles.emptyIcon} />
        <p className={styles.emptyMessage}>
          No se encontraron reservas para los filtros seleccionados
        </p>
        <p className={styles.emptyHint}>Prueba ajustando los filtros de búsqueda</p>
      </div>
    );
  }

  /* ── Helpers ─────────────────────────────────────────────────────────── */
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

  /* ── Table ───────────────────────────────────────────────────────────── */
  return (
    <div ref={tableRef} className={styles.tableContainer}>
      {/* Header — record count */}
      <div className={styles.tableHeader}>
        <span className={styles.totalCount}>
          Reservas &mdash; <strong>{total}</strong>
        </span>
      </div>

      <div className={styles.tableWrapper}>
        <div className={styles.table}>
          {/* Column labels */}
          <div className={styles.tableHead}>
            <div className={styles.cell}>Fecha</div>
            <div className={styles.cell}>Hora</div>
            <div className={styles.cell}>Cliente</div>
            <div className={styles.cell}>Tipo</div>
            <div className={styles.cell}>Servicio</div>
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

                <div className={styles.cell} data-label="Servicio">
                  <span className={styles.servicioText}>
                    {reserva.servicio || '—'}
                  </span>
                </div>

                <div className={styles.cell} data-label="Local">
                  <span className={styles.localBadge}>{reserva.local}</span>
                </div>

                <div className={styles.cell} data-label="Acciones">
                  <a
                    href={`/admin/reservas/editar/${reserva.id}`}
                    className={styles.editButton}
                    title="Editar reserva"
                  >
                    Editar
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
