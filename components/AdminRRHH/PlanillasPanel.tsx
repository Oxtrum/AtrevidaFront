'use client';

import { useMemo, useState } from 'react';
import { Ban, CheckCircle2, Gift, Pencil, Plus } from 'lucide-react';
import {
  AdminButton,
  AlertBanner,
  ConfirmDialog,
  DataTable,
  FilterBar,
  LocalSelect,
  MonthPicker,
  ReasonDialog,
  RowActionsMenu,
  StatCard,
  StatGrid,
  StatusBadge,
  Tabs,
} from '@/components/AdminConfig';
import type { BadgeTone, Column, TabItem } from '@/components/AdminConfig';
import { toast } from '@/components/Shared/Toast';
import { anularPlanilla, generarAguinaldos, getPlanillas, pagarPlanilla } from '@/lib/api/rrhh';
import { useAsyncData } from '@/lib/hooks/useAsyncData';
import { useConfiguracion } from '@/lib/hooks/useConfiguracion';
import { formatDateISO, formatMoney } from '@/lib/utils/format';
import type { Empleado, EstadoPlanilla, Planilla } from '@/types/rrhh';
import { GenerarPlanillaModal } from './GenerarPlanillaModal';
import { PlanillaDesglose } from './PlanillaDesglose';
import { PlanillaEditModal } from './PlanillaEditModal';
import styles from './RRHHPanel.module.css';

type Row = Planilla & Record<string, unknown>;
type EstadoTab = '' | EstadoPlanilla;

const ESTADO_TONE: Record<EstadoPlanilla, BadgeTone> = { PAGADO: 'success', PENDIENTE: 'warning', ANULADO: 'danger' };
const EMPTY: Planilla[] = [];

interface PlanillasPanelProps {
  /** Mes YYYY-MM. */
  month: string;
  onMonthChange: (month: string) => void;
  empleados: Empleado[];
  /** Avisa a la página que cambió algo que afecta a otras pestañas (adelantos descontados, etc.). */
  onChanged: () => void;
}

