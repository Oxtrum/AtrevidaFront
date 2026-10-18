import { AlertTriangle, Info, XCircle } from 'lucide-react';
import styles from './AlertBanner.module.css';

interface AlertBannerProps {
  tone?: 'warning' | 'info' | 'danger';
  title?: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}

/** Aviso en línea, no bloqueante (advertencias de inventario, errores de carga…). */
export function AlertBanner({ tone = 'warning', title, children, action }: AlertBannerProps) {
  const Icon = tone === 'danger' ? XCircle : tone === 'info' ? Info : AlertTriangle;
  return (
    <div className={`${styles.banner} ${styles[tone]}`} role={tone === 'danger' ? 'alert' : 'status'}>
      <Icon size={18} strokeWidth={1.9} className={styles.icon} />
      <div className={styles.body}>
        {title && <strong className={styles.title}>{title}</strong>}
        {children && <div className={styles.text}>{children}</div>}
      </div>
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
