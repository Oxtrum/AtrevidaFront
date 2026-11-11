import styles from './StatCard.module.css';

interface StatCardProps {
  value: string | number;
  label: string;
  sublabel?: string;
  accentColor?: string;
  loading?: boolean;
  /** Convierte la tarjeta en filtro/acción conservando la estética del resumen. */
  onClick?: () => void;
  active?: boolean;
}

interface StatGridProps {
  children: React.ReactNode;
}

export function StatCard({ value, label, sublabel, accentColor, loading, onClick, active = false }: StatCardProps) {
  const content = (
    <>
      {accentColor && <div className={styles.accentBar} />}
      <strong className={styles.value}>{loading ? '—' : value}</strong>
      <span className={styles.label}>{label}</span>
      {sublabel && <span className={styles.sublabel}>{sublabel}</span>}
    </>
  );

  const className = `${styles.card} ${onClick ? styles.interactive : ''} ${active ? styles.active : ''}`;
  const style = accentColor ? ({ '--stat-accent': accentColor } as React.CSSProperties) : undefined;

  if (onClick) {
    return <button type="button" className={className} style={style} onClick={onClick} aria-pressed={active}>{content}</button>;
  }
  return <div className={className} style={style}>{content}</div>;
}

export function StatGrid({ children }: StatGridProps) {
  return <div className={styles.grid}>{children}</div>;
}
