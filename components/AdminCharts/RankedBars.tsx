'use client';

import { useState } from 'react';
import { CursorPagination } from '@/components/AdminConfig/CursorPagination';
import styles from './RankedBars.module.css';

export interface RankedItem {
  key: string;
  label: string;
  value: number;
  /** Texto secundario bajo el nombre (ej. "12 pagos · ticket Bs 45"). */
  hint?: string;
}

interface RankedBarsProps {
  items: RankedItem[];
  format: (value: number) => string;
  /** ingreso = azul, egreso = magenta: los mismos colores en todos los gráficos de dinero. */
  tone?: 'ingreso' | 'egreso' | 'neutral';
  /** Filas por página. Nunca se agrupa nada: el resto se ve en las páginas siguientes. */
  pageSize?: number;
  /** Muestra el porcentaje del total junto al valor. */
  showShare?: boolean;
}

/**
 * Ranking horizontal de una sola medida. Un único color (el color no codifica el valor), el valor escrito al final de
 * cada barra y sin leyenda: no hace falta pasar el mouse para leer nada. Muestra todas las filas, paginadas.
 */
export function RankedBars({ items, format, tone = 'ingreso', pageSize = 10, showShare = false }: RankedBarsProps) {
  const ordenados = [...items].filter((i) => i.value > 0).sort((a, b) => b.value - a.value);
  const total = ordenados.reduce((s, i) => s + i.value, 0);
  // La escala es la misma en todas las páginas: la barra más larga siempre es el primer puesto.
  const max = Math.max(ordenados[0]?.value ?? 0, 1);
  const totalPages = Math.max(Math.ceil(ordenados.length / pageSize), 1);

  // Si cambian los datos (otro periodo, otro local) se vuelve a la primera página.
  const firma = ordenados.map((i) => i.key).join('|');
  const [estado, setEstado] = useState({ firma, page: 1 });
  if (estado.firma !== firma) setEstado({ firma, page: 1 });
  const page = estado.firma === firma ? Math.min(estado.page, totalPages) : 1;

  const inicio = (page - 1) * pageSize;
  const filas = ordenados.slice(inicio, inicio + pageSize);

  return (
    <div className={styles.wrap}>
      <ol className={`${styles.list} ${styles[tone]}`} start={inicio + 1}>
        {filas.map((f, i) => {
          const pct = total > 0 ? Math.round((f.value / total) * 100) : 0;
          const puesto = inicio + i + 1;
          return (
            <li
              key={f.key}
              className={styles.row}
              tabIndex={0}
              title={`${puesto}. ${f.label}: ${format(f.value)}${showShare ? ` (${pct}%)` : ''}`}
              aria-label={`Puesto ${puesto}, ${f.label}: ${format(f.value)}${showShare ? `, ${pct}% del total` : ''}`}
            >
              <span className={styles.label}>
                <span className={styles.name}>
                  {totalPages > 1 && <span className={styles.rank}>{puesto}.</span>}
                  {f.label}
                </span>
                {f.hint && <span className={styles.hint}>{f.hint}</span>}
              </span>
              <span className={styles.track} aria-hidden>
                <span className={styles.bar} style={{ width: `${(f.value / max) * 100}%` }} />
              </span>
              <span className={styles.value}>
                {format(f.value)}
                {showShare && <span className={styles.share}>{pct}%</span>}
              </span>
            </li>
          );
        })}
      </ol>
      <CursorPagination
        page={page}
        totalPages={totalPages}
        hasNext={page < totalPages}
        onPrevious={() => setEstado({ firma, page: page - 1 })}
        onNext={() => setEstado({ firma, page: page + 1 })}
      />
    </div>
  );
}
