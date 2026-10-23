'use client';

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { compactNumber, formatDia } from './chartFormat';
import styles from './TimeSeriesChart.module.css';

export interface SeriesDef {
  key: string;
  label: string;
  /** Color del trazo: un token (var(--admin-chart-ingreso)). */
  color: string;
}

export interface SeriesPoint {
  /** Fecha ISO YYYY-MM-DD. */
  x: string;
  [serie: string]: number | string;
}

interface TimeSeriesChartProps {
  data: SeriesPoint[];
  series: SeriesDef[];
  format: (value: number) => string;
  /** Texto accesible del gráfico. */
  ariaLabel: string;
}

interface TooltipPayload {
  dataKey?: string | number;
  value?: number | string;
}

function ChartTooltip({
  active, payload, label, series, format,
}: { active?: boolean; payload?: TooltipPayload[]; label?: string | number; series: SeriesDef[]; format: (v: number) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipDay}>{formatDia(String(label), true)}</p>
      {series.map((s) => {
        const v = payload.find((p) => p.dataKey === s.key)?.value;
        return (
          <div key={s.key} className={styles.tooltipRow} style={{ ['--series-color' as string]: s.color }}>
            <span className={styles.key} aria-hidden />
            <span className={styles.tooltipName}>{s.label}</span>
            <span className={styles.tooltipValue}>{format(Number(v ?? 0))}</span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Evolución diaria de una o más series de dinero: líneas de 2px, cuadrícula horizontal recesiva, guía vertical que
 * sigue al cursor y un solo tooltip con todas las series. La leyenda trae el total del periodo y hay una tabla equivalente.
 */
export function TimeSeriesChart({ data, series, format, ariaLabel }: TimeSeriesChartProps) {
  const totales = series.map((s) => ({ ...s, total: data.reduce((acc, p) => acc + Number(p[s.key] ?? 0), 0) }));
  const conDatos = data.filter((p) => series.some((s) => Number(p[s.key] ?? 0) !== 0));

  return (
    <div className={styles.wrap}>
      <ul className={styles.legend}>
        {totales.map((s) => (
          <li key={s.key} className={styles.legendItem} style={{ ['--series-color' as string]: s.color }}>
            <span className={styles.key} aria-hidden />
            {s.label}
            <span className={styles.legendValue}>{format(s.total)}</span>
          </li>
        ))}
      </ul>

      <div className={styles.plot} role="img" aria-label={ariaLabel}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--admin-chart-grid)" />
            <XAxis
              dataKey="x"
              tickFormatter={(v) => formatDia(String(v))}
              tickLine={false}
              axisLine={{ stroke: 'var(--admin-chart-grid)' }}
              tick={{ fill: 'var(--admin-text-muted)', fontSize: 11 }}
              minTickGap={28}
              tickMargin={8}
            />
            <YAxis
              tickFormatter={(v) => compactNumber(Number(v))}
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'var(--admin-text-muted)', fontSize: 11 }}
              width={44}
            />
            <Tooltip
              cursor={{ stroke: 'var(--admin-border-strong)', strokeWidth: 1 }}
              content={<ChartTooltip series={series} format={format} />}
            />
            {series.map((s) => (
              <Line
                key={s.key}
                type="linear"
                dataKey={s.key}
                stroke={s.color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                dot={false}
                activeDot={{ r: 4, fill: s.color, stroke: 'var(--admin-chart-surface)', strokeWidth: 2 }}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <details className={styles.table}>
        <summary>Ver como tabla</summary>
        <div className={styles.tableScroll}>
          <table>
            <thead>
              <tr>
                <th scope="col">Día</th>
                {series.map((s) => <th key={s.key} scope="col">{s.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {conDatos.map((p) => (
                <tr key={p.x}>
                  <td>{formatDia(p.x, true)}</td>
                  {series.map((s) => <td key={s.key}>{format(Number(p[s.key] ?? 0))}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
