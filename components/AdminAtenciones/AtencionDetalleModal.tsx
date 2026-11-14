'use client';

import { FormModal } from '@/components/AdminConfig';
import { StatusBadge } from '@/components/AdminConfig';
import { CalendarDays, ClipboardCheck, Package } from 'lucide-react';
import type { Atencion } from '@/lib/api/atenciones';
import type { ReservaBD } from '@/types/reserva';
import styles from './AtencionDetalleModal.module.css';

interface AtencionDetalleModalProps {
  reserva: ReservaBD | null;
  atencion: Atencion | null;
  onClose: () => void;
}

function Dato({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className={styles.detailField}><span>{label}</span><strong>{children || '—'}</strong></div>;
}

export function AtencionDetalleModal({ reserva, atencion, onClose }: AtencionDetalleModalProps) {
  const isOpen = Boolean(reserva && atencion);
  const insumos = atencion?.insumos ?? [];
  return (
    <FormModal isOpen={isOpen} onClose={onClose} title={`Atención · Reserva #${reserva?.id ?? ''}`} size="lg" hideFooter>
      {reserva && (
        <section className={`${styles.detailSection} ${styles.reservaSection}`}>
          <div className={styles.sectionHeader}><CalendarDays size={16} aria-hidden="true" /><h3>Reserva</h3><span>Datos agendados</span></div>
          <div className={styles.detailGrid}>
            <Dato label="Cliente">{reserva.cliente}</Dato>
            <Dato label="Teléfono">{reserva.numero_telefono}</Dato>
            <Dato label="Estado"><StatusBadge tone="success">{reserva.estado}</StatusBadge></Dato>
            <Dato label="Local">{reserva.local}</Dato>
            <Dato label="Tipo">{reserva.tipo}</Dato>
            <Dato label="Fecha">{reserva.fecha}</Dato>
            <Dato label="Horario">{reserva.hora_desde}–{reserva.hora_hasta}</Dato>
            <Dato label="Servicio">{reserva.servicio}</Dato>
            <Dato label="Servicio solicitado">{reserva.servicio_solicitado}</Dato>
            <Dato label="Servicio confirmado">{reserva.servicio_confirmado}</Dato>
            <Dato label="Precio">{reserva.precio != null ? `Bs ${reserva.precio}` : '—'}</Dato>
            <Dato label="Notas">{reserva.notas}</Dato>
          </div>
        </section>
      )}
      {atencion && (
        <section className={`${styles.detailSection} ${styles.atencionSection}`}>
          <div className={styles.sectionHeader}><ClipboardCheck size={16} aria-hidden="true" /><h3>Atención</h3><span>Servicio registrado</span></div>
          <div className={styles.detailGrid}>
            <Dato label="Quien lo atendió">{atencion.empleado_nombre}</Dato>
            <Dato label="Fecha">{atencion.fecha_atencion.slice(0, 10)}</Dato>
            <Dato label="Horario">{[atencion.hora_inicio, atencion.hora_fin].filter(Boolean).join('–')}</Dato>
            <Dato label="Lugar">{atencion.lugar}</Dato>
            <Dato label="Observaciones">{atencion.observaciones}</Dato>
          </div>
          <div className={styles.detailSupplies}>
            <div className={styles.suppliesTitle}><Package size={15} aria-hidden="true" /><strong>Insumos utilizados</strong><span>{insumos.length} {insumos.length === 1 ? 'insumo' : 'insumos'}</span></div>
            {insumos.length === 0 ? <p>No se usaron insumos en esta atención.</p> : (
              <ul>
                {insumos.map((item) => (
                  <li key={item.id}>
                    <strong>{item.item_nombre}</strong>
                    <span className={styles.supplyQuantity}>{item.cantidad_usada} {item.unidad_medida}</span>
                    {item.estado_descuento === 'PENDIENTE_STOCK' ? <StatusBadge tone="danger">Deducción pendiente</StatusBadge> : <small>Descontado: {item.cantidad_descontada} {item.unidad_medida}</small>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}
    </FormModal>
  );
}
