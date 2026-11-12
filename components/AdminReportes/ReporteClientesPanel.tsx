'use client';

import { useCallback, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, RefreshCw } from 'lucide-react';
import { AdminButton, AlertBanner, ChoiceChips, DataTable, FilterBar, LocalSelect, SectionLabel, StatCard } from '@/components/AdminConfig';
import type { Column } from '@/components/AdminConfig';
import { ChartPanel, RankedBars, TimeSeriesChart, diasEntre } from '@/components/AdminCharts';
import { NOMBRE_PERIODO, PERIODOS, etiquetaPeriodo, moverDias } from '@/components/AdminRRHH/ReportePersonalPanel';
import { getReporteClientes } from '@/lib/api/reportes';
import { useAsyncData } from '@/lib/hooks/useAsyncData';
import { formatMoney, todayISO } from '@/lib/utils/format';
import type { ReporteClientesBloque } from '@/types/reporteClientes';
import type { PeriodoReporte } from '@/types/rrhh';
import panel from '@/components/AdminRRHH/RRHHPanel.module.css';
import periodoStyles from '@/components/AdminRRHH/ReportePersonalPanel.module.css';
import { DetalleClientesTable } from './DetalleClientesTable';
import styles from './ReporteClientesPanel.module.css';

type LocalRow = ReporteClientesBloque['resumen'] & { local_nombre: string } & Record<string, unknown>;

const UNIDAD_RACHA: Record<PeriodoReporte, [singular: string, plural: string]> = {
  semanal: ['semana', 'semanas'],
  quincenal: ['quincena', 'quincenas'],
  mensual: ['mes', 'meses'],
};

const BLOQUE_VACIO: ReporteClientesBloque = {
  local_id: null,
  local_nombre: '',
  resumen: {
    clientes_activos: 0, clientes_activos_anterior: 0, variacion_clientes_pct: null, clientes_nuevos: 0, clientes_recurrentes: 0,
    ingresos: 0, ingresos_anterior: 0, variacion_ingresos_pct: null, ingresos_sin_cliente: 0, ingresos_sin_cliente_pct: 0,
    clientes_que_pagaron: 0, ticket_promedio_cliente: 0, ticket_promedio_cliente_anterior: 0, citas: 0, citas_anterior: 0,
    citas_sin_cliente: 0, canceladas: 0, inasistencias: 0, clientes_que_volvieron: 0, tasa_retorno_pct: null, por_cobrar: 0,
    deudores: 0, clientes_compartidos: 0,
  },
  top_ingresos: [],
  top_citas: [],
  top_fieles: [],
  top_canceladas: [],
  deudores: [],
  serie: [],
};

const plural = (n: number, singular: string, pluralTxt: string) => `${n} ${n === 1 ? singular : pluralTxt}`;
const signo = (pct: number) => `${pct > 0 ? '+' : ''}${pct}%`;

