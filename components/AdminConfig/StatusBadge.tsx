import styles from './StatusBadge.module.css';

export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface StatusBadgeProps {
  tone?: BadgeTone;
  icon?: React.ReactNode;
  title?: string;
  children: React.ReactNode;
}

/** Píldora de estado (PAGADO, bajo stock, ANULADO…). */
export function StatusBadge({ tone = 'neutral', icon, title, children }: StatusBadgeProps) {
  return (
    <span className={`${styles.badge} ${styles[tone]}`} title={title}>
      {icon}
      {children}
    </span>
  );
}
