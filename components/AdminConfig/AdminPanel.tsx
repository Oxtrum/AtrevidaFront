import { forwardRef } from 'react';
import styles from './AdminPanel.module.css';

interface AdminPanelProps {
  children: React.ReactNode;
  accentStripe?: boolean;
  className?: string;
  /** Pinta el panel como card (misma superficie que FilterBar). */
  card?: boolean;
  /** Cabecera de card: título, descripción e icono opcionales. */
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  tone?: 'primary' | 'info';
}

export const AdminPanel = forwardRef<HTMLDivElement, AdminPanelProps>(
  ({ children, accentStripe, className, card, title, description, icon, tone = 'primary' }, ref) => {
    const cls = [
      styles.panel,
      accentStripe && styles.stripe,
      card && styles.card,
      card && tone === 'info' && styles.toneInfo,
      className,
    ].filter(Boolean).join(' ');
    return (
      <div ref={ref} className={cls}>
        {title && (
          <header className={styles.head}>
            {icon && <span className={styles.icon} aria-hidden>{icon}</span>}
            <div>
              <h2 className={styles.title}>{title}</h2>
              {description && <p className={styles.desc}>{description}</p>}
            </div>
          </header>
        )}
        {children}
      </div>
    );
  }
);

AdminPanel.displayName = 'AdminPanel';
