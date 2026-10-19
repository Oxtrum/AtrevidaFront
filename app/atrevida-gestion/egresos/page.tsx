'use client';

import { useMemo, useState } from 'react';
import { ArrowLeftRight, Ban, CalendarClock, CheckCircle2, Pencil, Plus, TrendingDown, TrendingUp } from 'lucide-react';
import {
  AdminButton,
  AdminPageShell,
  ConfirmDialog,
  DataTable,
  FilterBar,
  MonthPicker,
  PageHeader,
  ReasonDialog,
  RowActionsMenu,
  StatCard,
  StatGrid,
  StatusBadge,
} from '@/components/AdminConfig';
import type { BadgeTone, Column } from '@/components/AdminConfig';
import { CustomSelect } from '@/components/Custom/CustomSelectAdmin';
import { LocalSelect } from '@/components/AdminConfig';
import { MovimientoFormModal } from '@/components/AdminFinanzas/MovimientoFormModal';
import { toast } from '@/components/Shared/Toast';
import {
  cambiarEstadoMovimientoFinanciero,
  generarGastosFijos,
  getCategoriasFinancieras,
  getGastosFijosPendientes,
  getMovimientosFinancieros,
} from '@/lib/api/finanzas';
import { getReporteFinancieroDB } from '@/lib/api/reportes';
import { useAsyncData } from '@/lib/hooks/useAsyncData';
import { useLocales } from '@/lib/hooks/useLocales';
import { useConfiguracion } from '@/lib/hooks/useConfiguracion';
import { formatMes } from '@/components/AdminConfig';
import { formatDateISO, formatMoney, monthRange, todayISO } from '@/lib/utils/format';
import type { CategoriaFinanciera, EstadoMovimiento, MovimientoFinanciero, NaturalezaFinanciera } from '@/types/finanzas';
import styles from './page.module.css';

type Row = MovimientoFinanciero & Record<string, unknown>;
type Vista = NaturalezaFinanciera;
const EMPTY: MovimientoFinanciero[] = [];
const EMPTY_CATS: CategoriaFinanciera[] = [];
const ESTADO_TONE: Record<EstadoMovimiento, BadgeTone> = { PAGADO: 'success', PENDIENTE: 'warning', ANULADO: 'danger' };

// Egresos e ingresos manuales: solo admin_sys (§7).
const ROLES = ['admin_sys'];

