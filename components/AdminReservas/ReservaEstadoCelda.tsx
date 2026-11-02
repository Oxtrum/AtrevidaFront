import { ReservaEstadoPill, RESERVA_ESTADO_HINT } from './ReservaEstadoPill';
import type { ReservaEstadoPillTone } from './ReservaEstadoPill';
import { POR_COBRAR_HINT, ReservaNote, ReservaStockHint } from './ReservaRow';

const ESTADO_TONE: Record<string, ReservaEstadoPillTone> = {
  AGENDADO: 'info',
  COMPLETADO: 'success',
  RECHAZADO: 'danger',
  PENDIENTE: 'pendiente',
};

interface ReservaEstadoCeldaProps {
  estado?: string;
  estadoCobro?: string;
  /** Faltaba stock de insumos al agendar. */
  alertaInventario?: boolean;
}

/** Estado de una reserva con sus avisos: stock faltante y, si ya se hizo, si falta cobrarla. Unica celda de estado de la app. */
export function ReservaEstadoCelda({ estado, estadoCobro, alertaInventario }: ReservaEstadoCeldaProps) {
  const e = estado || 'PENDIENTE';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
      <ReservaEstadoPill tone={ESTADO_TONE[e] ?? 'neutral'} hint={RESERVA_ESTADO_HINT[e]}>{e}</ReservaEstadoPill>
      {alertaInventario === true && e !== 'COMPLETADO' && <ReservaStockHint />}
      {e === 'COMPLETADO' && estadoCobro === 'POR_COBRAR' && <ReservaNote warn hint={POR_COBRAR_HINT}>Por cobrar</ReservaNote>}
    </span>
  );
}
