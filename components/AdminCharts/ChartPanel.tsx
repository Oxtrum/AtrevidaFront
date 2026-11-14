import type { ReactNode } from 'react';
import styles from './ChartPanel.module.css';

interface ChartPanelProps {
  title: string;
  /** Qué se mide y en qué unidad; una línea. */
  note?: string;
  actions?: ReactNode;
  /** Recargando: el gráfico anterior se mantiene atenuado. */
  loading?: boolean;
  /** Si hay mensaje, reemplaza al gráfico. */
  empty?: string | null;
  children: ReactNode;
}

/** Contenedor común de los gráficos del admin: título, nota, estado vacío y recarga sin saltos. */
export function ChartPanel({ title, note, actions, loading, empty, children }: ChartPanelProps) {
  return (
    <section className={styles.panel} aria-busy={loading || undefined}>
      <div className={styles.head}>
        <div>
          <h3 className={styles.title}>{title}</h3>
          {note && <p className={styles.note}>{note}</p>}
        </div>
        {actions}
      </div>
      {empty ? <p className={styles.empty}>{empty}</p> : <div className={`${styles.body} ${loading ? styles.loading : ''}`}>{children}</div>}
    </section>
  );
}
