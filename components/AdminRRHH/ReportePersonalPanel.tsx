'use client';

import { useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { AlertBanner, ChoiceChips, DataTable, FilterBar, LocalSelect, SectionLabel, StatCard, StatGrid, formatMes } from '@/components/AdminConfig';
import type { ChoiceOption, Column } from '@/components/AdminConfig';
import { ChartPanel, RankedBars, TimeSeriesChart, diasEntre, formatDia } from '@/components/AdminCharts';
import { getReporteAtenciones } from '@/lib/api/rrhh';
import { useAsyncData } from '@/lib/hooks/useAsyncData';
import { formatDateISO, todayISO } from '@/lib/utils/format';
import type { PeriodoReporte, PersonalAtenciones, RegistradorAtenciones, ReporteAtencionesBloque } from '@/types/rrhh';
import panel from './RRHHPanel.module.css';
import styles from './ReportePersonalPanel.module.css';

type PersonalRow = PersonalAtenciones & Record<string, unknown>;
type RegistradorRow = RegistradorAtenciones & Record<string, unknown>;

export const PERIODOS: ChoiceOption<PeriodoReporte>[] = [
  { value: 'semanal', label: 'Semanal' },
  { value: 'quincenal', label: 'Quincenal' },
  { value: 'mensual', label: 'Mensual' },
];

export const NOMBRE_PERIODO: Record<PeriodoReporte, string> = {
  semanal: 'la semana anterior',
  quincenal: 'la quincena anterior',
  mensual: 'el mes anterior',
};

const BLOQUE_VACIO: ReporteAtencionesBloque = {
  local_id: null,
  local_nombre: '',
  resumen: {
    atenciones: 0, atenciones_anterior: 0, variacion_pct: null, personal: 0, dias_con_atencion: 0, promedio_diario: 0,
    promedio_por_persona: 0, clientes_distintos: 0, minutos_atendidos: 0, duracion_promedio_min: 0, sin_horario: 0,
  },
  ranking: [],
  serie: [],
  registradores: [],
};

/** Suma días a una fecha ISO sin pasar por UTC (evita el desfase de zona horaria). */
export function moverDias(iso: string, dias: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const f = new Date(y, m - 1, d + dias);
  return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;
}

/** "Noviembre 2026" para el mes; "9 nov – 15 nov 2026" para semana y quincena. */
export function etiquetaPeriodo(periodo: PeriodoReporte, desde: string, hasta: string): string {
  if (periodo === 'mensual') return formatMes(desde.slice(0, 7));
  return `${formatDia(desde)} – ${formatDia(hasta)} ${hasta.slice(0, 4)}`;
}

/** 135 → "2 h 15 min". */
function formatDuracion(minutos: number): string {
  if (minutos <= 0) return '—';
  const h = Math.floor(minutos / 60);
  const m = Math.round(minutos % 60);
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

const atencionesTexto = (n: number) => `${n} ${n === 1 ? 'atención' : 'atenciones'}`;

export function Variacion({ pct, actual }: { pct: number | null; actual: number }) {
  if (pct === null) return <span className={panel.muted}>{actual > 0 ? 'Nuevo' : '—'}</span>;
  if (pct === 0) return <span className={panel.muted}>Igual</span>;
  const sube = pct > 0;
  const Icono = sube ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`${styles.variacion} ${sube ? styles.sube : styles.baja}`}>
      <Icono size={13} strokeWidth={2.2} aria-hidden />
      {sube ? '+' : ''}{pct.toLocaleString('es-BO', { maximumFractionDigits: 1 })}%
    </span>
  );
}

