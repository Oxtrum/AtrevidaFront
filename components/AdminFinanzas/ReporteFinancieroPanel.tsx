'use client';

import { useMemo, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AdminButton, AlertBanner, DataTable, FilterBar, LocalSelect, SectionLabel, StatCard, StatGrid } from '@/components/AdminConfig';
import type { Column } from '@/components/AdminConfig';
import { toast } from '@/components/Shared/Toast';
import { getReporteFinancieroDB } from '@/lib/api/reportes';
import { getAdminLocalScope } from '@/lib/api/localScope';
import { useLocales } from '@/lib/hooks/useLocales';
import { useAsyncData } from '@/lib/hooks/useAsyncData';
import { useConfiguracion } from '@/lib/hooks/useConfiguracion';
import { formatMoney, monthRange, todayISO } from '@/lib/utils/format';
import type { DetalleLocalFinanciero } from '@/types/finanzas';
import styles from './ReporteFinancieroPanel.module.css';

const CHART_COLORS = ['#ec008c', '#14aeef', '#ffe600', '#10b981', '#f97316', '#92278f'];
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
  const [exporting, setExporting] = useState(false);

  const localNombre = locales.find((l) => String(l.id) === localId)?.nombre ?? '';
  const { desde, hasta } = monthRange(month);
  const { data, loading, error, reload } = useAsyncData(
    () => getReporteFinancieroDB({ fecha_desde: desde, fecha_hasta: hasta, local: localNombre || undefined, agrupar: 'mes' }),
    `${month}|${localNombre}`,
  );

  const money = (v: number) => formatMoney(v, moneda);
  const resumen = data?.resumen;

  const pie = useMemo(
    () => (data?.egresos_por_categoria ?? []).map((c) => ({ name: c.categoria, value: c.total })),
    [data],
  );

  const handleExport = async () => {
    if (!data) return;
    setExporting(true);
    try {
      const ExcelJS = await import('exceljs');
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Resumen financiero');
      ws.addRow([`Reporte financiero ${localNombre || 'general'} — ${desde} a ${hasta}`]).font = { bold: true, size: 14 };
      ws.addRow([]);
      const r = data.resumen;
      [
        ['Ingresos por ventas', r.ingresos_ventas], ['Otros ingresos', r.ingresos_otros], ['Ingresos totales', r.ingresos_total],
        ['Egresos fijos', r.egresos_fijos], ['Egresos variables', r.egresos_variables], ['Egresos totales', r.egresos_total],
        ['Egresos pendientes (no incluidos)', r.egresos_pendientes], ['Utilidad neta', r.utilidad_neta], ['Margen %', r.margen_pct],
      ].forEach((row) => ws.addRow(row));
      ws.addRow([]);
      ws.addRow(['Egresos por categoría', 'Clase', 'Total']).font = { bold: true };
      data.egresos_por_categoria.forEach((c) => ws.addRow([c.categoria, c.clase, c.total]));
      if (data.detalle_por_local.length) {
        ws.addRow([]);
        ws.addRow(['Local', 'Ingresos', 'Egresos', 'Utilidad']).font = { bold: true };
        data.detalle_por_local.forEach((d) => ws.addRow([d.local, d.resumen.ingresos_total, d.resumen.egresos_total, d.resumen.utilidad_neta]));
      }
      ws.columns = [{ width: 38 }, { width: 18 }, { width: 18 }, { width: 18 }];
      const buffer = await wb.xlsx.writeBuffer();
      const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte-financiero-${month}${localNombre ? `-${localNombre.toLowerCase().replace(/\s+/g, '-')}` : ''}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('No se pudo generar el Excel');
    } finally {
      setExporting(false);
    }
  };

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
        <AdminButton variant="primary" onClick={handleExport} disabled={!data || loading || exporting}>
          {exporting ? <RefreshCw size={16} className={styles.spin} /> : <Download size={16} strokeWidth={1.8} />}
          Descargar Excel
        </AdminButton>
      </div>

      {error && <AlertBanner tone="danger" title="No se pudo cargar el reporte" action={<AdminButton variant="secondary" onClick={reload}>Reintentar</AdminButton>}>{error}</AlertBanner>}

      <StatGrid>
        <StatCard label="Ingresos" value={money(resumen?.ingresos_total ?? 0)} sublabel={resumen ? `Ventas ${money(resumen.ingresos_ventas)} · Otros ${money(resumen.ingresos_otros)}` : undefined} loading={loading} accentColor="#10b981" />
        <StatCard label="Egresos" value={money(resumen?.egresos_total ?? 0)} sublabel={resumen ? `Fijos ${money(resumen.egresos_fijos)} · Variables ${money(resumen.egresos_variables)}` : undefined} loading={loading} accentColor="#ec008c" />
        <StatCard label="Utilidad neta" value={money(resumen?.utilidad_neta ?? 0)} sublabel={resumen ? `Margen ${resumen.margen_pct}%` : undefined} loading={loading} accentColor="#14aeef" />
        <StatCard label="Egresos pendientes" value={money(resumen?.egresos_pendientes ?? 0)} sublabel="No entran en la utilidad" loading={loading} accentColor="#f59e0b" />
      </StatGrid>

      <div className={styles.charts}>
        <section className={styles.chartCard}>
          <SectionLabel>Ingresos vs egresos</SectionLabel>
          <div className={styles.chartBox}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.serie ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-border-subtle)" />
                <XAxis dataKey="periodo" stroke="var(--admin-text-dim)" fontSize={12} />
                <YAxis stroke="var(--admin-text-dim)" fontSize={12} />
                <Tooltip formatter={(v) => money(Number(v))} />
                <Legend />
                <Bar dataKey="ingresos" name="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="egresos" name="Egresos" fill="#ec008c" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className={styles.chartCard}>
          <SectionLabel>Egresos por categoría</SectionLabel>
          <div className={styles.chartBox}>
            {pie.length === 0 ? (
              <p className={styles.empty}>Sin egresos pagados en el periodo</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pie} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="80%" paddingAngle={2}>
                    {pie.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => money(Number(v))} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
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
