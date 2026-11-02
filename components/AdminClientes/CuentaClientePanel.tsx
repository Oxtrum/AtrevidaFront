'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Ban, Info } from 'lucide-react';
import { DataTable, RowActionsMenu, StatusBadge, Tooltip } from '@/components/AdminConfig';
import type { Column } from '@/components/AdminConfig';
import type { AbonoCliente, CargoCliente, CuentaCliente } from '@/lib/api/cuenta';
import { estadoCargoTexto, tipoCargoTexto, tonoEstadoCargo } from '@/lib/utils/cuenta';
import { formatFecha } from '@/lib/utils/formatDateTime';
import { formatMoney } from '@/lib/utils/format';
import { etiquetaTipoPago } from '@/lib/utils/tipoPago';
import styles from './CuentaClientePanel.module.css';

const AYUDA_MOVIMIENTOS = 'Cargo: lo que el cliente debe. Pago: dinero que entregó. Cada cargo muestra la reserva o el paquete de donde nace. Si algo está mal, se anula con motivo.';

/** Un cargo o un pago de la cuenta, en una sola lista ordenada por fecha. */
type Movimiento = (
  | { clase: 'cargo'; cargo: CargoCliente }
  | { clase: 'pago'; abono: AbonoCliente }
) & { clave: string; fecha: string } & Record<string, unknown>;

interface CuentaClientePanelProps {
  cuenta: CuentaCliente | null;
  loading: boolean;
  verAnulados: boolean;
  onVerAnulados: (valor: boolean) => void;
  onAnular: (cargo: CargoCliente) => void;
}

/** De donde nace un cargo: su reserva (con fecha y servicio), su paquete o, si no tiene, un cargo manual. */
function OrigenCargo({ cargo }: { cargo: CargoCliente }) {
  if (cargo.reserva_id) {
    const detalle = [cargo.reserva_fecha ? formatFecha(cargo.reserva_fecha) : null, cargo.reserva_servicio].filter(Boolean).join(' · ');
    return (
      <Link className={styles.origen} href={`/atrevida-gestion/reservas/editar/${cargo.reserva_id}`} title="Abrir la reserva">
        Reserva #{cargo.reserva_id}{detalle && <span className={styles.detalle}>{detalle}</span>}
      </Link>
    );
  }
  if (cargo.plan_id) {
    return <span className={styles.origen}>Paquete{cargo.plan_nombre && <span className={styles.detalle}>{cargo.plan_nombre}</span>}</span>;
  }
  return <span className={styles.manual}>Manual</span>;
}

/** Cargos y pagos de un cliente en una sola lista. El saldo y el cobro viven en la cabecera de la ficha. */
export function CuentaClientePanel({ cuenta, loading, verAnulados, onVerAnulados, onAnular }: CuentaClientePanelProps) {
  const movimientos = useMemo<Movimiento[]>(() => {
    const cargos = (cuenta?.cargos ?? []).map((cargo) => ({ clase: 'cargo' as const, cargo, clave: `c${cargo.id}`, fecha: cargo.fecha_hecho }));
    const pagos = (cuenta?.abonos ?? []).map((abono) => ({ clase: 'pago' as const, abono, clave: `p${abono.codigo_pago}`, fecha: abono.fecha_hecho }));
    return [...cargos, ...pagos] as Movimiento[];
  }, [cuenta]);

  const columnas: Column<Movimiento>[] = [
    {
      key: 'fecha',
      label: 'Fecha',
      searchable: false,
      firstSort: 'desc',
      render: (_v, row) => {
        const registrado = row.clase === 'cargo' ? row.cargo.registrado_en : row.abono.registrado_en;
        return <span className={styles.num} title={`Registrado el ${formatFecha(registrado)}`}>{formatFecha(row.fecha)}</span>;
      },
    },
    {
      key: 'clase',
      label: 'Tipo',
      searchable: false,
      render: (_v, row) => <StatusBadge tone={row.clase === 'cargo' ? 'warning' : 'success'}>{row.clase === 'cargo' ? 'Cargo' : 'Pago'}</StatusBadge>,
    },
    {
      key: 'detalle',
      label: 'Detalle',
      render: (_v, row) =>
        row.clase === 'cargo' ? (
          <span className={styles.celda}>
            <span className={row.cargo.anulado ? styles.anulado : undefined}>{row.cargo.concepto}</span>
            <span className={styles.detalle}>{tipoCargoTexto(row.cargo.tipo)}</span>
          </span>
        ) : (
          <span className={styles.celda}>
            <span>{etiquetaTipoPago(row.abono.tipo_pago)}</span>
            <span className={styles.detalle}>{row.abono.codigo_pago}</span>
          </span>
        ),
    },
    {
      key: 'origen',
      label: 'Origen',
      searchable: false,
      sortable: false,
      render: (_v, row) => (row.clase === 'cargo' ? <OrigenCargo cargo={row.cargo} /> : <span className={styles.manual}>—</span>),
    },
    {
      key: 'monto',
      label: 'Monto',
      searchable: false,
      render: (_v, row) => (
        <span className={styles.num}>{row.clase === 'cargo' ? formatMoney(row.cargo.monto) : `+ ${formatMoney(row.abono.monto)}`}</span>
      ),
    },
    {
      key: 'estado',
      label: 'Estado',
      searchable: false,
      sortable: false,
      render: (_v, row) => {
        if (row.clase === 'pago') {
          return row.abono.sin_aplicar > 0
            ? <StatusBadge tone="info">Sin usar {formatMoney(row.abono.sin_aplicar)}</StatusBadge>
            : <StatusBadge tone="neutral">Usado</StatusBadge>;
        }
        return row.cargo.anulado
          ? <StatusBadge tone="neutral" title={row.cargo.motivo_anulacion}>Anulado</StatusBadge>
          : <StatusBadge tone={tonoEstadoCargo(row.cargo.estado)}>{estadoCargoTexto(row.cargo.estado)}</StatusBadge>;
      },
    },
    {
      key: 'acciones',
      label: '',
      searchable: false,
      sortable: false,
      render: (_v, row) =>
        row.clase === 'cargo' && !row.cargo.anulado ? (
          <RowActionsMenu actions={[{ label: 'Anular cargo', icon: <Ban size={12} strokeWidth={2} />, onClick: () => onAnular(row.cargo), variant: 'danger' }]} />
        ) : null,
    },
  ];

  return (
    <section className={styles.panel} aria-labelledby="cuenta-movimientos">
      <div className={styles.cabecera}>
        <h3 id="cuenta-movimientos" className={styles.titulo}>
          Movimientos
          <Tooltip title="Movimientos" content={AYUDA_MOVIMIENTOS}>
            <Info size={14} strokeWidth={1.8} aria-label="Qué son los movimientos" />
          </Tooltip>
        </h3>
        <label className={styles.anulados}>
          <input type="checkbox" checked={verAnulados} onChange={(e) => onVerAnulados(e.target.checked)} />
          Ver anulados
        </label>
      </div>
      <DataTable<Movimiento>
        columns={columnas}
        data={movimientos}
        loading={loading && !cuenta}
        getRowKey={(r) => r.clave}
        defaultSort={{ key: 'fecha', dir: 'desc' }}
        emptyMessage="Sin movimientos"
        hideSearch
      />
    </section>
  );
}
