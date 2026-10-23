import { StatusBadge, type BadgeTone } from '@/components/AdminConfig';
import { formatDateISO, todayISO } from '@/lib/utils/format';
import type { GastoFijo } from '@/types/finanzas';
import styles from './PagadoHastaCell.module.css';

type EstadoPago = 'atrasado' | 'adelantado' | 'al-dia' | 'sin-pagos' | 'inactivo';

/** Único lugar donde se traduce lo pagado de un gasto fijo (pagado_hasta + atrasados + hoy) a un estado visible. */
export function estadoPagoGasto(g: Pick<GastoFijo, 'activo' | 'pagado_hasta' | 'atrasados'>): EstadoPago {
  if (!g.activo) return 'inactivo';
  if (g.atrasados > 0) return 'atrasado';
  if (!g.pagado_hasta) return 'sin-pagos';
  return g.pagado_hasta.slice(0, 10) > todayISO() ? 'adelantado' : 'al-dia';
}

const TONO: Record<EstadoPago, BadgeTone> = { atrasado: 'danger', adelantado: 'info', 'al-dia': 'success', 'sin-pagos': 'neutral', inactivo: 'neutral' };
const ETIQUETA: Record<EstadoPago, string> = { atrasado: 'Atrasado', adelantado: 'Adelantado', 'al-dia': 'Al día', 'sin-pagos': 'Sin pagos', inactivo: 'Inactivo' };

function detalleEstado(g: GastoFijo, estado: EstadoPago): string {
  const hasta = g.pagado_hasta ? formatDateISO(g.pagado_hasta) : null;
  const n = g.atrasados;
  return {
    atrasado: `${n} pago${n === 1 ? '' : 's'} vencido${n === 1 ? '' : 's'} sin pagar`,
    adelantado: `Pagado por adelantado hasta ${hasta}. Aún no hace falta pagar.`,
    'al-dia': `Pagado hasta ${hasta}. No hay nada vencido.`,
    'sin-pagos': 'Todavía no se registró ningún pago',
    inactivo: 'Gasto desactivado',
  }[estado];
}

/** Fecha hasta la que está pagado el gasto, coloreada por estado (sin chip: ahorra ancho). */
export function PagadoHastaCell({ gasto }: { gasto: GastoFijo }) {
  const estado = estadoPagoGasto(gasto);
  return (
    <span className={`${styles.date} ${styles[estado]}`} title={detalleEstado(gasto, estado)}>
      {gasto.pagado_hasta ? formatDateISO(gasto.pagado_hasta) : 'Sin pagos'}
    </span>
  );
}

/** Siguiente cobro: en rojo si ya venció, normal si está por venir. */
export function ProximoCobroCell({ gasto }: { gasto: GastoFijo }) {
  if (!gasto.proximo_cobro) return <span className={`${styles.date} ${styles.inactivo}`}>—</span>;
  const estado = gasto.activo && gasto.atrasados > 0 ? 'atrasado' : 'neutro';
  return <span className={`${styles.date} ${styles[estado]}`}>{formatDateISO(gasto.proximo_cobro)}</span>;
}

/** Chip único de la fila: cómo va el pago del gasto. Lleva la cuenta de atrasados, que ya no ocupa otra columna. */
export function EstadoPagoChip({ gasto }: { gasto: GastoFijo }) {
  const estado = estadoPagoGasto(gasto);
  const n = gasto.atrasados;
  const texto = estado === 'atrasado' ? `${n} atrasado${n === 1 ? '' : 's'}` : ETIQUETA[estado];
  return <StatusBadge tone={TONO[estado]} title={detalleEstado(gasto, estado)}>{texto}</StatusBadge>;
}
