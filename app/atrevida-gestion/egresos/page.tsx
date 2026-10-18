'use client';

import { useMemo, useState } from 'react';
import { Ban, CheckCircle2, Pencil, Plus, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
import {
  AdminButton,
  AdminPageShell,
  DataTable,
  FilterBar,
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
  getMovimientosFinancieros,
} from '@/lib/api/finanzas';
import { useAsyncData } from '@/lib/hooks/useAsyncData';
import { useConfiguracion } from '@/lib/hooks/useConfiguracion';
import { formatDateISO, formatMoney, monthRange, todayISO } from '@/lib/utils/format';
import type { CategoriaFinanciera, EstadoMovimiento, MovimientoFinanciero, NaturalezaFinanciera } from '@/types/finanzas';
import styles from './page.module.css';

type Row = MovimientoFinanciero & Record<string, unknown>;
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
  const [verIngresos, setVerIngresos] = useState(false);

  const params = useMemo(() => {
    const { desde, hasta } = monthRange(month);
    return {
      fecha_desde: desde,
      fecha_hasta: hasta,
      naturaleza: (verIngresos ? 'INGRESO' : 'EGRESO') as NaturalezaFinanciera,
      clase: (clase || undefined) as 'FIJO' | 'VARIABLE' | undefined,
      estado: (estado || undefined) as EstadoMovimiento | undefined,
      categoria_id: categoriaId ? Number(categoriaId) : undefined,
      local_id: localId ? Number(localId) : undefined,
    };
  }, [month, clase, estado, categoriaId, localId, verIngresos]);

  const { data, loading, error, reload } = useAsyncData(() => getMovimientosFinancieros(params), JSON.stringify(params));
  const { data: cats } = useAsyncData(getCategoriasFinancieras, 'cats-fin');
  const categorias = cats ?? EMPTY_CATS;
  const rows = data ?? EMPTY;

  const [formOpen, setFormOpen] = useState(false);
  const [formNat, setFormNat] = useState<NaturalezaFinanciera>('EGRESO');
  const [editing, setEditing] = useState<MovimientoFinanciero | null>(null);
  const [anulando, setAnulando] = useState<MovimientoFinanciero | null>(null);
  const [generating, setGenerating] = useState(false);

  const stats = useMemo(() => {
    const active = rows.filter((r) => r.estado !== 'ANULADO');
    const sum = (f: (r: MovimientoFinanciero) => boolean) => active.filter(f).reduce((a, r) => a + r.monto, 0);
    return {
      total: sum((r) => r.estado === 'PAGADO'),
      fijos: sum((r) => r.clase === 'FIJO' && r.estado === 'PAGADO'),
      variables: sum((r) => r.clase === 'VARIABLE' && r.estado === 'PAGADO'),
      pendientes: sum((r) => r.estado === 'PENDIENTE'),
    };
  }, [rows]);

  const openForm = (nat: NaturalezaFinanciera, mov: MovimientoFinanciero | null) => {
    setFormNat(nat);
    setEditing(mov);
    setFormOpen(true);
  };

  const marcarPagado = async (row: MovimientoFinanciero) => {
    try {
      await cambiarEstadoMovimientoFinanciero(row.id, 'PAGADO');
      toast.success(`${row.codigo} marcado como pagado`);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo actualizar el estado');
    }
  };

  const handleGenerar = async () => {
    setGenerating(true);
    try {
      await generarGastosFijos();
      toast.success('Gastos fijos al día');
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudieron generar los gastos fijos');
    } finally {
      setGenerating(false);
    }
  };

  const columns: Column<Row>[] = [
    { key: 'fecha', label: 'Fecha', searchable: false, render: (v) => formatDateISO(v as string) },
    { key: 'codigo', label: 'Código' },
    { key: 'categoria_nombre', label: 'Categoría' },
    {
      key: 'clase',
      label: 'Clase',
      searchable: false,
      render: (v) => (v ? <StatusBadge tone={v === 'FIJO' ? 'info' : 'neutral'}>{String(v)}</StatusBadge> : '—'),
    },
    { key: 'descripcion', label: 'Detalle', render: (_v, r) => r.descripcion || r.proveedor || '—' },
    { key: 'local_nombre', label: 'Local', render: (v) => (v as string) || <span className={styles.muted}>General</span> },
    { key: 'monto', label: 'Monto', searchable: false, render: (v) => <span className={styles.num}>{formatMoney(v as number, moneda)}</span> },
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
        title="Egresos e Ingresos"
        accentWord="Egresos"
        subtitle="Gastos fijos y variables, compras y otros ingresos del mes"
        actions={
          <>
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
          <StatCard label={verIngresos ? 'Ingresos cobrados' : 'Egresos pagados'} value={formatMoney(stats.total, moneda)} loading={loading} accentColor="#ec008c" />
          {!verIngresos && <StatCard label="Fijos" value={formatMoney(stats.fijos, moneda)} loading={loading} accentColor="#14aeef" />}
          {!verIngresos && <StatCard label="Variables" value={formatMoney(stats.variables, moneda)} loading={loading} accentColor="#92278f" />}
          <StatCard label="Pendientes" value={formatMoney(stats.pendientes, moneda)} sublabel="No entran en la utilidad" loading={loading} accentColor="#f59e0b" />
        </StatGrid>

        <div className={styles.toolbar}>
          <FilterBar>
            <FilterBar.Item label="Mes">
              <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
            </FilterBar.Item>
            <FilterBar.Item label="Ver">
              <CustomSelect
                value={verIngresos ? 'INGRESO' : 'EGRESO'}
                onChange={(v) => { setVerIngresos(v === 'INGRESO'); setClase(''); setCategoriaId(''); }}
                options={[{ value: 'EGRESO', label: 'Egresos' }, { value: 'INGRESO', label: 'Otros ingresos' }]}
                searchable={false}
              />
            </FilterBar.Item>
            {!verIngresos && (
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
                options={categorias.filter((c) => c.naturaleza === (verIngresos ? 'INGRESO' : 'EGRESO')).map((c) => ({ value: String(c.id), label: c.nombre }))}
                placeholder="Todas"
                allowClear
                searchable={false}
              />
            </FilterBar.Item>
            <FilterBar.Item label="Local">
              <LocalSelect value={localId} onChange={setLocalId} emptyLabel="Todos" />
            </FilterBar.Item>
          </FilterBar>
          <AdminButton variant="secondary" onClick={handleGenerar} disabled={generating} title="Genera los gastos fijos que ya vencieron (idempotente)">
            <RefreshCw size={15} strokeWidth={2} className={generating ? styles.spin : ''} />
            Generar gastos fijos
          </AdminButton>
        </div>

        <DataTable<Row>
          columns={columns}
          data={rows as Row[]}
          loading={loading}
          error={error}
          onRefresh={reload}
          getRowKey={(r) => r.id}
          searchPlaceholder="Buscar por código, categoría o detalle…"
          emptyMessage={verIngresos ? 'No hay otros ingresos en este mes' : 'No hay egresos en este mes'}
        />
      </div>

      <MovimientoFormModal isOpen={formOpen} naturaleza={formNat} movimiento={editing} categorias={categorias} onClose={() => setFormOpen(false)} onSaved={reload} />

      <ReasonDialog
        isOpen={anulando !== null}
        title={`Anular ${anulando?.codigo ?? ''}`}
        message="El movimiento deja de contar en reportes. No se borra: queda en el historial con el motivo."
        confirmLabel="Anular"
        onConfirm={async (motivo) => {
          await cambiarEstadoMovimientoFinanciero(anulando!.id, 'ANULADO', motivo);
          toast.success('Movimiento anulado');
          await reload();
        }}
        onClose={() => setAnulando(null)}
      />
    </AdminPageShell>
  );
}