/** Planillas de sueldo del mes: desglose, totales, edición de bonos/faltas, pago y anulación. */
export function PlanillasPanel({ month, onMonthChange, empleados, onChanged }: PlanillasPanelProps) {
  const { moneda } = useConfiguracion();
  const [localId, setLocalId] = useState('');
  const [estadoTab, setEstadoTab] = useState<EstadoTab>('');
  const money = (v: number) => formatMoney(v, moneda);

  const params = useMemo(
    () => ({ periodo: month, local_id: localId ? Number(localId) : undefined }),
    [month, localId],
  );
  const { data, loading, error, reload } = useAsyncData(() => getPlanillas(params), JSON.stringify(params));
  const planillas = data?.planillas ?? EMPTY;
  const resumen = data?.resumen;

  const visibles = useMemo(
    () => (estadoTab ? planillas.filter((p) => p.estado === estadoTab) : planillas),
    [planillas, estadoTab],
  );
  const tabs: TabItem<EstadoTab>[] = [
    { key: '', label: 'Todas', count: planillas.length },
    { key: 'PENDIENTE', label: 'Por pagar', count: planillas.filter((p) => p.estado === 'PENDIENTE').length },
    { key: 'PAGADO', label: 'Pagadas', count: planillas.filter((p) => p.estado === 'PAGADO').length },
    { key: 'ANULADO', label: 'Anuladas', count: planillas.filter((p) => p.estado === 'ANULADO').length },
  ];

  const [editing, setEditing] = useState<Planilla | null>(null);
  const [paying, setPaying] = useState<Planilla | null>(null);
  const [annulling, setAnnulling] = useState<Planilla | null>(null);
  const [generarOpen, setGenerarOpen] = useState(false);
  const [aguinaldoOpen, setAguinaldoOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const anioAguinaldo = Number(month.slice(0, 4));

  const refresh = async () => {
    await reload();
    onChanged();
  };

  const handlePay = async () => {
    if (!paying) return;
    setBusy(true);
    try {
      await pagarPlanilla(paying.id);
      toast.success('Planilla pagada');
      setPaying(null);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo pagar');
    } finally {
      setBusy(false);
    }
  };

  const handleAguinaldo = async () => {
    setBusy(true);
    try {
      const n = await generarAguinaldos(anioAguinaldo);
      toast.success(n > 0 ? `${n} aguinaldo(s) generado(s)` : 'Los aguinaldos ya estaban generados');
      setAguinaldoOpen(false);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudieron generar los aguinaldos');
    } finally {
      setBusy(false);
    }
  };

  const columns: Column<Row>[] = [
    {
      key: 'empleado_nombre',
      label: 'Empleado',
      render: (v, r) => (
        <span>
          <strong>{v as string}</strong>
          <span className={styles.sub}>
            {[r.tipo === 'AGUINALDO' ? 'Aguinaldo' : null, r.cargo, r.local_nombre].filter(Boolean).join(' · ') || 'Sueldo'}
          </span>
        </span>
      ),
    },
    { key: 'fecha_pago', label: 'Fecha de pago', searchable: false, render: (v) => formatDateISO(v as string) },
    { key: 'sueldo_base', label: 'Sueldo base', searchable: false, render: (v) => <span className={styles.num}>{money(v as number)}</span> },
    {
      key: 'bonos',
      label: 'Bonos',
      searchable: false,
      render: (v) => ((v as number) > 0 ? <span className={styles.num}>{money(v as number)}</span> : <span className={styles.muted}>—</span>),
    },
    {
      key: 'descuento_faltas',
      label: 'Descuentos',
      searchable: false,
      render: (_v, r) => {
        const total = r.descuento_faltas + r.aporte_laboral + r.adelantos + r.otros_descuentos;
        return total > 0 ? <span className={`${styles.num} ${styles.salida}`}>− {money(total)}</span> : <span className={styles.muted}>—</span>;
      },
    },
    { key: 'neto_pagar', label: 'Neto a pagar', searchable: false, render: (v) => <strong className={styles.num}>{money(v as number)}</strong> },
    { key: 'costo_empresa', label: 'Costo empresa', searchable: false, render: (v) => <span className={styles.num}>{money(v as number)}</span> },
    {
      key: 'estado',
      label: 'Estado',
      searchable: false,
      render: (v, r) => <StatusBadge tone={ESTADO_TONE[v as EstadoPlanilla]} title={r.motivo_anulacion ?? undefined}>{v as string}</StatusBadge>,
    },
    {
      key: 'acciones',
      label: '',
      searchable: false,
      render: (_v, row) => {
        if (row.estado === 'ANULADO') return null;
        return (
          <RowActionsMenu
            actions={[
              ...(row.estado === 'PENDIENTE'
                ? [
                    { label: 'Marcar pagada', icon: <CheckCircle2 size={12} strokeWidth={2} />, onClick: () => setPaying(row) },
                    ...(row.tipo === 'SUELDO' ? [{ label: 'Bonos y faltas', icon: <Pencil size={12} strokeWidth={2} />, onClick: () => setEditing(row) }] : []),
                  ]
                : []),
              { label: 'Anular', icon: <Ban size={12} strokeWidth={2} />, onClick: () => setAnnulling(row), variant: 'danger' as const },
            ]}
          />
        );
      },
    },
  ];

  return (
    <div className={styles.stack}>
      <StatGrid>
        <StatCard label="Costo para la empresa" value={money(resumen?.costo_empresa ?? 0)} sublabel={`${resumen?.empleados ?? 0} planilla(s) del mes`} loading={loading} accentColor="#ec008c" />
        <StatCard label="Neto a pagar a empleados" value={money(resumen?.neto_pagar ?? 0)} sublabel="Lo que cobran, ya con descuentos" loading={loading} accentColor="#14aeef" />
        <StatCard label="Pagado" value={money(resumen?.pagado ?? 0)} sublabel="Ya sale en el reporte financiero" loading={loading} accentColor="#22c55e" />
        <StatCard label="Por pagar" value={money(resumen?.pendiente ?? 0)} sublabel="Egreso pendiente en Finanzas" loading={loading} accentColor="#f59e0b" />
      </StatGrid>

      <FilterBar>
        <FilterBar.Item label="Mes">
          <MonthPicker value={month} onChange={onMonthChange} />
        </FilterBar.Item>
        <FilterBar.Item label="Sucursal">
          <LocalSelect value={localId} onChange={setLocalId} emptyLabel="Todas" />
        </FilterBar.Item>
        <FilterBar.Action>
          <div className={styles.actions}>
            <AdminButton variant="secondary" onClick={() => setAguinaldoOpen(true)} icon={<Gift size={16} strokeWidth={2} />}>
              Aguinaldos {anioAguinaldo}
            </AdminButton>
            <AdminButton onClick={() => setGenerarOpen(true)} icon={<Plus size={18} strokeWidth={2} />}>
              Generar planilla
            </AdminButton>
          </div>
        </FilterBar.Action>
      </FilterBar>

      {resumen && resumen.aporte_laboral + resumen.aporte_patronal > 0 && (
        <AlertBanner tone="info" title="Aportes de ley del mes">
          Retenidos a empleados: {money(resumen.aporte_laboral)} · Aportes patronales: {money(resumen.aporte_patronal)}. Ambos se pagan a la AFP/CNS y el patronal ya está incluido en el costo para la empresa.
        </AlertBanner>
      )}

      <Tabs tabs={tabs} active={estadoTab} onChange={setEstadoTab} ariaLabel="Estado de las planillas" />
      <DataTable<Row>
        columns={columns}
        data={visibles as Row[]}
        loading={loading}
        error={error}
        onRefresh={reload}
        getRowKey={(p) => p.id}
        searchPlaceholder="Buscar empleado…"
        emptyMessage="No hay planillas en este mes. Se generan solas el día de pago de cada empleado."
      />
      <p className={styles.note}>
        Cada planilla crea su egreso &quot;Sueldos y personal&quot; en Finanzas por el costo para la empresa. Pendiente no resta de la utilidad; al pagarla, sí.
      </p>

      <PlanillaEditModal isOpen={editing !== null} planilla={editing} onClose={() => setEditing(null)} onSaved={refresh} />
      <GenerarPlanillaModal isOpen={generarOpen} empleados={empleados} periodo={month} onClose={() => setGenerarOpen(false)} onGenerated={refresh} />
      <ConfirmDialog
        isOpen={paying !== null}
        title="Marcar planilla como pagada"
        message={
          paying && (
            <>
              <p style={{ margin: '0 0 0.75rem' }}>
                Se registra el pago de <strong>{money(paying.neto_pagar)}</strong> a {paying.empleado_nombre}. El egreso pasa a pagado en Finanzas.
              </p>
              <PlanillaDesglose planilla={paying} moneda={moneda} />
            </>
          )
        }
        confirmLabel="Marcar pagada"
        loading={busy}
        onConfirm={handlePay}
        onClose={() => setPaying(null)}
      />
      <ReasonDialog
        isOpen={annulling !== null}
        title={`Anular planilla de ${annulling?.empleado_nombre ?? ''}`}
        message="Se anula también su egreso en Finanzas y los adelantos que descontaba vuelven a quedar pendientes. Luego puedes regenerarla."
        confirmLabel="Anular planilla"
        onConfirm={async (motivo) => {
          await anularPlanilla(annulling!.id, motivo);
          toast.success('Planilla anulada');
          setAnnulling(null);
          await refresh();
        }}
        onClose={() => setAnnulling(null)}
      />
      <ConfirmDialog
        isOpen={aguinaldoOpen}
        title={`Generar aguinaldos ${anioAguinaldo}`}
        message="Crea el aguinaldo (un sueldo base proporcional a los días trabajados, sin aportes, a pagar hasta el 20 de diciembre) de los empleados con al menos 90 días en el año. Si ya existe, no lo duplica."
        confirmLabel="Generar aguinaldos"
        loading={busy}
        onConfirm={handleAguinaldo}
        onClose={() => setAguinaldoOpen(false)}
      />
    </div>
  );
}