/** Reporte de clientes: quién generó más dinero, quién tuvo más citas, fidelidad y deudas; general o por local. */
export function ReporteClientesPanel() {
  const [periodo, setPeriodo] = useState<PeriodoReporte>('mensual');
  const [fecha, setFecha] = useState(todayISO());
  const [localId, setLocalId] = useState('');
  const [exportando, setExportando] = useState(false);
  const [errorExport, setErrorExport] = useState<string | null>(null);

  const { data, loading, error } = useAsyncData(() => getReporteClientes(periodo, fecha), `${periodo}|${fecha}`);

  // Mientras llega otro periodo se sigue viendo el anterior; solo se usa si corresponde al periodo elegido.
  const reporte = data && data.periodo === periodo ? data : null;
  const hoy = todayISO();
  const esPeriodoActual = reporte ? reporte.hasta >= hoy : true;

  const bloque = useMemo<ReporteClientesBloque>(() => {
    if (!reporte) return BLOQUE_VACIO;
    if (!localId) return reporte.general;
    return reporte.locales.find((l) => String(l.local_id) === localId) ?? BLOQUE_VACIO;
  }, [reporte, localId]);

  const { resumen, deudores } = bloque;
  const comparado = NOMBRE_PERIODO[periodo];
  const [unidad, unidades] = UNIDAD_RACHA[periodo];
  const rachaMaxima = reporte?.racha_maxima ?? 0;
  const cargando = loading && !reporte;
  const ambito = localId ? ` en ${bloque.local_nombre || 'este local'}` : ' en todos los locales';
  const mejor = bloque.top_ingresos[0];
  const masCitas = bloque.top_citas[0];

  const serie = useMemo(() => {
    if (!reporte) return [];
    const porDia = new Map(bloque.serie.map((p) => [p.fecha, p.clientes]));
    // El periodo en curso se corta en hoy: los días que aún no llegan no son ceros.
    const fin = reporte.hasta > hoy && reporte.desde <= hoy ? hoy : reporte.hasta;
    return diasEntre(reporte.desde, fin).map((x) => ({ x, clientes: porDia.get(x) ?? 0 }));
  }, [reporte, bloque, hoy]);

  const vacio = (hay: boolean, mensaje: string) => (!loading && !error && !hay ? mensaje : null);
  const textoRacha = useCallback(
    (n: number) => `${n >= rachaMaxima && rachaMaxima > 0 ? `${n}+` : n} ${n === 1 ? unidad : unidades}`,
    [rachaMaxima, unidad, unidades],
  );

  const exportar = async () => {
    if (!reporte) return;
    setExportando(true);
    setErrorExport(null);
    try {
      const { descargarReporteClientes } = await import('@/lib/export/reporteClientes');
      await descargarReporteClientes({ reporte, bloque, etiqueta: etiquetaPeriodo(periodo, reporte.desde, reporte.hasta), moneda: 'Bs' });
    } catch {
      setErrorExport('No se pudo generar el Excel. Intenta de nuevo.');
    } finally {
      setExportando(false);
    }
  };

  const columnasLocal: Column<LocalRow>[] = [
    { key: 'local_nombre', label: 'Local', render: (v) => <strong>{v as string}</strong> },
    {
      key: 'clientes_activos',
      label: 'Clientes activos',
      firstSort: 'desc',
      render: (v, r) => (
        <span className={panel.num}>
          {v as number}
          <span className={panel.sub}>{plural(r.clientes_nuevos, 'nuevo', 'nuevos')}</span>
        </span>
      ),
    },
    { key: 'ingresos', label: 'Dinero de clientes', firstSort: 'desc', render: (v) => <span className={panel.num}>{formatMoney(v as number)}</span> },
    { key: 'ticket_promedio_cliente', label: 'Ticket por cliente', firstSort: 'desc', render: (v) => <span className={panel.num}>{formatMoney(v as number)}</span> },
    { key: 'citas', label: 'Citas', firstSort: 'desc', render: (v) => <span className={panel.num}>{v as number}</span> },
    {
      key: 'tasa_retorno_pct',
      label: 'Volvieron',
      firstSort: 'desc',
      render: (v) => (v === null ? <span className={panel.muted}>—</span> : <span className={panel.num}>{v as number}%</span>),
    },
    {
      key: 'ingresos_sin_cliente_pct',
      label: 'Ventas sin cliente',
      firstSort: 'desc',
      render: (v) => <span className={panel.num}>{v as number}%</span>,
    },
    { key: 'por_cobrar', label: 'Por cobrar hoy', firstSort: 'desc', render: (v) => <span className={panel.num}>{formatMoney(v as number)}</span> },
  ];

  const sinAsignar = [
    resumen.ingresos_sin_cliente > 0
      ? `${formatMoney(resumen.ingresos_sin_cliente)} en ventas (${resumen.ingresos_sin_cliente_pct}% del periodo)`
      : null,
    resumen.citas_sin_cliente > 0 ? plural(resumen.citas_sin_cliente, 'cita completada', 'citas completadas') : null,
  ].filter(Boolean);

  return (
    <div className={panel.stack}>
      <FilterBar>
        <FilterBar.Item label="Periodo">
          <ChoiceChips options={PERIODOS} value={periodo} onChange={setPeriodo} ariaLabel="Periodo del reporte" variant="toggle" />
        </FilterBar.Item>
        <FilterBar.Item label="Fechas">
          <div className={periodoStyles.periodo} role="group" aria-label="Fechas del reporte">
            <button
              type="button"
              className={periodoStyles.arrow}
              onClick={() => reporte && setFecha(moverDias(reporte.desde, -1))}
              disabled={!reporte}
              aria-label="Periodo anterior"
            >
              <ChevronLeft size={16} strokeWidth={2} />
            </button>
            <span className={periodoStyles.periodoLabel} aria-live="polite">
              {reporte ? etiquetaPeriodo(periodo, reporte.desde, reporte.hasta) : '…'}
            </span>
            <button
              type="button"
              className={periodoStyles.arrow}
              onClick={() => reporte && setFecha(moverDias(reporte.hasta, 1))}
              disabled={!reporte || esPeriodoActual}
              aria-label="Periodo siguiente"
            >
              <ChevronRight size={16} strokeWidth={2} />
            </button>
          </div>
        </FilterBar.Item>
        <FilterBar.Item label="Local" grow>
          <LocalSelect value={localId} onChange={setLocalId} emptyLabel="General (todos los locales)" />
        </FilterBar.Item>
        <FilterBar.Item label="Exportar">
          <div className={styles.exportar}>
            <AdminButton
              variant="secondary"
              size="sm"
              onClick={exportar}
              disabled={!reporte || exportando}
              icon={exportando ? <RefreshCw size={16} strokeWidth={2} /> : <Download size={16} strokeWidth={2} />}
            >
              {exportando ? 'Generando…' : 'Descargar Excel'}
            </AdminButton>
          </div>
        </FilterBar.Item>
      </FilterBar>

      {error && <AlertBanner tone="danger">{error}</AlertBanner>}
      {errorExport && <AlertBanner tone="danger">{errorExport}</AlertBanner>}
      {reporte && sinAsignar.length > 0 && (
        <AlertBanner tone="info" title="Parte del periodo no tiene cliente asignado">
          No entran en estos rankings: {sinAsignar.join(' y ')}. La venta o la reserva no está vinculada a un cliente registrado.
        </AlertBanner>
      )}

      <div className={styles.stats}>
        <StatCard
          value={mejor ? mejor.nombre : '—'}
          label="Quien más dinero generó"
          sublabel={mejor ? `${formatMoney(mejor.ingresos)} · ${mejor.participacion_pct}% del total` : 'Sin pagos de clientes'}
          accentColor="var(--admin-accent-primary)"
          loading={cargando}
        />
        <StatCard
          value={masCitas && masCitas.citas > 0 ? masCitas.nombre : '—'}
          label="Quien más citas tuvo"
          sublabel={masCitas && masCitas.citas > 0 ? `${plural(masCitas.citas, 'cita completada', 'citas completadas')}` : 'Sin citas completadas'}
          accentColor="var(--admin-accent-tertiary)"
          loading={cargando}
        />
        <StatCard
          value={resumen.clientes_activos}
          label="Clientes activos"
          sublabel={
            resumen.variacion_clientes_pct === null
              ? `${resumen.clientes_activos_anterior} en ${comparado}`
              : `${signo(resumen.variacion_clientes_pct)} vs. ${comparado} (${resumen.clientes_activos_anterior})`
          }
          loading={cargando}
        />
        <StatCard
          value={resumen.clientes_nuevos}
          label="Clientes nuevos"
          sublabel={`${plural(resumen.clientes_recurrentes, 'recurrente', 'recurrentes')} · ya habían venido`}
          loading={cargando}
        />
        <StatCard
          value={formatMoney(resumen.ticket_promedio_cliente)}
          label="Gasto promedio por cliente"
          sublabel={`${formatMoney(resumen.ticket_promedio_cliente_anterior)} en ${comparado}`}
          loading={cargando}
        />
        <StatCard
          value={resumen.tasa_retorno_pct === null ? '—' : `${resumen.tasa_retorno_pct}%`}
          label="Clientes que volvieron"
          sublabel={
            resumen.tasa_retorno_pct === null
              ? `Sin clientes en ${comparado}`
              : `${resumen.clientes_que_volvieron} de ${resumen.clientes_activos_anterior} ${comparado.replace(/^el /, "del ").replace(/^la /, "de la ")}`
          }
          loading={cargando}
        />
        <StatCard
          value={formatMoney(resumen.por_cobrar)}
          label="Por cobrar hoy"
          sublabel={`${plural(resumen.deudores, 'cliente con deuda', 'clientes con deuda')}`}
          accentColor="var(--admin-accent-danger)"
          loading={cargando}
        />
        {!localId && (
          <StatCard
            value={resumen.clientes_compartidos}
            label="Van a más de un local"
            sublabel="Clientes activos en dos o más locales"
            loading={cargando}
          />
        )}
      </div>

      <div className={periodoStyles.charts}>
        <ChartPanel
          title="Quién generó más dinero"
          note={`Lo que pagó cada cliente${ambito}.`}
          loading={loading}
          empty={vacio(resumen.ingresos > 0, 'No hay pagos de clientes registrados en este periodo.')}
        >
          <RankedBars
            items={bloque.top_ingresos.map((c) => ({
              key: String(c.cliente_id),
              label: c.nombre,
              value: c.ingresos,
              hint: `${c.participacion_pct}% del total · ${plural(c.pagos, "pago", "pagos")} · ${formatMoney(c.ticket_promedio)} c/u`,
            }))}
            format={(v) => formatMoney(v)}
            tone="ingreso"
            maxItems={10}
          />
        </ChartPanel>
        <ChartPanel
          title="Quién tuvo más citas"
          note={`Citas completadas por cliente${ambito}.`}
          loading={loading}
          empty={vacio(resumen.citas > 0, 'No hay citas completadas de clientes en este periodo.')}
        >
          <RankedBars
            items={bloque.top_citas.map((c) => ({
              key: String(c.cliente_id),
              label: c.nombre,
              value: c.citas,
              hint: c.servicio_top ? `${c.servicio_top} (${c.servicio_top_cantidad})` : undefined,
            }))}
            format={(v) => String(v)}
            tone="egreso"
            maxItems={10}
          />
        </ChartPanel>
        <ChartPanel
          title="Los más fieles"
          note={`Periodos seguidos viniendo (${unidades}), contando este. Se revisan hasta ${rachaMaxima}.`}
          loading={loading}
          empty={vacio(bloque.top_fieles.length > 0, 'Nadie lleva dos periodos seguidos viniendo.')}
        >
          <RankedBars
            items={bloque.top_fieles.map((c) => ({
                key: String(c.cliente_id),
                label: c.nombre,
                value: c.racha_periodos,
                hint: `${formatMoney(c.ingresos)} · ${plural(c.citas, 'cita', 'citas')} este periodo`,
            }))}
            format={textoRacha}
            tone="neutral"
            maxItems={10}
          />
        </ChartPanel>
        <ChartPanel
          title="Quién debe más"
          note={`Saldo pendiente al día de hoy; no cambia con el periodo.${resumen.deudores > deudores.length ? ` Se muestran los ${deudores.length} mayores de ${resumen.deudores}.` : ""}`}
          loading={loading}
          empty={vacio(deudores.length > 0, 'Ningún cliente tiene saldo pendiente.')}
        >
          <RankedBars
            items={deudores.map((d) => ({
              key: String(d.cliente_id),
              label: d.nombre,
              value: d.saldo_pendiente,
              hint: `${plural(d.cargos, 'cargo', 'cargos')} · debe desde hace ${plural(d.dias_deuda, 'día', 'días')}`,
            }))}
            format={(v) => formatMoney(v)}
            tone="egreso"
            maxItems={10}
          />
        </ChartPanel>
        <ChartPanel
          title="Clientes por día"
          note="Clientes distintos que pagaron o completaron una cita cada día."
          loading={loading}
          empty={vacio(resumen.clientes_activos > 0, 'No hay actividad de clientes en este periodo.')}
        >
          <TimeSeriesChart
            data={serie}
            series={[{ key: 'clientes', label: 'Clientes', color: 'var(--admin-chart-ingreso)' }]}
            format={(v) => String(v)}
            ariaLabel="Clientes activos por día en el periodo"
          />
        </ChartPanel>
        <ChartPanel
          title="Quién canceló más"
          note={`Reservas canceladas en el periodo${resumen.inasistencias > 0 ? `; ${plural(resumen.inasistencias, 'fue', 'fueron')} por inasistencia` : ''}.`}
          loading={loading}
          empty={vacio(resumen.canceladas > 0, 'Ningún cliente canceló reservas en este periodo.')}
        >
          <RankedBars
            items={bloque.top_canceladas.map((c) => ({
              key: String(c.cliente_id),
              label: c.nombre,
              value: c.canceladas,
              hint: c.inasistencias > 0 ? `${plural(c.inasistencias, 'falta', 'faltas')} sin avisar` : undefined,
            }))}
            format={(v) => String(v)}
            tone="neutral"
            maxItems={10}
          />
        </ChartPanel>
      </div>

      {!localId && reporte && reporte.locales.length > 1 && (
        <>
          <SectionLabel withLine>Comparativo por local</SectionLabel>
          <DataTable<LocalRow>
            columns={columnasLocal}
            data={reporte.locales.map((l) => ({ ...l.resumen, local_nombre: l.local_nombre })) as LocalRow[]}
            getRowKey={(r) => r.local_nombre}
            hideSearch
            emptyMessage="Sin locales con movimiento"
          />
        </>
      )}

      <SectionLabel withLine>Detalle por cliente</SectionLabel>
      {reporte && <DetalleClientesTable periodo={periodo} fecha={reporte.desde} localId={localId} textoRacha={textoRacha} />}
      <p className={panel.note}>
        El dinero es lo que el cliente pagó en el periodo (ventas y abonos a su cuenta); las citas son las reservas completadas. Un cliente
        es activo si pagó o completó una cita, y es nuevo si esa fue su primera vez en el negocio. La tabla trae 50 clientes por página; haz clic en una fila para abrir la ficha
        del cliente.
      </p>
    </div>
  );
}
