'use client';

import { Ban, Plus } from 'lucide-react';
import { AdminButton, DataTable, RowActionsMenu, StatusBadge } from '@/components/AdminConfig';
import type { Column } from '@/components/AdminConfig';
import type { AbonoCliente, CargoCliente, CuentaCliente } from '@/lib/api/cuenta';
import { estadoCargoTexto, tipoCargoTexto, tonoEstadoCargo } from '@/lib/utils/cuenta';
import { formatFecha } from '@/lib/utils/formatDateTime';
import { formatMoney } from '@/lib/utils/format';
import styles from './CuentaClientePanel.module.css';

type CargoRow = CargoCliente & Record<string, unknown>;
type AbonoRow = AbonoCliente & Record<string, unknown>;

interface CuentaClientePanelProps {
  cuenta: CuentaCliente | null;
  loading: boolean;
  verAnulados: boolean;
  onVerAnulados: (valor: boolean) => void;
  onNuevoCargo: () => void;
  onAnular: (cargo: CargoCliente) => void;
}

/** Lo que un cliente debe (cargos) y lo que entrego (abonos). El saldo y el cobro viven en la cabecera de la ficha. */
export function CuentaClientePanel({ cuenta, loading, verAnulados, onVerAnulados, onNuevoCargo, onAnular }: CuentaClientePanelProps) {
  const cargosColumns: Column<CargoRow>[] = [
    {
      key: 'concepto',
      label: 'Concepto',
      render: (_v, row) => (
        <span className={styles.concepto}>
          <span className={row.anulado ? styles.anulado : undefined}>{row.concepto}</span>
          <span className={styles.conceptoTipo}>{tipoCargoTexto(row.tipo)}</span>
        </span>
      ),
    },
    {
      key: 'fecha_hecho',
      label: 'Fecha',
      searchable: false,
      firstSort: 'desc',
      render: (_v, row) => <span className={styles.num} title={`Registrado el ${formatFecha(row.registrado_en)}`}>{formatFecha(row.fecha_hecho)}</span>,
    },
    { key: 'monto', label: 'Monto', searchable: false, render: (_v, row) => <span className={styles.num}>{formatMoney(row.monto)}</span> },
    { key: 'pagado', label: 'Pagado', searchable: false, render: (_v, row) => <span className={styles.num}>{formatMoney(row.pagado)}</span> },
    {
      key: 'estado',
      label: 'Estado',
      searchable: false,
      render: (_v, row) =>
        row.anulado ? (
          <StatusBadge tone="neutral" title={row.motivo_anulacion}>Anulado</StatusBadge>
        ) : (
          <StatusBadge tone={tonoEstadoCargo(row.estado)}>{estadoCargoTexto(row.estado)}</StatusBadge>
        ),
    },
    {
      key: 'acciones',
      label: '',
      searchable: false,
      sortable: false,
      render: (_v, row) =>
        row.anulado ? null : (
          <RowActionsMenu actions={[{ label: 'Anular cargo', icon: <Ban size={12} strokeWidth={2} />, onClick: () => onAnular(row), variant: 'danger' }]} />
        ),
    },
  ];

  const abonosColumns: Column<AbonoRow>[] = [
    { key: 'codigo_pago', label: 'Pago', searchable: false },
    { key: 'fecha_hecho', label: 'Fecha', searchable: false, firstSort: 'desc', render: (_v, row) => <span className={styles.num}>{formatFecha(row.fecha_hecho)}</span> },
    { key: 'tipo_pago', label: 'Método', searchable: false, render: (_v, row) => String(row.tipo_pago).toUpperCase() },
    { key: 'monto', label: 'Monto', searchable: false, render: (_v, row) => <span className={styles.num}>{formatMoney(row.monto)}</span> },
    { key: 'aplicado', label: 'Cubrió', searchable: false, render: (_v, row) => <span className={styles.num}>{formatMoney(row.aplicado)}</span> },
    {
      key: 'sin_aplicar',
      label: 'Sin usar',
      searchable: false,
      render: (_v, row) => <span className={`${styles.num} ${row.sin_aplicar > 0 ? styles.sinAplicar : ''}`}>{formatMoney(row.sin_aplicar)}</span>,
    },
  ];

  return (
    <div className={styles.panel}>
      {cuenta && (
        <p className={styles.totales}>
          Cargado {formatMoney(cuenta.total_cargos)} · Abonado {formatMoney(cuenta.total_abonos)}
        </p>
      )}

      <section className={styles.seccion} aria-labelledby="cuenta-cargos">
        <div className={styles.seccionCabecera}>
          <h3 id="cuenta-cargos" className={styles.seccionTitulo}>Cargos</h3>
          <div className={styles.acciones}>
            <label className={styles.mostrarAnulados}>
              <input type="checkbox" checked={verAnulados} onChange={(e) => onVerAnulados(e.target.checked)} />
              Mostrar anulados
            </label>
            <AdminButton size="sm" icon={<Plus size={14} strokeWidth={2} />} onClick={onNuevoCargo}>Nuevo cargo</AdminButton>
          </div>
        </div>
        <DataTable<CargoRow>
          columns={cargosColumns}
          data={(cuenta?.cargos ?? []) as CargoRow[]}
          loading={loading && !cuenta}
          getRowKey={(r) => r.id}
          defaultSort={{ key: 'fecha_hecho', dir: 'desc' }}
          emptyMessage="Este cliente no tiene cargos"
          hideSearch
        />
      </section>

      <section className={styles.seccion} aria-labelledby="cuenta-abonos">
        <div className={styles.seccionCabecera}>
          <h3 id="cuenta-abonos" className={styles.seccionTitulo}>Abonos</h3>
        </div>
        <DataTable<AbonoRow>
          columns={abonosColumns}
          data={(cuenta?.abonos ?? []) as AbonoRow[]}
          loading={loading && !cuenta}
          getRowKey={(r) => r.codigo_pago}
          defaultSort={{ key: 'fecha_hecho', dir: 'desc' }}
          emptyMessage="Este cliente no tiene abonos"
          hideSearch
        />
      </section>
    </div>
  );
}
