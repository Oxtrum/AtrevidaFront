import styles from './ShareBar.module.css';

export interface ShareItem {
  key: string;
  label: string;
  value: number;
}

interface ShareBarProps {
  items: ShareItem[];
  format: (value: number) => string;
}

/**
 * Parte de un todo con pocas categorías (ej. tipo de pago): una barra al 100% y debajo cada valor con su porcentaje.
 * Reemplaza a la dona, que no deja comparar porciones parecidas. Las dos primeras categorías usan azul y magenta; el resto, gris.
 */
export function ShareBar({ items, format }: ShareBarProps) {
  const filas = [...items].filter((i) => i.value > 0).sort((a, b) => b.value - a.value);
  const total = filas.reduce((s, i) => s + i.value, 0);
  const pct = (v: number) => (total > 0 ? Math.round((v / total) * 100) : 0);

  return (
    <div className={styles.wrap}>
      <div className={styles.bar} role="img" aria-label={filas.map((f) => `${f.label} ${pct(f.value)}%`).join(', ')}>
        {filas.map((f, i) => (
          <span
            key={f.key}
            className={`${styles.segment} ${styles[`c${Math.min(i, 2)}`]}`}
            style={{ flexGrow: f.value }}
            tabIndex={0}
            title={`${f.label}: ${format(f.value)} (${pct(f.value)}%)`}
          />
        ))}
      </div>
      <ul className={styles.legend}>
        {filas.map((f, i) => (
          <li key={f.key} className={`${styles.item} ${styles[`c${Math.min(i, 2)}`]}`}>
            <span className={styles.swatch} aria-hidden />
            <span className={styles.name}>{f.label}</span>
            <span className={styles.value}>{format(f.value)}</span>
            <span className={styles.pct}>{pct(f.value)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
