'use client';

import { AlertTriangle, MapPin, UsersRound } from 'lucide-react';
import { ReservaDetalle, ReservaHint, ReservaMetaItem, ReservaRow, ReservaStatusLine, formatDiaCorto, formatFalta } from '@/components/AdminReservas';
import { ATENCION_ESTADO, type EstadoAtencion } from '@/lib/utils/atencionEstado';
import { AtencionAcciones, type PermisosAtencion } from './AtencionAcciones';
import type { AtencionCtrl } from './AtencionModales';
import styles from './AtencionFila.module.css';

interface AtencionFilaProps {
  ctrl: AtencionCtrl;
  estado: EstadoAtencion | string;
  reservaId: number;
  atencionId?: number | null;
  puede: PermisosAtencion;
  cliente?: string | null;
  servicio?: string | null;
  /** Solo en listas de varios días; en Jornada el día ya está en el filtro. */
  fecha?: string;
  horaDesde?: string | null;
  horaHasta?: string | null;
  local?: string | null;
  empleado?: string | null;
  /** Texto bajo el servicio: motivo, insumos usados… */
  detalle?: React.ReactNode;
  /** Insumos con deducción pendiente. */
  stockPendiente?: number;
  /** false cuando la pestaña ya filtra por un solo estado: repetirlo en cada fila es ruido. */
  mostrarEstado?: boolean;
  /** Muestra "Sin personal asignado" cuando aún no hay quien atienda (Jornada). */
  mostrarSinPersonal?: boolean;
  /** Marca la cita que sigue (Jornada de hoy). */
  siguiente?: boolean;
  onDesactivar?: () => void;
  /** En Jornada, nombra la desactivación como reapertura de reserva. */
  accionReabrir?: boolean;
}

const hora = (valor?: string | null) => valor?.slice(0, 5) || undefined;

/**
 * Fila única de Atenciones (Jornada, Seguimiento y las listas de Personal y Consumo).
 * Es ReservaRow con los datos de una atención; todo cambio visual va en ReservaRow.
 */
export function AtencionFila({
  ctrl, estado, reservaId, atencionId, puede, cliente, servicio, fecha, horaDesde, horaHasta,
  local, empleado, detalle, stockPendiente = 0, mostrarEstado = true, mostrarSinPersonal = false, siguiente = false, onDesactivar, accionReabrir = false,
}: AtencionFilaProps) {
  const meta = ATENCION_ESTADO[estado as EstadoAtencion];
  const abrir = puede.verAtencion && atencionId ? () => void ctrl.verAtencion(atencionId, reservaId) : () => void ctrl.verReserva(reservaId);
  return (
    <ReservaRow
      tone={meta?.tone ?? 'neutral'}
      day={fecha ? formatDiaCorto(fecha) : undefined}
      time={hora(horaDesde) ?? 'Sin hora'}
      timeSub={hora(horaHasta)}
      title={cliente || 'Sin cliente'}
      id={reservaId}
      service={servicio || 'Sin servicio'}
      details={detalle || stockPendiente > 0 ? (
        <>
          {detalle && <ReservaDetalle>{detalle}</ReservaDetalle>}
          {stockPendiente > 0 && (
            <span className={styles.stockPending}>
              <AlertTriangle size={13} strokeWidth={2} />
              {ATENCION_ESTADO.STOCK_PENDIENTE.label}
            </span>
          )}
        </>
      ) : undefined}
      meta={(
        <>
          {local && <ReservaMetaItem icon={MapPin}>{local}</ReservaMetaItem>}
          {empleado
            ? <ReservaMetaItem icon={UsersRound}>{empleado}</ReservaMetaItem>
            : mostrarSinPersonal && <ReservaMetaItem icon={UsersRound} muted>Sin personal asignado</ReservaMetaItem>}
        </>
      )}
      titleHint={siguiente ? <ReservaHint>{formatFalta(horaDesde ?? undefined) ? `Próxima cita · ${formatFalta(horaDesde ?? undefined)}` : 'En curso'}</ReservaHint> : undefined}
      status={mostrarEstado
        ? <ReservaStatusLine estado={estado} label={meta?.label} showEstado={mostrarEstado} />
        : undefined}
      actions={<AtencionAcciones ctrl={ctrl} reservaId={reservaId} atencionId={atencionId} puede={puede} onDesactivar={onDesactivar} accionReabrir={accionReabrir} />}
      onClick={abrir}
    />
  );
}
