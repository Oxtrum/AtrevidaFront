'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, CalendarClock, CreditCard, LoaderCircle, MapPin, ReceiptText, UserRound, X } from 'lucide-react';
import { getPagoByID, type PagoCompleto } from '@/lib/api/pagos';
import { formatDateTime } from '@/lib/utils/formatDateTime';
import styles from './PagoDetalleModal.module.css';

interface PagoDetalleModalProps {
  codigoPago: string;
  onClose: () => void;
}

const formatMoney = (value: number | string | null | undefined) => `Bs. ${Number(value ?? 0).toLocaleString('es-BO', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`;

export function PagoDetalleCodeButton({ codigoPago, onOpen }: { codigoPago: string; onOpen: (codigo: string) => void }) {
  return (
    <button type="button" className={styles.codeButton} onClick={() => onOpen(codigoPago)}>
      {codigoPago}
    </button>
  );
}

export function PagoDetalleModal({ codigoPago, onClose }: PagoDetalleModalProps) {
  const [pago, setPago] = useState<PagoCompleto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void getPagoByID(codigoPago)
      .then((response) => {
        if (active) setPago(response.data?.pago ?? null);
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError instanceof Error ? requestError.message : 'No se pudo cargar el detalle del pago');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [codigoPago]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [codigoPago, onClose]);

  const estado = pago?.estado === 'PAGADO' ? 'PAGADO' : pago?.estado ?? '—';

  return (
    <div
      className={styles.overlay}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="pago-detalle-titulo">
        <header className={styles.header}>
          <div>
            <span className={styles.kicker}>Comprobante de cobro</span>
            <h2 id="pago-detalle-titulo">Detalle del pago</h2>
            <span className={styles.code}>{codigoPago}</span>
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Cerrar detalle del pago">
            <X size={18} strokeWidth={2} />
          </button>
        </header>

        {loading && (
          <div className={styles.feedback}>
            <LoaderCircle size={24} className={styles.spinner} />
            <span>Cargando detalle del pago...</span>
          </div>
        )}

        {!loading && error && (
          <div className={`${styles.feedback} ${styles.feedbackError}`}>
            <AlertCircle size={24} />
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && pago && (
          <div className={styles.content}>
            <div className={styles.statusRow}>
              <span className={pago.estado === 'PAGADO' ? 'admin-status-active' : 'admin-status-pending'}>{estado}</span>
              <span>{formatDateTime(pago.fecha_creacion)}</span>
            </div>

            <section className={styles.summaryGrid} aria-label="Resumen del pago">
              <div>
                <UserRound size={15} strokeWidth={1.8} />
                <span>Cliente</span>
                <strong>{pago.cliente_nombre || 'Sin nombre registrado'}</strong>
                <small>{pago.cliente_nit ? `NIT / CI: ${pago.cliente_nit}` : 'Sin NIT / CI'}</small>
              </div>
              <div>
                <MapPin size={15} strokeWidth={1.8} />
                <span>Local</span>
                <strong>{pago.local_nombre}</strong>
                <small>Registro de caja</small>
              </div>
              <div>
                <CreditCard size={15} strokeWidth={1.8} />
                <span>Método de pago</span>
                <strong>{(pago.tipo_pago || 'No definido').toUpperCase()}</strong>
                <small>Pago registrado</small>
              </div>
              <div>
                <CalendarClock size={15} strokeWidth={1.8} />
                <span>Fecha y hora</span>
                <strong>{formatDateTime(pago.fecha_creacion)}</strong>
                <small>Última actualización: {formatDateTime(pago.fecha_modificacion)}</small>
              </div>
            </section>

            <section className={styles.detailSection}>
              <div className={styles.sectionTitle}>
                <ReceiptText size={17} strokeWidth={1.8} />
                <div>
                  <h3>Servicios y productos cobrados</h3>
                  <p>{pago.detalle.length} {pago.detalle.length === 1 ? 'elemento registrado' : 'elementos registrados'}</p>
                </div>
              </div>

              <div className={styles.detailHeader}>
                <span>Servicio / Producto</span>
                <span>Precio unitario</span>
                <span>Cant.</span>
                <span>Subtotal</span>
              </div>
              <div className={styles.detailList}>
                {pago.detalle.map((item, index) => (
                  <div key={`${item.servicio}-${index}`} className={styles.detailItem}>
                    <strong>{item.servicio}</strong>
                    <span>{formatMoney(item.precio_unitario)}</span>
                    <span>{item.cantidad}</span>
                    <b>{formatMoney(item.subtotal)}</b>
                  </div>
                ))}
              </div>
            </section>

            <section className={styles.totals} aria-label="Totales del pago">
              <div><span>Subtotal</span><strong>{formatMoney(pago.subtotal)}</strong></div>
              <div><span>Descuento</span><strong>{formatMoney(pago.descuento)}</strong></div>
              <div className={styles.totalFinal}><span>Total cobrado</span><strong>{formatMoney(pago.total_final)}</strong></div>
            </section>
          </div>
        )}
      </section>
    </div>
  );
}
