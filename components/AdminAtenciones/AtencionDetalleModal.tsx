'use client';

import { FormModal } from '@/components/AdminConfig';
import { StatusBadge } from '@/components/AdminConfig';
import type { Atencion } from '@/lib/api/atenciones';
import type { ReservaBD } from '@/types/reserva';
import styles from './AtencionFormModal.module.css';

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
  return (
    <FormModal isOpen={isOpen} onClose={onClose} title={`Atención · Reserva #${reserva?.id ?? ''}`} size="lg" hideFooter>
      {reserva && (
        <section className={styles.detailSection}>
          <h3>Reserva</h3>
          <div className={styles.detailGrid}>
            <Dato label="Cliente">{reserva.cliente}</Dato>
            <Dato label="Teléfono">{reserva.numero_telefono}</Dato>
            <Dato label="Estado">{reserva.estado}</Dato>
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
        <section className={styles.detailSection}>
          <h3>Atención</h3>
          <div className={styles.detailGrid}>
            <Dato label="Quien lo atendió">{atencion.empleado_nombre}</Dato>
            <Dato label="Fecha">{atencion.fecha_atencion.slice(0, 10)}</Dato>
            <Dato label="Horario">{[atencion.hora_inicio, atencion.hora_fin].filter(Boolean).join('–')}</Dato>
            <Dato label="Lugar">{atencion.lugar}</Dato>
            <Dato label="Observaciones">{atencion.observaciones}</Dato>
          </div>
          <div className={styles.detailSupplies}>
            <strong>Insumos utilizados</strong>
            {atencion.insumos.length === 0 ? <p>No se usaron servicios en esta atención</p> : (
              <ul>
                {atencion.insumos.map((item) => (
                  <li key={item.id}>
                    <span>{item.item_nombre}</span>
                    <span>{item.cantidad_usada} {item.unidad_medida}</span>
                    {item.estado_descuento === 'PENDIENTE_STOCK' && <StatusBadge tone="danger">Deducción pendiente</StatusBadge>}
                    {item.estado_descuento !== 'PENDIENTE_STOCK' && <small>Descontado: {item.cantidad_descontada} {item.unidad_medida}</small>}
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
