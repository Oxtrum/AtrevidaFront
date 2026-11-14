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
  /** Muestra las N mayores y agrupa el resto en "Otros" (gris). */
  maxItems?: number;
  /** Muestra el porcentaje del total junto al valor. */
  showShare?: boolean;
}

/**
 * Ranking horizontal de una sola medida. Un único color (el color no codifica el valor), el valor escrito al final de
 * cada barra y sin leyenda: no hace falta pasar el mouse para leer nada.
 */
export function RankedBars({ items, format, tone = 'ingreso', maxItems = 8, showShare = false }: RankedBarsProps) {
  const ordenados = [...items].filter((i) => i.value > 0).sort((a, b) => b.value - a.value);
  const visibles = ordenados.slice(0, maxItems);
  const resto = ordenados.slice(maxItems);
  const filas: (RankedItem & { otros?: boolean })[] = resto.length
    ? [...visibles, { key: '__otros', label: `Otros (${resto.length})`, value: resto.reduce((s, i) => s + i.value, 0), otros: true }]
    : visibles;
  const total = ordenados.reduce((s, i) => s + i.value, 0);
  const max = Math.max(...filas.map((f) => f.value), 1);

  return (
    <ul className={`${styles.list} ${styles[tone]}`}>
      {filas.map((f) => {
        const pct = total > 0 ? Math.round((f.value / total) * 100) : 0;
        return (
          <li
            key={f.key}
            className={`${styles.row} ${f.otros ? styles.others : ''}`}
            tabIndex={0}
            title={`${f.label}: ${format(f.value)}${showShare ? ` (${pct}%)` : ''}`}
            aria-label={`${f.label}: ${format(f.value)}${showShare ? `, ${pct}% del total` : ''}`}
          >
            <span className={styles.label}>
              <span className={styles.name}>{f.label}</span>
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
    </ul>
  );
}
