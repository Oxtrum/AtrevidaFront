import styles from './StatCard.module.css';

interface StatCardProps {
  value: string | number;
  label: string;
  sublabel?: string;
  accentColor?: string;
  loading?: boolean;
}

interface StatGridProps {
  children: React.ReactNode;
}

export function StatCard({ value, label, sublabel, accentColor, loading }: StatCardProps) {
  return (
    <div
      className={styles.card}
      style={accentColor ? ({ '--stat-accent': accentColor } as React.CSSProperties) : undefined}
    >
      {accentColor && <div className={styles.accentBar} />}
      <strong className={styles.value}>{loading ? '—' : value}</strong>
      <span className={styles.label}>{label}</span>
      {sublabel && <span className={styles.sublabel}>{sublabel}</span>}
    </div>
  );
}

export function StatGrid({ children }: StatGridProps) {
  return <div className={styles.grid}>{children}</div>;
}
