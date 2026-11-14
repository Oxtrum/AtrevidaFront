import { ReservaEstadoPill, RESERVA_ESTADO_HINT } from './ReservaEstadoPill';
import type { ReservaEstadoPillTone } from './ReservaEstadoPill';
import { ReservaStockHint } from './ReservaRow';

const ESTADO_TONE: Record<string, ReservaEstadoPillTone> = {
  AGENDADO: 'info',
  COMPLETADO: 'success',
  RECHAZADO: 'danger',
  CANCELADO: 'danger',
  PENDIENTE: 'pendiente',
};

interface ReservaEstadoCeldaProps {
  estado?: string;
  /** Faltaba stock de insumos al agendar. */
  alertaInventario?: boolean;
}

/** Estado de una reserva con aviso de stock faltante. */
export function ReservaEstadoCelda({ estado, alertaInventario }: ReservaEstadoCeldaProps) {
  const e = estado || 'PENDIENTE';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
      <ReservaEstadoPill tone={ESTADO_TONE[e] ?? 'neutral'} hint={RESERVA_ESTADO_HINT[e]}>{e}</ReservaEstadoPill>
      {alertaInventario === true && e !== 'COMPLETADO' && <ReservaStockHint />}
    </span>
  );
}
