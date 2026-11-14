import { AlertTriangle, MapPin, UsersRound } from 'lucide-react';
import { formatQty } from '@/lib/utils/format';
import type { ConsumoInsumo } from '@/types/inventario';
import styles from './CalendarioEvento.module.css';

interface CalendarioEventoProps {
  horaDesde?: string | null;
  horaHasta?: string | null;
  cliente?: string | null;
  servicio?: string | null;
  local?: string | null;
  empleado?: string | null;
  /** Personal: el empleado va primero, porque es lo que se busca. */
  empleadoPrimero?: boolean;
  /** Aviso breve bajo la hora, por ejemplo "Descuento de inventario pendiente". */
  aviso?: string;
  /** Contenido propio de la vista (insumos usados). */
  children?: React.ReactNode;
}

const hora = (valor?: string | null) => valor?.slice(0, 5) || undefined;

/** Contenido de una tarjeta de CalendarioSemanal. Todo cambio visual de las tarjetas va aquí. */
export function CalendarioEvento({ horaDesde, horaHasta, cliente, servicio, local, empleado, empleadoPrimero, aviso, children }: CalendarioEventoProps) {
  const horario = [hora(horaDesde) ?? 'Sin hora', hora(horaHasta)].filter(Boolean).join(' – ');
  return (
    <>
      <span className={styles.hora}>{horario}</span>
      {aviso && <span className={styles.aviso}><AlertTriangle size={12} aria-hidden="true" />{aviso}</span>}
      {empleadoPrimero && <span className={styles.personal}><UsersRound size={13} aria-hidden="true" />{empleado || 'Sin personal'}</span>}
      <span className={styles.cliente}>{cliente || 'Sin cliente'}</span>
      <span className={styles.servicio}>{servicio || 'Sin servicio'}</span>
      {children}
      <span className={styles.meta}>
        {local && <span><MapPin size={11} aria-hidden="true" />{local}</span>}
        {!empleadoPrimero && empleado && <span><UsersRound size={11} aria-hidden="true" />{empleado}</span>}
      </span>
    </>
  );
}

/** Insumos usados en una atención, con su cantidad; en rojo lo que quedó sin descontar. */
export function InsumosEvento({ insumos }: { insumos: ConsumoInsumo[] }) {
  if (insumos.length === 0) return null;
  return (
    <span className={styles.insumos}>
      {insumos.map((insumo, i) => (
        <span key={`${insumo.item_id ?? 'sin'}-${i}`}>
          {insumo.item_nombre}
          <b className={insumo.cantidad_pendiente > 0 ? styles.pendiente : undefined}>{formatQty(insumo.cantidad_usada, insumo.unidad_medida)}</b>
        </span>
      ))}
    </span>
  );
}

/** Los mismos insumos en una línea, para filas de lista. */
export function textoInsumos(insumos: ConsumoInsumo[]): string {
  return insumos.map((insumo) => `${insumo.item_nombre} ${formatQty(insumo.cantidad_usada, insumo.unidad_medida)}`).join(' · ');
}