export default function EgresosPage() {
  const { moneda } = useConfiguracion();
  const [month, setMonth] = useState(todayISO().slice(0, 7));
  const [clase, setClase] = useState('');
  const [estado, setEstado] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [localId, setLocalId] = useState('');
  const [vista, setVista] = useState<Vista>('EGRESO');
  const soloIngresos = vista === 'INGRESO';

  const params = useMemo(() => {
    const { desde, hasta } = monthRange(month);
    return {
      fecha_desde: desde,
      fecha_hasta: hasta,
      naturaleza: vista,
      clase: (clase || undefined) as 'FIJO' | 'VARIABLE' | undefined,
      estado: (estado || undefined) as EstadoMovimiento | undefined,
      categoria_id: categoriaId ? Number(categoriaId) : undefined,
      local_id: localId ? Number(localId) : undefined,
    };
  }, [month, clase, estado, categoriaId, localId, vista]);

  const { data, loading, error, reload } = useAsyncData(() => getMovimientosFinancieros(params), JSON.stringify(params));
  const { data: cats } = useAsyncData(getCategoriasFinancieras, 'cats-fin');
  const categorias = cats ?? EMPTY_CATS;
  const rows = data ?? EMPTY;

  const [formOpen, setFormOpen] = useState(false);
  const [formNat, setFormNat] = useState<NaturalezaFinanciera>('EGRESO');
  const [editing, setEditing] = useState<MovimientoFinanciero | null>(null);
  const [anulando, setAnulando] = useState<MovimientoFinanciero | null>(null);
  const [generating, setGenerating] = useState(false);
  const [confirmandoGenerar, setConfirmandoGenerar] = useState(false);
  const { data: pendientesData, reload: recargarPendientes } = useAsyncData(getGastosFijosPendientes, 'gf-pendientes');
  const pendientes = pendientesData ?? [];

  // Los totales salen del reporte financiero del mes: ingresos = ventas (caja) + otros ingresos;
  // egresos = fijos + variables + compras de inventario. La tabla de abajo solo lista movimientos
  // manuales y generados; las ventas viven en Pagos, por eso no se pueden sumar desde las filas.
  const { locales } = useLocales();
  const localNombre = locales.find((l) => String(l.id) === localId)?.nombre ?? '';
  const { desde: mesDesde, hasta: mesHasta } = monthRange(month);
  const { data: reporte, loading: loadingReporte, reload: recargarReporte } = useAsyncData(
    () => getReporteFinancieroDB({ fecha_desde: mesDesde, fecha_hasta: mesHasta, local: localNombre || undefined, agrupar: 'mes' }),
    `rep|${month}|${localNombre}`,
  );
  const resumen = reporte?.resumen;

  const openForm = (nat: NaturalezaFinanciera, mov: MovimientoFinanciero | null) => {
    setFormNat(nat);
    setEditing(mov);
    setFormOpen(true);
  };

  const marcarPagado = async (row: MovimientoFinanciero) => {
    try {
      await cambiarEstadoMovimientoFinanciero(row.id, 'PAGADO');
      toast.success(`${row.codigo} marcado como pagado`);
      await Promise.all([reload(), recargarReporte()]);
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
      await Promise.all([reload(), recargarReporte(), recargarPendientes()]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudieron generar los gastos fijos');
    } finally {
      setGenerating(false);
    }
  };

  const columns: Column<Row>[] = [
    { key: 'fecha', label: 'Fecha', searchable: false, render: (v) => formatDateISO(v as string) },
    { key: 'codigo', label: 'Código' },
    {
      key: 'naturaleza',
      label: 'Tipo',
      searchable: false,
      render: (v) => <StatusBadge tone={v === 'INGRESO' ? 'success' : 'danger'}>{v === 'INGRESO' ? 'Ingreso' : 'Egreso'}</StatusBadge>,
    },
    { key: 'categoria_nombre', label: 'Categoría' },
    {
      key: 'clase',
      label: 'Clase',
      searchable: false,
      render: (v) => (v ? <StatusBadge tone={v === 'FIJO' ? 'info' : 'neutral'}>{String(v)}</StatusBadge> : '—'),
    },
    { key: 'descripcion', label: 'Detalle', render: (_v, r) => r.descripcion || r.proveedor || '—' },
    { key: 'local_nombre', label: 'Local', render: (v) => (v as string) || <span className={styles.muted}>General</span> },
    { key: 'monto', label: 'Monto', searchable: false, render: (v, r) => (
        <span className={`${styles.num} ${r.naturaleza === 'INGRESO' ? styles.ingreso : ''}`}>
          {r.naturaleza === 'INGRESO' ? '+' : '−'} {formatMoney(v as number, moneda)}
        </span>
      ),
    },
    {
      key: 'estado',
      label: 'Estado',
      searchable: false,
      render: (_v, r) => (
        <StatusBadge tone={ESTADO_TONE[r.estado]} title={r.motivo_anulacion ?? undefined}>{r.estado}</StatusBadge>
      ),
    },
    {
      key: 'acciones',
      label: '',
      searchable: false,
      render: (_v, row) =>
        row.estado === 'ANULADO' ? null : (
          <RowActionsMenu
            actions={[
              ...(row.estado === 'PENDIENTE' ? [{ label: row.naturaleza === 'EGRESO' ? 'Marcar pagado' : 'Marcar cobrado', icon: <CheckCircle2 size={12} strokeWidth={2} />, onClick: () => marcarPagado(row) }] : []),
              { label: row.clase === 'FIJO' ? 'Editar monto de este mes' : 'Editar', icon: <Pencil size={12} strokeWidth={2} />, onClick: () => openForm(row.naturaleza, row) },
              ...(row.compra_id ? [] : [{ label: 'Anular', icon: <Ban size={12} strokeWidth={2} />, onClick: () => setAnulando(row), variant: 'danger' as const }]),
            ]}
          />
        ),
    },
  ];

  return (
    <AdminPageShell roles={ROLES}>
      <PageHeader
        kicker="Trastienda"
        kickerIcon={<TrendingDown size={14} strokeWidth={2} />}
        title="Egresos"
        accentWord="Egresos"
        subtitle="Gastos fijos y variables, compras de inventario y otros ingresos que se registran aquí. Las ventas se cobran en Cobros; para ver todo el dinero junto, ve a Finanzas."
        actions={
          <>
            <AdminButton variant="secondary" href="/atrevida-gestion/finanzas" icon={<ArrowLeftRight size={16} strokeWidth={2} />}>
              Ver todo en Finanzas
            </AdminButton>
            <AdminButton
              variant="secondary"
              onClick={() => setConfirmandoGenerar(true)}
              disabled={pendientes.length === 0}
              icon={<CalendarClock size={16} strokeWidth={2} />}
              title={pendientes.length === 0 ? 'Todos los gastos fijos vencidos ya están registrados' : 'Ver y registrar los gastos fijos vencidos que faltan'}
            >
              {pendientes.length === 0 ? 'Gastos fijos al día' : `Registrar gastos fijos vencidos (${pendientes.length})`}
            </AdminButton>
            <AdminButton variant="secondary" onClick={() => openForm('INGRESO', null)}>
              <TrendingUp size={16} strokeWidth={2} />
              Otro ingreso
            </AdminButton>
            <AdminButton variant="primary" onClick={() => openForm('EGRESO', null)}>
              <Plus size={18} strokeWidth={2} />
              Registrar egreso
            </AdminButton>
          </>
        }
      />

      <div className={styles.stack}>
        <StatGrid>
          {soloIngresos ? (
            <>
              <StatCard label="Otros ingresos cobrados" value={formatMoney(resumen?.ingresos_otros ?? 0, moneda)} sublabel="No incluye ventas (ver Finanzas)" loading={loadingReporte} accentColor="#10b981" />
            </>
          ) : (
            <>
              <StatCard label="Egresos pagados" value={formatMoney(resumen?.egresos_total ?? 0, moneda)} sublabel="Fijos, variables y compras" loading={loadingReporte} accentColor="#ec008c" />
              <StatCard label="Fijos" value={formatMoney(resumen?.egresos_fijos ?? 0, moneda)} loading={loadingReporte} accentColor="#14aeef" />
              <StatCard label="Variables y compras" value={formatMoney(resumen?.egresos_variables ?? 0, moneda)} loading={loadingReporte} accentColor="#92278f" />
              <StatCard label="Egresos pendientes" value={formatMoney(resumen?.egresos_pendientes ?? 0, moneda)} sublabel="No entran en la utilidad" loading={loadingReporte} accentColor="#f59e0b" />
            </>
          )}
        </StatGrid>

        <div className={styles.toolbar}>
          <FilterBar>
            <FilterBar.Item label="Mes">
              <MonthPicker value={month} onChange={setMonth} />
            </FilterBar.Item>
            <FilterBar.Item label="Ver">
              <CustomSelect
                value={vista}
                onChange={(v) => { setVista(v as Vista); setClase(''); setCategoriaId(''); }}
                options={[
                  { value: 'EGRESO', label: 'Egresos' },
                  { value: 'INGRESO', label: 'Otros ingresos' },
                ]}
                searchable={false}
              />
            </FilterBar.Item>
            {!soloIngresos && (
              <FilterBar.Item label="Clase">
                <CustomSelect value={clase} onChange={setClase} options={[{ value: 'FIJO', label: 'Fijos' }, { value: 'VARIABLE', label: 'Variables' }]} placeholder="Todas" allowClear searchable={false} />
              </FilterBar.Item>
            )}
            <FilterBar.Item label="Estado">
              <CustomSelect value={estado} onChange={setEstado} options={[{ value: 'PAGADO', label: 'Pagado' }, { value: 'PENDIENTE', label: 'Pendiente' }, { value: 'ANULADO', label: 'Anulado' }]} placeholder="Todos" allowClear searchable={false} />
            </FilterBar.Item>
            <FilterBar.Item label="Categoría">
              <CustomSelect
                value={categoriaId}
                onChange={setCategoriaId}
                options={categorias.filter((c) => c.naturaleza === vista).map((c) => ({ value: String(c.id), label: c.nombre }))}
                placeholder="Todas"
                allowClear
                searchable={false}
              />
            </FilterBar.Item>
            <FilterBar.Item label="Local">
              <LocalSelect value={localId} onChange={setLocalId} emptyLabel="Todos" />
            </FilterBar.Item>
          </FilterBar>
        </div>

        <DataTable<Row>
          columns={columns}
          data={rows as Row[]}
          loading={loading}
          error={error}
          onRefresh={reload}
          getRowKey={(r) => r.id}
          searchPlaceholder="Buscar por código, categoría o detalle…"
          emptyMessage={soloIngresos ? 'No hay otros ingresos en este mes' : 'No hay egresos en este mes'}
        />
      </div>

      <MovimientoFormModal isOpen={formOpen} naturaleza={formNat} movimiento={editing} categorias={categorias} onClose={() => setFormOpen(false)} onSaved={() => { void reload(); void recargarReporte(); }} />

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
          await Promise.all([reload(), recargarReporte()]);
        }}
        onClose={() => setAnulando(null)}
      />
    </AdminPageShell>
  );
}
