'use client';

import { useMemo, useState } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import {
  AdminPageShell,
  AlertBanner,
  DataTable,
  FilterBar,
  LocalSelect,
  MonthPicker,
  PageHeader,
  SectionLabel,
  StatCard,
  StatGrid,
  StatusBadge,
  Tabs,
} from '@/components/AdminConfig';
import type { BadgeTone, Column, TabItem } from '@/components/AdminConfig';
import { CustomSelect } from '@/components/Custom/CustomSelectAdmin';
import { getFlujoFinanciero } from '@/lib/api/finanzas';
import { useAsyncData } from '@/lib/hooks/useAsyncData';
import { useConfiguracion } from '@/lib/hooks/useConfiguracion';
import { useLocales } from '@/lib/hooks/useLocales';
import { formatDateISO, formatMoney, monthRange, todayISO } from '@/lib/utils/format';
import type { FlujoLocal, FlujoMovimiento, FlujoOrigen } from '@/types/finanzas';
import styles from './page.module.css';

type Row = FlujoMovimiento & Record<string, unknown>;
type LocalRow = FlujoLocal & Record<string, unknown>;
type EstadoTab = '' | 'PAGADO' | 'PENDIENTE' | 'ANULADO';

// Libro financiero completo: solo admin_sys, igual que Egresos.
const ROLES = ['admin_sys'];

const ORIGEN_LABEL: Record<FlujoOrigen, string> = {
  VENTA: 'Venta',
  COMPRA: 'Compra de inventario',
  GASTO_FIJO: 'Gasto fijo',
  GASTO_VARIABLE: 'Gasto variable',
  OTRO_INGRESO: 'Otro ingreso',
};
const ORIGEN_TONE: Record<FlujoOrigen, BadgeTone> = {
  VENTA: 'success',
  OTRO_INGRESO: 'success',
  COMPRA: 'warning',
  GASTO_FIJO: 'info',
  GASTO_VARIABLE: 'neutral',
};
const ESTADO_TONE: Record<string, BadgeTone> = { PAGADO: 'success', PENDIENTE: 'warning', ANULADO: 'danger' };
const EMPTY: FlujoMovimiento[] = [];
const EMPTY_LOCALES: FlujoLocal[] = [];

