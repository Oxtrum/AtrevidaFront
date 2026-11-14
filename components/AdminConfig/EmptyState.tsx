import styles from './EmptyState.module.css';

interface EmptyStateProps {
  title: string;
  /** Una línea que diga qué hacer: cambiar el filtro, crear el primero… */
  hint?: string;
  icon?: React.ReactNode;
  /** Mientras carga: muestra un indicador y avisa a lectores de pantalla. */
  loading?: boolean;
}

/** Cargando o sin resultados en una lista. Una sola forma para todo el panel. */
export function EmptyState({ title, hint, icon, loading = false }: EmptyStateProps) {
  return (
    <div className={styles.state} role={loading ? 'status' : undefined} aria-live="polite">
      {loading ? <span className={styles.spinner} aria-hidden /> : icon && <span className={styles.icon} aria-hidden>{icon}</span>}
      <p className={styles.title}>{title}</p>
      {hint && !loading && <p className={styles.hint}>{hint}</p>}
    </div>
  );
}
