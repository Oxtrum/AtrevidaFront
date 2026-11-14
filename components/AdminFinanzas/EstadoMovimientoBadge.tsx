import { StatusBadge } from '@/components/AdminConfig';
import { todayISO } from '@/lib/utils/format';
import type { EstadoMovimiento, NaturalezaFinanciera } from '@/types/finanzas';

interface EstadoMovimientoBadgeProps {
  estado: EstadoMovimiento;
  /** Fecha de cobro/pago (YYYY-MM-DD); define si un pendiente está atrasado. */
  fecha: string;
  naturaleza?: NaturalezaFinanciera;
  /** Cobro del próximo mes que aún no existe y se puede pagar por adelantado. */
  adelantado?: boolean;
}

/**
 * Único lugar donde se traduce estado + fecha a lo que ve la persona. El estado guardado es solo
 * PENDIENTE/PAGADO/ANULADO; "Atrasado", "Por vencer" y "Adelantar" se calculan contra la fecha.
 */
export function EstadoMovimientoBadge({ estado, fecha, naturaleza = 'EGRESO', adelantado }: EstadoMovimientoBadgeProps) {
  const ingreso = naturaleza === 'INGRESO';
  if (estado === 'ANULADO') return <StatusBadge tone="danger">Anulado</StatusBadge>;
  if (estado === 'PAGADO') return <StatusBadge tone="success">{ingreso ? 'Cobrado' : 'Pagado'}</StatusBadge>;
  if (adelantado) return <StatusBadge tone="info" title="Aún no vence: puedes pagarlo por adelantado">Adelantar</StatusBadge>;
  if (fecha.slice(0, 10) < todayISO()) return <StatusBadge tone="danger" title="La fecha ya pasó y sigue sin pagarse">Atrasado</StatusBadge>;
  return <StatusBadge tone="warning">{ingreso ? 'Por cobrar' : 'Por vencer'}</StatusBadge>;
}
