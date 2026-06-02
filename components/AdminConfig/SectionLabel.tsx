import styles from './SectionLabel.module.css';

interface SectionLabelProps {
  icon?: React.ReactNode;
  children: React.ReactNode;
  withLine?: boolean;
}

export function SectionLabel({ icon, children, withLine }: SectionLabelProps) {
  return (
    <div className={`${styles.root} ${withLine ? styles.withLine : ''}`}>
      {icon && <span className={styles.icon}>{icon}</span>}
      <span className={styles.label}>{children}</span>
      {withLine && <span className={styles.line} aria-hidden />}
    </div>
  );
}
