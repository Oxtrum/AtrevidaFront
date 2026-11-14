'use client';

import { useMemo, useState } from 'react';
import { AdminButton, AlertBanner, DataTable, FilterBar, LocalSelect, SectionLabel, StatCard, StatGrid } from '@/components/AdminConfig';
import type { Column } from '@/components/AdminConfig';
import { ChartPanel, RankedBars, TimeSeriesChart, diasEntre } from '@/components/AdminCharts';
import type { SeriesDef } from '@/components/AdminCharts';
import { getReporteFinancieroDB } from '@/lib/api/reportes';
import { getAdminLocalScope } from '@/lib/api/localScope';
import { useLocales } from '@/lib/hooks/useLocales';
import { useAsyncData } from '@/lib/hooks/useAsyncData';
import { useConfiguracion } from '@/lib/hooks/useConfiguracion';
import { formatMoney, monthRange, todayISO } from '@/lib/utils/format';
import type { DetalleLocalFinanciero } from '@/types/finanzas';
import styles from './ReporteFinancieroPanel.module.css';

const SERIES: SeriesDef[] = [
  { key: 'ingresos', label: 'Ingresos', color: 'var(--admin-chart-ingreso)' },
  { key: 'egresos', label: 'Egresos', color: 'var(--admin-chart-egreso)' },
];
type LocalRow = DetalleLocalFinanciero & Record<string, unknown>;

/**
 * Pestaña "Financiero" de Reportes: ingresos (ventas + otros) vs egresos y
 * utilidad del periodo. Solo cuenta movimientos PAGADO; los pendientes se
 * muestran aparte (PLAN §5.6).
 */
export function ReporteFinancieroPanel() {
  const { moneda } = useConfiguracion();
  const { locales } = useLocales();
  const [month, setMonth] = useState(todayISO().slice(0, 7));
  const [localId, setLocalId] = useState(String(getAdminLocalScope()?.local_id ?? ''));

  const localNombre = locales.find((l) => String(l.id) === localId)?.nombre ?? '';
  const { desde, hasta } = monthRange(month);
  const { data, loading, error, reload } = useAsyncData(
    () => getReporteFinancieroDB({ fecha_desde: desde, fecha_hasta: hasta, local: localNombre || undefined, agrupar: 'dia' }),
    `${month}|${localNombre}`,
  );

  const money = (v: number) => formatMoney(v, moneda);
  const resumen = data?.resumen;

  // Serie completa del mes: los días sin movimientos valen 0 para que el eje del tiempo no salte.
  const serie = useMemo(() => {
    const porDia = new Map((data?.serie ?? []).map((p) => [p.periodo, p]));
    return diasEntre(desde, hasta).map((x) => ({ x, ingresos: porDia.get(x)?.ingresos ?? 0, egresos: porDia.get(x)?.egresos ?? 0 }));
  }, [data, desde, hasta]);
  const hayMovimientos = serie.some((p) => p.ingresos !== 0 || p.egresos !== 0);
  const categorias = useMemo(
    () => (data?.egresos_por_categoria ?? []).map((c) => ({ key: `${c.clase}|${c.categoria}`, label: c.categoria, value: c.total, hint: c.clase === 'FIJO' ? 'Fijo' : 'Variable' })),
    [data],
  );

  const localColumns: Column<LocalRow>[] = [
    { key: 'local', label: 'Local' },
    { key: 'ingresos', label: 'Ingresos', render: (_v, r) => money(r.resumen.ingresos_total) },
    { key: 'egresos', label: 'Egresos', render: (_v, r) => money(r.resumen.egresos_total) },
    { key: 'utilidad', label: 'Utilidad', render: (_v, r) => <strong className={r.resumen.utilidad_neta < 0 ? styles.negative : undefined}>{money(r.resumen.utilidad_neta)}</strong> },
    { key: 'margen', label: 'Margen', render: (_v, r) => `${r.resumen.margen_pct}%` },
  ];

  return (
    <div className={styles.stack}>
      <div className={styles.toolbar}>
        <FilterBar>
          <FilterBar.Item label="Mes">
            <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
          </FilterBar.Item>
          {!getAdminLocalScope() && (
            <FilterBar.Item label="Local">
              <LocalSelect value={localId} onChange={setLocalId} emptyLabel="Todos los locales" />
            </FilterBar.Item>
          )}
        </FilterBar>
      </div>

      {error && <AlertBanner tone="danger" title="No se pudo cargar el reporte" action={<AdminButton variant="secondary" onClick={reload}>Reintentar</AdminButton>}>{error}</AlertBanner>}

      <StatGrid>
        <StatCard label="Ingresos" value={money(resumen?.ingresos_total ?? 0)} sublabel={resumen ? `Ventas ${money(resumen.ingresos_ventas)} · Otros ${money(resumen.ingresos_otros)}` : undefined} loading={loading} accentColor="#0e9bd6" />
        <StatCard label="Egresos" value={money(resumen?.egresos_total ?? 0)} sublabel={resumen ? `Fijos ${money(resumen.egresos_fijos)} · Variables ${money(resumen.egresos_variables)}` : undefined} loading={loading} accentColor="#ec008c" />
        <StatCard label="Utilidad neta" value={money(resumen?.utilidad_neta ?? 0)} sublabel={resumen ? `Margen ${resumen.margen_pct}%` : undefined} loading={loading} accentColor="#14aeef" />
        <StatCard label="Egresos pendientes" value={money(resumen?.egresos_pendientes ?? 0)} sublabel="No entran en la utilidad" loading={loading} accentColor="#f59e0b" />
      </StatGrid>

      <div className={styles.charts}>
        <ChartPanel
          title="Ingresos y egresos por día"
          note="Solo lo cobrado y pagado del mes"
          loading={loading}
          empty={!data ? (loading ? 'Cargando…' : null) : hayMovimientos ? null : 'Sin movimientos cobrados ni pagados en el periodo'}
        >
          <TimeSeriesChart data={serie} series={SERIES} format={money} ariaLabel="Evolución diaria de ingresos y egresos del mes" />
        </ChartPanel>

        <ChartPanel
          title="Egresos por categoría"
          note="Pagados en el mes, de mayor a menor"
          loading={loading}
          empty={!data ? (loading ? 'Cargando…' : null) : categorias.length ? null : 'Sin egresos pagados en el periodo'}
        >
          <RankedBars items={categorias} format={money} tone="egreso" maxItems={6} showShare />
        </ChartPanel>
      </div>

      {data && (
        <StatGrid>
          <StatCard label="Valor del stock" value={money(data.inventario.valor_stock)} sublabel="A último costo de compra" accentColor="#92278f" />
          <StatCard label="Ítems bajo stock" value={data.inventario.items_bajo_stock} accentColor="#f97316" />
          <StatCard label="Gastos generales" value={money(data.gastos_generales)} sublabel="Sin local asignado" accentColor="#06b6d4" />
        </StatGrid>
      )}

      {(data?.detalle_por_local.length ?? 0) > 0 && (
        <>
          <SectionLabel>Resultado por local</SectionLabel>
          <DataTable<LocalRow> columns={localColumns} data={(data?.detalle_por_local ?? []) as LocalRow[]} getRowKey={(r) => r.local} hideSearch />
          <p className={styles.note}>Los gastos generales (sin local) se muestran aparte y no se prorratean entre locales.</p>
        </>
      )}
    </div>
  );
}
