import { AlertTriangle, MapPin, UserRound, UsersRound } from 'lucide-react';
import { Tooltip } from '@/components/AdminConfig';
import type { BadgeTone } from '@/components/AdminConfig';
import { formatQty } from '@/lib/utils/format';
import { recortarConPrioridad } from '@/lib/utils/recortarConPrioridad';
import type { ConsumoInsumo } from '@/types/inventario';
import styles from './CalendarioEvento.module.css';

interface CalendarioEventoProps {
  horaDesde?: string | null;
  horaHasta?: string | null;
  cliente?: string | null;
  /** Omitir para no mostrar la línea de servicio (Insumos). */
  servicio?: string | null;
  /** Local y personal solo se muestran si se pasan; cada vista decide cuánto detalle cabe en la tarjeta. */
  local?: string | null;
  empleado?: string | null;
  /** Estado de la atención: pinta el punto junto a la hora (mismos colores que StatusBadge). */
  tono?: BadgeTone;
  /** Aviso que requiere acción. Va como icono junto a la hora; el texto completo sale al pasar el cursor. */
  aviso?: string;
  /** Contenido propio de la vista (insumos usados). */
  children?: React.ReactNode;
}

const hora = (valor?: string | null) => valor?.slice(0, 5) || undefined;

/** Contenido de una tarjeta de CalendarioSemanal. Todo cambio visual de las tarjetas va aquí. */
export function CalendarioEvento({ horaDesde, horaHasta, cliente, servicio, local, empleado, tono = 'neutral', aviso, children }: CalendarioEventoProps) {
  const horario = [hora(horaDesde) ?? 'Sin hora', hora(horaHasta)].filter(Boolean).join(' – ');
  return (
    <>
      <span className={`${styles.hora} ${styles[tono]}`}>
        <i className={styles.punto} aria-hidden="true" />
        {horario}
        {aviso && (
          <Tooltip content={aviso}>
            <span className={styles.aviso} role="img" aria-label={aviso}><AlertTriangle size={13} aria-hidden="true" /></span>
          </Tooltip>
        )}
      </span>
      <span className={styles.quien}><UserRound size={13} aria-hidden="true" /><span className={styles.truncar}>{cliente || 'Sin cliente'}</span></span>
      {servicio !== undefined && <span className={styles.servicio} title={servicio || undefined}>{servicio || 'Sin servicio'}</span>}
      {children}
      {(local || empleado) && (
        <span className={styles.meta}>
          {local && <span className={styles.lugar}><MapPin size={11} aria-hidden="true" />{local}</span>}
          {empleado && <span className={styles.personal}><UsersRound size={11} aria-hidden="true" />{empleado}</span>}
        </span>
      )}
    </>
  );
}

const tienePendiente = (insumo: ConsumoInsumo) => insumo.cantidad_pendiente > 0;

/**
 * Insumos usados en una atención. Muestra los primeros y "y N más"; los que quedaron con el descuento pendiente
 * siempre se ven y van en ámbar (el triángulo de la hora ya lo dice sin depender del color).
 */
export function InsumosEvento({ insumos, max = 2 }: { insumos: ConsumoInsumo[]; max?: number }) {
  if (insumos.length === 0) return null;
  const visibles = recortarConPrioridad(insumos, max, tienePendiente);
  const restantes = insumos.length - visibles.length;
  return (
    <span className={styles.insumos}>
      {visibles.map((insumo, i) => (
        <span key={`${insumo.item_id ?? 'sin'}-${i}`}>
          <span className={styles.nombre} title={insumo.item_nombre}>{insumo.item_nombre}</span>
          <b className={tienePendiente(insumo) ? styles.pendiente : undefined}>{formatQty(insumo.cantidad_usada, insumo.unidad_medida)}</b>
        </span>
      ))}
      {restantes > 0 && <span className={styles.mas}>y {restantes} más</span>}
    </span>
  );
}

/** Los mismos insumos en una línea, para filas de lista. */
export function textoInsumos(insumos: ConsumoInsumo[]): string {
  return insumos.map((insumo) => `${insumo.item_nombre} ${formatQty(insumo.cantidad_usada, insumo.unidad_medida)}`).join(' · ');
}
