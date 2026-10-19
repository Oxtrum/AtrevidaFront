'use client';

import { useMemo, useState } from 'react';
import { ArrowLeftRight, Ban, CalendarClock, CheckCircle2, Pencil, Plus, TrendingUp } from 'lucide-react';
import {
  AdminButton,
  AdminPageShell,
  AlertBanner,
  ConfirmDialog,
  DataTable,
  FilterBar,
  LocalSelect,
  MonthPicker,
  PageHeader,
  ReasonDialog,
  RowActionsMenu,
  SectionLabel,
  StatCard,
  StatGrid,
  StatusBadge,
  Tabs,
  formatMes,
} from '@/components/AdminConfig';
import type { BadgeTone, Column, TabItem } from '@/components/AdminConfig';
import { CustomSelect } from '@/components/Custom/CustomSelectAdmin';
import { MovimientoFormModal } from '@/components/AdminFinanzas/MovimientoFormModal';
import { toast } from '@/components/Shared/Toast';
import {
  cambiarEstadoMovimientoFinanciero,
  generarGastosFijos,
  getCategoriasFinancieras,
  getFlujoFinanciero,
  getGastosFijosPendientes,
  getMovimientosFinancieros,
} from '@/lib/api/finanzas';
import { useAsyncData } from '@/lib/hooks/useAsyncData';
import { useConfiguracion } from '@/lib/hooks/useConfiguracion';
import { useLocales } from '@/lib/hooks/useLocales';
import { formatDateISO, formatMoney, monthRange, todayISO } from '@/lib/utils/format';
import type {
  CategoriaFinanciera,
  FlujoLocal,
  FlujoMovimiento,
  FlujoOrigen,
  MovimientoFinanciero,
  NaturalezaFinanciera,
} from '@/types/finanzas';
import styles from './page.module.css';

type Row = FlujoMovimiento & Record<string, unknown>;
type LocalRow = FlujoLocal & Record<string, unknown>;
type EstadoTab = '' | 'PAGADO' | 'PENDIENTE' | 'ANULADO';

// Libro financiero completo y registro de egresos: solo admin_sys.
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
const EMPTY_MOVS: MovimientoFinanciero[] = [];
const EMPTY_CATS: CategoriaFinanciera[] = [];