/** Reporte de personal que más atiende: semanal, quincenal o mensual; general o por local. */
export function ReportePersonalPanel() {
  const [periodo, setPeriodo] = useState<PeriodoReporte>('mensual');
  const [fecha, setFecha] = useState(todayISO());
  const [localId, setLocalId] = useState('');

  const { data, loading, error, reload } = useAsyncData(() => getReporteAtenciones(periodo, fecha), `${periodo}|${fecha}`);

  // Mientras llega otro periodo se sigue viendo el anterior; solo se usa si corresponde al periodo elegido.
  const reporte = data && data.periodo === periodo ? data : null;
  const hoy = todayISO();
  const esPeriodoActual = reporte ? reporte.hasta >= hoy : true;

  const bloque = useMemo<ReporteAtencionesBloque>(() => {
    if (!reporte) return BLOQUE_VACIO;
    if (!localId) return reporte.general;
    return reporte.locales.find((l) => String(l.local_id) === localId) ?? BLOQUE_VACIO;
  }, [reporte, localId]);

  const { resumen, ranking } = bloque;
  const lider = ranking[0];
  const comparado = NOMBRE_PERIODO[periodo];

  const serie = useMemo(() => {
    if (!reporte) return [];
    const porDia = new Map(bloque.serie.map((p) => [p.fecha, p.atenciones]));
    // El periodo en curso se corta en hoy: los días que aún no llegan no son ceros.
    const fin = reporte.hasta > hoy && reporte.desde <= hoy ? hoy : reporte.hasta;
    return diasEntre(reporte.desde, fin).map((x) => ({ x, atenciones: porDia.get(x) ?? 0 }));
  }, [reporte, bloque, hoy]);

  const sinDatos = !loading && !error && resumen.atenciones === 0 ? 'No hay atenciones registradas en este periodo.' : null;

  const columnas: Column<PersonalRow>[] = [
    {
      key: 'posicion',
      label: '#',
      searchable: false,
      render: (v) => <span className={`${styles.puesto} ${(v as number) <= 3 ? styles.podio : ''}`}>{v as number}</span>,
    },
    {
      key: 'nombre',
      label: 'Personal',
      render: (v, r) => (
        <span>
          <strong>{v as string}</strong>
          <span className={panel.sub}>
            {[r.cargo, r.empleado_id === null ? 'Sin ficha de empleado' : null, localId ? null : r.locales].filter(Boolean).join(' · ')}
          </span>
        </span>
      ),
    },
    { key: 'atenciones', label: 'Atenciones', searchable: false, firstSort: 'desc', render: (v) => <strong className={panel.num}>{v as number}</strong> },
    { key: 'participacion_pct', label: '% del total', searchable: false, firstSort: 'desc', render: (v) => <span className={panel.num}>{v as number}%</span> },
    {
      key: 'variacion_pct',
      label: 'vs. anterior',
      searchable: false,
      firstSort: 'desc',
      render: (v, r) => (
        <span title={`Antes: ${atencionesTexto(r.atenciones_anterior)}`}>
          <Variacion pct={v as number | null} actual={r.atenciones} />
        </span>
      ),
    },
    { key: 'dias_trabajados', label: 'Días', searchable: false, firstSort: 'desc', render: (v) => <span className={panel.num}>{v as number}</span> },
    { key: 'promedio_por_dia', label: 'Por día', searchable: false, firstSort: 'desc', render: (v) => <span className={panel.num}>{v as number}</span> },
    { key: 'clientes_distintos', label: 'Clientes', searchable: false, firstSort: 'desc', render: (v) => <span className={panel.num}>{v as number}</span> },
    {
      key: 'minutos_atendidos',
      label: 'Tiempo',
      searchable: false,
      firstSort: 'desc',
      render: (v, r) => (
        <span className={panel.num}>
          {formatDuracion(v as number)}
          {r.duracion_promedio_min > 0 && <span className={panel.sub}>{formatDuracion(r.duracion_promedio_min)} c/u</span>}
        </span>
      ),
    },
    {
      key: 'servicio_top',
      label: 'Servicio más realizado',
      render: (v, r) => (v ? <span>{v as string}<span className={panel.sub}>{r.servicio_top_cantidad} veces</span></span> : <span className={panel.muted}>—</span>),
    },
    { key: 'ultima_atencion', label: 'Última', searchable: false, firstSort: 'desc', render: (v) => formatDateISO(v as string) },
  ];

  const columnasRegistro: Column<RegistradorRow>[] = [
    { key: 'usuario', label: 'Usuario' },
    { key: 'registros', label: 'Atenciones registradas', searchable: false, firstSort: 'desc', render: (v) => <strong className={panel.num}>{v as number}</strong> },
    { key: 'participacion_pct', label: '% del total', searchable: false, firstSort: 'desc', render: (v) => <span className={panel.num}>{v as number}%</span> },
  ];

  return (
    <div className={panel.stack}>
      <FilterBar>
        <FilterBar.Item label="Periodo">
          <ChoiceChips options={PERIODOS} value={periodo} onChange={setPeriodo} ariaLabel="Periodo del reporte" variant="toggle" />
        </FilterBar.Item>
        <FilterBar.Item label="Fechas">
          <div className={styles.periodo} role="group" aria-label="Fechas del reporte">
            <button
              type="button"
              className={styles.arrow}
              onClick={() => reporte && setFecha(moverDias(reporte.desde, -1))}
              disabled={!reporte}
              aria-label="Periodo anterior"
            >
              <ChevronLeft size={16} strokeWidth={2} />
            </button>
            <span className={styles.periodoLabel} aria-live="polite">
              {reporte ? etiquetaPeriodo(periodo, reporte.desde, reporte.hasta) : '…'}
            </span>
            <button
              type="button"
              className={styles.arrow}
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
      </FilterBar>

      {error && <AlertBanner tone="danger">{error}</AlertBanner>}

      <StatGrid>
        <StatCard
          value={lider ? lider.nombre : '—'}
          label="Quien más atendió"
          sublabel={lider ? `${atencionesTexto(lider.atenciones)} · ${lider.participacion_pct}% del total` : 'Sin atenciones'}
          accentColor="var(--admin-accent-primary)"
          loading={loading && !reporte}
        />
        <StatCard
          value={resumen.atenciones}
          label="Atenciones"
          sublabel={
            resumen.variacion_pct === null
              ? `${resumen.atenciones_anterior} en ${comparado}`
              : `${resumen.variacion_pct > 0 ? '+' : ''}${resumen.variacion_pct}% vs. ${comparado} (${resumen.atenciones_anterior})`
          }
          loading={loading && !reporte}
        />
        <StatCard
          value={resumen.personal}
          label="Personas que atendieron"
          sublabel={`${resumen.promedio_por_persona} atenciones por persona`}
          loading={loading && !reporte}
        />
        <StatCard
          value={resumen.promedio_diario}
          label="Atenciones por día"
          sublabel={`${resumen.dias_con_atencion} ${resumen.dias_con_atencion === 1 ? 'día' : 'días'} con atención`}
          loading={loading && !reporte}
        />
        <StatCard value={resumen.clientes_distintos} label="Clientes atendidos" sublabel="Clientes distintos" loading={loading && !reporte} />
        <StatCard
          value={formatDuracion(resumen.minutos_atendidos)}
          label="Tiempo atendido"
          sublabel={
            resumen.sin_horario > 0
              ? `${resumen.sin_horario} sin hora de inicio o fin`
              : `${formatDuracion(resumen.duracion_promedio_min)} por atención`
          }
          loading={loading && !reporte}
        />
      </StatGrid>

      <div className={styles.charts}>
        <ChartPanel
          title="Ranking de personal"
          note={`Atenciones por persona${localId ? ` en ${bloque.local_nombre || 'este local'}` : ' en todos los locales'}.`}
          loading={loading}
          empty={sinDatos}
        >
          <RankedBars
            items={ranking.map((p) => ({
              key: `${p.empleado_id ?? 'n'}-${p.nombre}`,
              label: p.nombre,
              value: p.atenciones,
              hint: [p.cargo, `${p.dias_trabajados} ${p.dias_trabajados === 1 ? 'día' : 'días'}`].filter(Boolean).join(' · '),
            }))}
            format={(v) => String(v)}
            tone="egreso"
            maxItems={10}
            showShare
          />
        </ChartPanel>
        <ChartPanel title="Atenciones por día" note="Cuántas atenciones se registraron cada día del periodo." loading={loading} empty={sinDatos}>
          <TimeSeriesChart
            data={serie}
            series={[{ key: 'atenciones', label: 'Atenciones', color: 'var(--admin-chart-egreso)' }]}
            format={(v) => String(v)}
            ariaLabel="Atenciones por día en el periodo"
          />
        </ChartPanel>
      </div>

      {!localId && reporte && reporte.locales.length > 1 && (
        <ChartPanel title="Atenciones por local" note="Total de cada local y quién atendió más ahí." loading={loading}>
          <RankedBars
            items={reporte.locales.map((l) => ({
              key: `${l.local_id ?? 'n'}-${l.local_nombre}`,
              label: l.local_nombre,
              value: l.resumen.atenciones,
              hint: l.ranking[0] ? `Lidera ${l.ranking[0].nombre} (${l.ranking[0].atenciones})` : undefined,
            }))}
            format={(v) => String(v)}
            tone="ingreso"
            showShare
          />
        </ChartPanel>
      )}

      <SectionLabel withLine>Detalle por persona</SectionLabel>
      <DataTable<PersonalRow>
        columns={columnas}
        data={ranking as PersonalRow[]}
        loading={loading && !reporte}
        onRefresh={reload}
        getRowKey={(r) => `${r.empleado_id ?? 'n'}-${r.nombre}`}
        searchPlaceholder="Buscar persona o servicio…"
        emptyMessage="Nadie registró atenciones en este periodo"
      />
      <p className={panel.note}>
        Se cuentan las atenciones activas por su fecha de atención. El tiempo solo suma las atenciones que tienen hora de inicio y de fin.
        “Sin ficha de empleado” es un nombre escrito a mano al registrar la atención, que no está en Empleados.
      </p>

      <SectionLabel withLine>Quién registró las atenciones</SectionLabel>
      <DataTable<RegistradorRow>
        columns={columnasRegistro}
        data={bloque.registradores as RegistradorRow[]}
        loading={loading && !reporte}
        getRowKey={(r) => r.usuario}
        hideSearch
        emptyMessage="Sin registros en este periodo"
      />
    </div>
  );
}