export default function FinanzasPage() {
  const { moneda } = useConfiguracion();
  const { locales } = useLocales();
  const [month, setMonth] = useState(todayISO().slice(0, 7));
  const [localId, setLocalId] = useState('');
  const [origen, setOrigen] = useState('');
  const [estadoTab, setEstadoTab] = useState<EstadoTab>('');
  const [q, setQ] = useState('');

  const params = useMemo(() => {
    const { desde, hasta } = monthRange(month);
    return {
      fecha_desde: desde,
      fecha_hasta: hasta,
      local_id: localId ? Number(localId) : undefined,
      origen: (origen || undefined) as FlujoOrigen | undefined,
      estado: estadoTab || undefined,
      q: q.trim() || undefined,
      limit: 500,
    };
  }, [month, localId, origen, estadoTab, q]);

  const { data, loading, error, reload } = useAsyncData(() => getFlujoFinanciero(params), JSON.stringify(params));
  const movimientos = data?.movimientos ?? EMPTY;
  const porLocal = data?.por_local ?? EMPTY_LOCALES;
  const totales = data?.totales;
  const money = (v: number) => formatMoney(v, moneda);

  const tabs: TabItem<EstadoTab>[] = [
    { key: '', label: 'Todos' },
    { key: 'PAGADO', label: 'Cobrados y pagados' },
    { key: 'PENDIENTE', label: 'Pendientes' },
    { key: 'ANULADO', label: 'Anulados' },
  ];

  const columns: Column<Row>[] = [
    { key: 'fecha', label: 'Fecha', searchable: false, render: (v) => formatDateISO(v as string) },
    {
      key: 'origen',
      label: 'Origen',
      searchable: false,
      render: (v) => <StatusBadge tone={ORIGEN_TONE[v as FlujoOrigen]}>{ORIGEN_LABEL[v as FlujoOrigen]}</StatusBadge>,
    },
    { key: 'codigo', label: 'Código' },
    { key: 'detalle', label: 'Detalle', render: (_v, r) => (
      <span>
        {r.detalle || '—'}
        <small className={styles.sub}>{r.categoria}</small>
      </span>
    ) },
    { key: 'local_nombre', label: 'Local', render: (v) => (v as string) || <span className={styles.muted}>General</span> },
    {
      key: 'entrada',
      label: 'Entrada',
      searchable: false,
      render: (_v, r) => (r.naturaleza === 'INGRESO' ? <span className={`${styles.num} ${styles.entrada} ${r.estado !== 'PAGADO' ? styles.inactivo : ''}`}>{money(r.monto)}</span> : ''),
    },
    {
      key: 'salida',
      label: 'Salida',
      searchable: false,
      render: (_v, r) => (r.naturaleza === 'EGRESO' ? <span className={`${styles.num} ${styles.salida} ${r.estado !== 'PAGADO' ? styles.inactivo : ''}`}>{money(r.monto)}</span> : ''),
    },
    {
      key: 'estado',
      label: 'Estado',
      searchable: false,
      render: (v) => <StatusBadge tone={ESTADO_TONE[v as string] ?? 'neutral'}>{String(v)}</StatusBadge>,
    },
    {
      key: 'saldo',
      label: 'Saldo',
      searchable: false,
      render: (v) => <span className={`${styles.num} ${(v as number) < 0 ? styles.salida : ''}`}>{money(v as number)}</span>,
    },
  ];

  const localColumns: Column<LocalRow>[] = [
    { key: 'local', label: 'Sucursal' },
    { key: 'ingresos', label: 'Ingresos cobrados', searchable: false, render: (v) => <span className={`${styles.num} ${styles.entrada}`}>{money(v as number)}</span> },
    { key: 'egresos', label: 'Egresos pagados', searchable: false, render: (v) => <span className={`${styles.num} ${styles.salida}`}>{money(v as number)}</span> },
    { key: 'balance', label: 'Balance', searchable: false, render: (v) => <span className={`${styles.num} ${(v as number) < 0 ? styles.salida : ''}`}>{money(v as number)}</span> },
  ];

  const nombreLocal = locales.find((l) => String(l.id) === localId)?.nombre;

  return (
    <AdminPageShell roles={ROLES}>
      <PageHeader
        kicker="Trastienda"
        kickerIcon={<ArrowLeftRight size={14} strokeWidth={2} />}
        title="Finanzas"
        accentWord="Finanzas"
        subtitle="Todo el dinero que entra y sale: ventas, cobros, compras y gastos, con saldo por movimiento"
      />

      <div className={styles.stack}>
        <StatGrid>
          <StatCard label="Ingresos cobrados" value={money(totales?.ingresos ?? 0)} sublabel="Ventas y otros ingresos" loading={loading} accentColor="#22c55e" />
          <StatCard label="Egresos pagados" value={money(totales?.egresos ?? 0)} sublabel="Gastos fijos, variables y compras" loading={loading} accentColor="#ec008c" />
          <StatCard label="Balance" value={money(totales?.balance ?? 0)} sublabel={nombreLocal ? nombreLocal : 'Todas las sucursales'} loading={loading} accentColor="#14aeef" />
          <StatCard
            label="Pendientes"
            value={`${money(totales?.por_cobrar ?? 0)} / ${money(totales?.por_pagar ?? 0)}`}
            sublabel="Por cobrar / por pagar · no entran al balance"
            loading={loading}
            accentColor="#f59e0b"
          />
        </StatGrid>

        <FilterBar>
          <FilterBar.Item label="Mes">
            <MonthPicker value={month} onChange={setMonth} />
          </FilterBar.Item>
          <FilterBar.Item label="Sucursal">
            <LocalSelect value={localId} onChange={setLocalId} emptyLabel="Todas" />
          </FilterBar.Item>
          <FilterBar.Item label="Origen">
            <CustomSelect
              value={origen}
              onChange={setOrigen}
              options={(Object.keys(ORIGEN_LABEL) as FlujoOrigen[]).map((o) => ({ value: o, label: ORIGEN_LABEL[o] }))}
              placeholder="Todos"
              allowClear
              searchable={false}
            />
          </FilterBar.Item>
          <FilterBar.Item label="Buscar" grow>
            <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Código, detalle, categoría o local…" />
          </FilterBar.Item>
        </FilterBar>

        {porLocal.length > 1 && (
          <section className={styles.block}>
            <SectionLabel>Comparativa por sucursal</SectionLabel>
            <DataTable<LocalRow>
              columns={localColumns}
              data={porLocal as LocalRow[]}
              loading={loading}
              getRowKey={(r) => r.local_id}
              hideSearch
              emptyMessage="Sin movimientos"
            />
          </section>
        )}

        <section className={styles.block}>
          <SectionLabel>Movimientos</SectionLabel>
          <Tabs tabs={tabs} active={estadoTab} onChange={setEstadoTab} ariaLabel="Estado de los movimientos" />
          {data?.truncado && (
            <AlertBanner tone="warning" title="Se muestran los 500 movimientos más recientes">
              Acota el mes, la sucursal o el origen para ver el resto. Los totales de arriba sí incluyen todos.
            </AlertBanner>
          )}
          <DataTable<Row>
            columns={columns}
            data={movimientos as Row[]}
            loading={loading}
            error={error}
            onRefresh={reload}
            getRowKey={(r) => r.clave}
            hideSearch
            emptyMessage="No hay movimientos con estos filtros"
          />
          <p className={styles.note}>
            El saldo acumula solo lo cobrado y pagado del periodo filtrado; los pendientes y anulados se muestran atenuados y no suman.
            Las ventas vienen de Caja y Pagos; las compras de inventario ya aparecen como egreso.
          </p>
        </section>
      </div>
    </AdminPageShell>
  );
}