export default function FinanzasPage() {
  const { moneda } = useConfiguracion();
  const { locales } = useLocales();
  const [month, setMonth] = useState(todayISO().slice(0, 7));
  const [localId, setLocalId] = useState('');
  const [origen, setOrigen] = useState('');
  const [estadoTab, setEstadoTab] = useState<EstadoTab>('');
  const [q, setQ] = useState('');

  const { desde, hasta } = monthRange(month);
  const params = useMemo(() => ({
    fecha_desde: desde,
    fecha_hasta: hasta,
    local_id: localId ? Number(localId) : undefined,
    origen: (origen || undefined) as FlujoOrigen | undefined,
    estado: estadoTab || undefined,
    q: q.trim() || undefined,
    limit: 500,
  }), [desde, hasta, localId, origen, estadoTab, q]);

  const { data, loading, error, reload } = useAsyncData(() => getFlujoFinanciero(params), JSON.stringify(params));
  const movimientos = data?.movimientos ?? EMPTY;
  const porLocal = data?.por_local ?? EMPTY_LOCALES;
  const totales = data?.totales;
  const money = (v: number) => formatMoney(v, moneda);

  // Los movimientos manuales se editan con su registro completo; el libro solo trae lo necesario para mostrarlos.
  const { data: movsData, reload: recargarMovs } = useAsyncData(
    () => getMovimientosFinancieros({ fecha_desde: desde, fecha_hasta: hasta, local_id: localId ? Number(localId) : undefined }),
    `movs|${month}|${localId}`,
  );
  const movsPorId = useMemo(() => new Map((movsData ?? EMPTY_MOVS).map((m) => [m.id, m])), [movsData]);
  const { data: cats } = useAsyncData(getCategoriasFinancieras, 'cats-fin');
  const categorias = cats ?? EMPTY_CATS;

  const { data: pendientesData, reload: recargarPendientes } = useAsyncData(getGastosFijosPendientes, 'gf-pendientes');
  const pendientes = pendientesData ?? [];

  const [formOpen, setFormOpen] = useState(false);
  const [formNat, setFormNat] = useState<NaturalezaFinanciera>('EGRESO');
  const [editing, setEditing] = useState<MovimientoFinanciero | null>(null);
  const [anulando, setAnulando] = useState<MovimientoFinanciero | null>(null);
  const [confirmandoGenerar, setConfirmandoGenerar] = useState(false);
  const [generating, setGenerating] = useState(false);

  const recargarTodo = async () => {
    await Promise.all([reload(), recargarMovs(), recargarPendientes()]);
  };

  const openForm = (nat: NaturalezaFinanciera, mov: MovimientoFinanciero | null) => {
    setFormNat(nat);
    setEditing(mov);
    setFormOpen(true);
  };

  const marcarPagado = async (mov: MovimientoFinanciero) => {
    try {
      await cambiarEstadoMovimientoFinanciero(mov.id, 'PAGADO');
      toast.success(`${mov.codigo} marcado como ${mov.naturaleza === 'EGRESO' ? 'pagado' : 'cobrado'}`);
      await recargarTodo();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo actualizar el estado');
    }
  };

  const handleGenerar = async () => {
    setGenerating(true);
    try {
      await generarGastosFijos();
      toast.success(`${pendientes.length} gasto${pendientes.length === 1 ? '' : 's'} fijo${pendientes.length === 1 ? '' : 's'} registrado${pendientes.length === 1 ? '' : 's'}`);
      setConfirmandoGenerar(false);
      await recargarTodo();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudieron generar los gastos fijos');
    } finally {
      setGenerating(false);
    }
  };

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
    {
      key: 'detalle',
      label: 'Detalle',
      render: (_v, r) => (
        <span>
          {r.detalle || '—'}
          <small className={styles.sub}>{r.categoria}</small>
        </span>
      ),
    },
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
      render: (v, r) => <StatusBadge tone={ESTADO_TONE[v as string] ?? 'neutral'}>{r.naturaleza === 'INGRESO' && v === 'PAGADO' ? 'COBRADO' : String(v)}</StatusBadge>,
    },
    {
      key: 'saldo',
      label: 'Saldo',
      searchable: false,
      render: (v) => <span className={`${styles.num} ${(v as number) < 0 ? styles.salida : ''}`}>{money(v as number)}</span>,
    },
    {
      key: 'acciones',
      label: '',
      searchable: false,
      // Las ventas se gestionan en Cobros / Historial de Pagos; solo los movimientos manuales se editan aquí.
      render: (_v, r) => {
        if (r.origen === 'VENTA' || r.estado === 'ANULADO') return null;
        const mov = movsPorId.get(Number(r.clave.replace('mov-', '')));
        if (!mov) return null;
        return (
          <RowActionsMenu
            actions={[
              ...(mov.estado === 'PENDIENTE' ? [{ label: mov.naturaleza === 'EGRESO' ? 'Marcar pagado' : 'Marcar cobrado', icon: <CheckCircle2 size={12} strokeWidth={2} />, onClick: () => marcarPagado(mov) }] : []),
              { label: mov.clase === 'FIJO' ? 'Editar monto de este mes' : 'Editar', icon: <Pencil size={12} strokeWidth={2} />, onClick: () => openForm(mov.naturaleza, mov) },
              ...(mov.compra_id ? [] : [{ label: 'Anular', icon: <Ban size={12} strokeWidth={2} />, onClick: () => setAnulando(mov), variant: 'danger' as const }]),
            ]}
          />
        );
      },
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
        subtitle="Todo el dinero del negocio en un solo lugar: ventas, compras, gastos y otros ingresos, con saldo por movimiento. Registra egresos e ingresos desde aquí."
        actions={
          <>
            <AdminButton
              variant="secondary"
              onClick={() => setConfirmandoGenerar(true)}
              disabled={pendientes.length === 0}
              icon={<CalendarClock size={16} strokeWidth={2} />}
              title={pendientes.length === 0 ? 'Todos los gastos fijos vencidos ya están registrados' : 'Ver y registrar los gastos fijos vencidos que faltan'}
            >
              {pendientes.length === 0 ? 'Gastos fijos al día' : `Registrar gastos fijos vencidos (${pendientes.length})`}
            </AdminButton>
            <AdminButton variant="secondary" onClick={() => openForm('INGRESO', null)} icon={<TrendingUp size={16} strokeWidth={2} />}>
              Otro ingreso
            </AdminButton>
            <AdminButton onClick={() => openForm('EGRESO', null)} icon={<Plus size={18} strokeWidth={2} />}>
              Registrar egreso
            </AdminButton>
          </>
        }
      />

      <div className={styles.stack}>
        <StatGrid>
          <StatCard label="Ingresos cobrados" value={money(totales?.ingresos ?? 0)} sublabel="Ventas y otros ingresos" loading={loading} accentColor="#22c55e" />
          <StatCard label="Egresos pagados" value={money(totales?.egresos ?? 0)} sublabel="Gastos fijos, variables y compras" loading={loading} accentColor="#ec008c" />
          <StatCard label="Balance" value={money(totales?.balance ?? 0)} sublabel={nombreLocal ?? 'Todas las sucursales'} loading={loading} accentColor="#14aeef" />
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
            onRefresh={recargarTodo}
            getRowKey={(r) => r.clave}
            hideSearch
            emptyMessage="No hay movimientos con estos filtros"
          />
          <p className={styles.note}>
            El saldo acumula solo lo cobrado y pagado del periodo filtrado; los pendientes y anulados se muestran atenuados y no suman.
            Las ventas vienen de Cobros (ver Historial de Pagos) y no se editan aquí; las compras de inventario ya aparecen como egreso.
          </p>
        </section>
      </div>

      <MovimientoFormModal isOpen={formOpen} naturaleza={formNat} movimiento={editing} categorias={categorias} onClose={() => setFormOpen(false)} onSaved={() => { void recargarTodo(); }} />

      <ConfirmDialog
        isOpen={confirmandoGenerar}
        title="Registrar gastos fijos vencidos"
        confirmLabel={`Registrar ${pendientes.length} egreso${pendientes.length === 1 ? '' : 's'}`}
        loading={generating}
        onConfirm={handleGenerar}
        onClose={() => setConfirmandoGenerar(false)}
        message={
          <>
            <p style={{ margin: '0 0 0.75rem' }}>
              Estos gastos fijos ya vencieron y todavía no tienen su egreso. Se registrarán uno por mes, con el
              estado definido en Parámetros. Los que ya existen no se duplican.
            </p>
            <ul className={styles.pendList}>
              {pendientes.map((p) => (
                <li key={`${p.gasto_fijo_id}-${p.periodo}`}>
                  <span>
                    <strong>{p.nombre}</strong> · {formatMes(p.periodo)}
                    <small>{p.local_nombre || 'General'} · cobro {formatDateISO(p.fecha_cobro)}</small>
                  </span>
                  <span className={styles.num}>{formatMoney(p.monto, moneda)}</span>
                </li>
              ))}
            </ul>
          </>
        }
      />

      <ReasonDialog
        isOpen={anulando !== null}
        title={`Anular ${anulando?.codigo ?? ''}`}
        message="El movimiento deja de contar en reportes. No se borra: queda en el historial con el motivo."
        confirmLabel="Anular"
        onConfirm={async (motivo) => {
          await cambiarEstadoMovimientoFinanciero(anulando!.id, 'ANULADO', motivo);
          toast.success('Movimiento anulado');
          await recargarTodo();
        }}
        onClose={() => setAnulando(null)}
      />
    </AdminPageShell>
  );
}
