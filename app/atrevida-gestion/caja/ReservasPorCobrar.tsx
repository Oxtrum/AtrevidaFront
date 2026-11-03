'use client';

import { useEffect, useMemo, useState } from 'react';
import { getReservasDB } from '@/lib/api/reservas';
import { formatMoney } from '@/lib/utils/format';
import { esCobrable, etiquetaCobro, faltaPagar, ordenarCobrables, type EtiquetaCobro } from '@/lib/utils/reservasCobrables';
import type { ReservaBD } from '@/types/reserva';
import styles from './page.module.css';

interface Props {
  /** Nombre del local de la caja. */
  local: string;
  /** Cliente elegido en el ticket; sin él se listan las reservas del local que piden cobro ya. */
  clienteId: number | null;
  clienteNombre: string;
  /** Reserva que se está cobrando. */
  seleccionadaId: number | null;
  /** Cambia tras registrar un cobro para volver a leer la lista. */
  recarga: number;
  onSeleccionar: (reserva: ReservaBD) => void;
}

const LIMITE = 20;
const LIMITE_CLIENTE = 50;

const TEXTO_ETIQUETA: Record<EtiquetaCobro, string> = {
  COMPLETADA: 'Completada',
  HOY: 'Hoy',
  ATRASADA: 'Sin completar',
  ADELANTADA: 'Se adelanta a hoy',
  PENDIENTE: 'Pendiente',
  CANCELADA: 'Cancelada',
};

const hoyISO = () => new Date().toLocaleDateString('en-CA');

const fechaCorta = (fecha: string) =>
  new Date(`${fecha}T00:00:00`).toLocaleDateString('es-BO', { weekday: 'short', day: 'numeric', month: 'short' });

/**
 * Pestaña Reservas del catálogo de caja. Sin cliente: las completadas sin cobro y las agendadas para hoy, del local.
 * Con cliente: todas las suyas que faltan por cobrar, de cualquier local y también las futuras, porque puede venir antes de su día; cobrarlas las pasa a hoy.
 */
export function ReservasPorCobrar({ local, clienteId, clienteNombre, seleccionadaId, recarga, onSeleccionar }: Props) {
  // Lo leído y la consulta a la que corresponde: mientras no coinciden con la actual, la lista está cargando.
  const [leido, setLeido] = useState<{ clave: string; reservas: ReservaBD[] }>({ clave: '', reservas: [] });
  const clave = `${local}|${clienteId ?? ''}|${recarga}`;

  useEffect(() => {
    const controller = new AbortController();
    const hoy = hoyISO();
    // Con cliente: todas sus reservas, de cualquier local y estado (se filtran las pagadas abajo). Al elegir una, la caja
    // pasa al local de esa reserva. Sin cliente: lo ya brindado sin cobro (de cualquier día) y lo agendado para hoy.
    const base = { orden: 'cronologico' as const };
    const consultas = clienteId
      ? [getReservasDB({ ...base, cliente_id: clienteId, limit: LIMITE_CLIENTE }, controller.signal)]
      : [
          getReservasDB({ ...base, local, limit: LIMITE, estado: 'COMPLETADO', estado_cobro: 'POR_COBRAR' }, controller.signal),
          getReservasDB({ ...base, local, limit: LIMITE, estado: 'AGENDADO', fecha: hoy }, controller.signal),
        ];
    Promise.all(consultas)
      .then((respuestas) => {
        if (controller.signal.aborted) return;
        setLeido({ clave, reservas: respuestas.flatMap((r) => r.data?.reservas ?? []) });
      })
      .catch(() => {
        if (!controller.signal.aborted) setLeido({ clave, reservas: [] });
      });
    return () => controller.abort();
  }, [local, clienteId, recarga, clave]);

  const cargando = leido.clave !== clave;
  const hoy = hoyISO();
  const filas = useMemo(
    () => ordenarCobrables(leido.reservas.filter(clienteId ? faltaPagar : esCobrable), hoy),
    [leido.reservas, hoy, clienteId],
  );

  return (
    <div className={styles.serviceList}>
      {filas.map((reserva) => {
        const etiqueta = etiquetaCobro(reserva, hoy);
        const servicio = reserva.servicio_confirmado || reserva.servicio;
        return (
          <button
            key={reserva.id}
            type="button"
            className={`${styles.serviceItem} ${reserva.id === seleccionadaId ? styles.serviceItemActive : ''}`}
            aria-pressed={reserva.id === seleccionadaId}
            onClick={() => onSeleccionar(reserva)}
          >
            <span>
              <strong>{clienteId ? servicio : reserva.cliente}</strong>
              <small>
                {fechaCorta(reserva.fecha)} · {reserva.hora_desde}{clienteId ? '' : ` · ${servicio}`}
              </small>
            </span>
            <span className={styles.servicePrice}>
              <b>{reserva.precio != null ? formatMoney(reserva.precio) : 'Sin precio'}</b>
              <small>{TEXTO_ETIQUETA[etiqueta]}</small>
            </span>
          </button>
        );
      })}
      {!cargando && filas.length === 0 && (
        <p className={styles.mutedText}>
          {clienteId ? `${clienteNombre} no tiene reservas por cobrar.` : 'No hay reservas por cobrar.'}
        </p>
      )}
    </div>
  );
}
