'use client';

import { DataTable } from '@/components/AdminConfig';
import type { Column } from '@/components/AdminConfig';
import type { ReservaBD } from '@/types/reserva';
import { RESERVA_ESTADO_HINT, ReservaEstadoPill } from './ReservaEstadoPill';
import type { ReservaEstadoPillTone } from './ReservaEstadoPill';
import { POR_COBRAR_HINT, ReservaStockHint, formatDiaCorto } from './ReservaRow';
import styles from './AprobacionReservasTable.module.css';

type Row = ReservaBD & Record<string, unknown>;

interface AprobacionReservasTableProps {
  reservas: ReservaBD[];
  /** false cuando la lista ya está filtrada por un local: la columna sobra. */
  showLocal: boolean;
  /** Acción principal + menú de la fila; la página conoce los handlers. */
  renderActions: (reserva: ReservaBD) => React.ReactNode;
}

/** Lo que el equipo necesita saber de la reserva ahora mismo, en una sola etiqueta. */
export function estadoDeAprobacion(r: ReservaBD): { label: string; tone: ReservaEstadoPillTone; hint: string } {
  switch (r.estado) {
    case 'AGENDADO':
      return r.notificado
        ? { label: 'Confirmada', tone: 'info', hint: 'La cita está agendada y ya le enviaste la confirmación al cliente por WhatsApp. Puedes reenviarla si la necesita.' }
        : { label: 'Sin confirmar', tone: 'pendiente', hint: 'La cita está agendada, pero todavía no le avisaste al cliente. Pulsa «Confirmar» para enviarle el mensaje por WhatsApp.' };
    case 'COMPLETADO':
      return r.estado_cobro === 'POR_COBRAR'
        ? { label: 'Por cobrar', tone: 'pendiente', hint: POR_COBRAR_HINT }
        : { label: 'Completada', tone: 'success', hint: 'El servicio ya se realizó y el cobro está registrado o lo cubre un paquete del cliente.' };
    case 'RECHAZADO':
      return { label: 'Rechazada', tone: 'danger', hint: RESERVA_ESTADO_HINT.RECHAZADO };
    default:
      return { label: 'Pendiente', tone: 'pendiente', hint: RESERVA_ESTADO_HINT.PENDIENTE };
  }
}

/** Tabla de la bandeja de aprobación: una fila por reserva, estado único y acciones al final. */
export function AprobacionReservasTable({ reservas, showLocal, renderActions }: AprobacionReservasTableProps) {
  const columns: Column<Row>[] = [
    {
      key: 'fecha',
      label: 'Cita',
      render: (_v, r) => (
        <div className={styles.stack}>
          <strong className={styles.primary}>{formatDiaCorto(r.fecha)}</strong>
          <span className={styles.secondary}>{r.hora_desde} – {r.hora_hasta}</span>
        </div>
      ),
    },
    {
      key: 'cliente',
      label: 'Cliente',
      render: (_v, r) => (
        <div className={styles.stack}>
          <span className={styles.primary}>
            {r.cliente || 'Cliente sin nombre'} <span className={styles.id}>#{r.id}</span>
          </span>
          <span className={styles.secondary}>{r.numero_telefono || 'Sin teléfono'}</span>
        </div>
      ),
    },
    {
      key: 'servicio',
      label: 'Servicio',
      render: (_v, r) => {
        const pedido = (r.servicio_solicitado ?? '').trim();
        const final = r.servicio_confirmado || r.servicio || pedido || 'Por definir';
        const distinto = pedido && pedido.toLowerCase() !== final.trim().toLowerCase();
        return (
          <div className={styles.stack}>
            <span className={styles.primary}>{final}</span>
            {distinto && <span className={styles.secondary}>Pidió: {pedido}</span>}
            {r.notas && <span className={styles.note} title={r.notas}>{r.notas}</span>}
          </div>
        );
      },
    },
    ...(showLocal
      ? [{ key: 'local', label: 'Local', render: (_v: unknown, r: Row) => <span className={styles.secondary}>{r.local}</span> }]
      : []),
    {
      key: 'estado',
      label: 'Estado',
      searchable: false,
      render: (_v, r) => {
        const { label, tone, hint } = estadoDeAprobacion(r);
        return (
          <span className={styles.estado}>
            <ReservaEstadoPill tone={tone} hint={hint}>{label}</ReservaEstadoPill>
            {r.alerta_inventario === true && r.estado !== 'COMPLETADO' && <ReservaStockHint />}
          </span>
        );
      },
    },
    {
      key: 'acciones',
      label: '',
      searchable: false,
      render: (_v, r) => (
        <div className={styles.actions} onClick={(e) => e.stopPropagation()}>
          {renderActions(r)}
        </div>
      ),
    },
  ];

  return (
    <DataTable<Row>
      columns={columns}
      data={reservas as Row[]}
      getRowKey={(r) => r.id}
      hideSearch
      emptyMessage="No hay reservas con estos filtros"
    />
  );
}
