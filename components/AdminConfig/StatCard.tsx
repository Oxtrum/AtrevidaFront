import styles from './StatCard.module.css';

interface StatCardProps {
  value: string | number;
  label: string;
  sublabel?: string;
  /** Color suelto. Preferir `tone`, que sigue el tema y coincide con StatusBadge. */
  accentColor?: string;
  tone?: 'info' | 'success' | 'warning' | 'danger';
  loading?: boolean;
  /** Convierte la tarjeta en filtro/acción conservando la estética del resumen. */
  onClick?: () => void;
  active?: boolean;
}

interface StatGridProps {
  children: React.ReactNode;
}

const TONO_COLOR = {
  // Mismos colores que StatusBadge y el riel de ReservaRow.
  info: 'var(--admin-accent-tertiary)',
  success: '#34d399',
  warning: '#fbbf24',
  danger: 'var(--admin-accent-danger)',
} as const;

export function StatCard({ value, label, sublabel, accentColor, tone, loading, onClick, active = false }: StatCardProps) {
  const acento = tone ? TONO_COLOR[tone] : accentColor;
  const content = (
    <>
      {acento && <div className={styles.accentBar} />}
      <strong className={styles.value}>{loading ? '—' : value}</strong>
      <span className={styles.label}>{label}</span>
      {sublabel && <span className={styles.sublabel}>{sublabel}</span>}
    </>
  );

  const className = `${styles.card} ${onClick ? styles.interactive : ''} ${active ? styles.active : ''}`;
  const style = acento ? ({ '--stat-accent': acento } as React.CSSProperties) : undefined;

  if (onClick) {
    return <button type="button" className={className} style={style} onClick={onClick} aria-pressed={active}>{content}</button>;
  }
  return <div className={className} style={style}>{content}</div>;
}

export function StatGrid({ children }: StatGridProps) {
  return <div className={styles.grid}>{children}</div>;
}
