'use client';

import { FormModal } from '@/components/AdminConfig';
import { AlertTriangle, CalendarDays, ClipboardCheck, Package } from 'lucide-react';
import type { Atencion } from '@/lib/api/atenciones';
import { ATENCION_ESTADO } from '@/lib/utils/atencionEstado';
import { formatQty } from '@/lib/utils/format';
import type { ReservaBD } from '@/types/reserva';
import styles from './AtencionDetalleModal.module.css';

interface AtencionDetalleModalProps {
  reserva: ReservaBD | null;
  atencion: Atencion | null;
  onClose: () => void;
}

/** Etiqueta y valor en una fila. Un dato sin valor no se muestra; `ancha` ocupa las dos columnas (textos largos). */
function Dato({ label, capitalizar, ancha, exito, children }: { label: string; capitalizar?: boolean; ancha?: boolean; exito?: boolean; children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <div className={`${styles.fila} ${ancha ? styles.ancha : ''}`}>
      <dt>{label}</dt>
      <dd className={[capitalizar && styles.capitalizar, exito && styles.exito].filter(Boolean).join(' ') || undefined}>{children}</dd>
    </div>
  );
}

const horaCorta = (valor?: string | null) => valor?.slice(0, 5);

export function AtencionDetalleModal({ reserva, atencion, onClose }: AtencionDetalleModalProps) {
  const isOpen = Boolean(reserva && atencion);
  const insumos = atencion?.insumos ?? [];
  const rango = (desde?: string | null, hasta?: string | null) => [horaCorta(desde), horaCorta(hasta)].filter(Boolean).join('–');
  const horarioReserva = reserva ? rango(reserva.hora_desde, reserva.hora_hasta) : '';
  const horarioAtencion = atencion ? rango(atencion.hora_inicio, atencion.hora_fin) : '';
  const fechaAtencion = atencion?.fecha_atencion.slice(0, 10);
  return (
    <FormModal isOpen={isOpen} onClose={onClose} title={`Atención · Reserva #${reserva?.id ?? ''}`} size="lg" hideFooter>
      {reserva && (
        <section className={styles.seccion}>
          <h3><CalendarDays size={16} aria-hidden="true" />Reserva</h3>
          <dl className={styles.datos}>
            <Dato label="Cliente">{reserva.cliente}</Dato>
            <Dato label="Teléfono">{reserva.numero_telefono}</Dato>
            <Dato label="Estado" capitalizar exito>{reserva.estado?.toLowerCase()}</Dato>
            <Dato label="Local">{reserva.local}</Dato>
            <Dato label="Tipo" capitalizar>{reserva.tipo}</Dato>
            <Dato label="Fecha">{reserva.fecha}</Dato>
            <Dato label="Horario">{horarioReserva}</Dato>
            <Dato label="Servicio">{reserva.servicio}</Dato>
            {/* Solicitado y confirmado solo aparecen cuando difieren del servicio. */}
            {reserva.servicio_solicitado !== reserva.servicio && <Dato label="Solicitado">{reserva.servicio_solicitado}</Dato>}
            {reserva.servicio_confirmado !== reserva.servicio && <Dato label="Confirmado">{reserva.servicio_confirmado}</Dato>}
            <Dato label="Precio">{reserva.precio != null ? `Bs ${reserva.precio}` : null}</Dato>
            <Dato label="Notas" ancha>{reserva.notas}</Dato>
          </dl>
        </section>
      )}
      {atencion && (
        <section className={`${styles.seccion} ${styles.atencion}`}>
          <h3><ClipboardCheck size={16} aria-hidden="true" />Atención</h3>
          <dl className={styles.datos}>
            <Dato label="Atendido por">{atencion.empleado_nombre}</Dato>
            {/* Fecha y horario de la atención solo se muestran si cambian respecto a la reserva. */}
            {fechaAtencion !== reserva?.fecha && <Dato label="Fecha">{fechaAtencion}</Dato>}
            {horarioAtencion !== horarioReserva && <Dato label="Horario">{horarioAtencion}</Dato>}
            <Dato label="Lugar">{atencion.lugar}</Dato>
            <Dato label="Observaciones" ancha>{atencion.observaciones}</Dato>
          </dl>
          <div className={styles.insumos}>
            <h4><Package size={15} aria-hidden="true" />Insumos utilizados<span>{insumos.length}</span></h4>
            {insumos.length === 0 ? <p>No se usaron insumos en esta atención.</p> : (
              <ul>
                {insumos.map((item) => {
                  const pendiente = item.estado_descuento === 'PENDIENTE_STOCK';
                  return (
                    <li key={item.id}>
                      <span className={styles.nombre}>{item.item_nombre}</span>
                      <span className={styles.cantidad}>{formatQty(item.cantidad_usada, item.unidad_medida)}</span>
                      {pendiente ? (
                        <span className={styles.pendiente}><AlertTriangle size={13} aria-hidden="true" />{ATENCION_ESTADO.STOCK_PENDIENTE.label}</span>
                      ) : (
                        <span className={styles.estado}>
                          {item.cantidad_descontada === item.cantidad_usada ? 'Descontado' : `Descontado ${formatQty(item.cantidad_descontada, item.unidad_medida)}`}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      )}
    </FormModal>
  );
}
