import styles from './AdminPanel.module.css';

interface AdminPanelProps {
  children: React.ReactNode;
  accentStripe?: boolean;
  className?: string;
}

export function AdminPanel({ children, accentStripe, className }: AdminPanelProps) {
  return (
    <div className={`${styles.panel} ${accentStripe ? styles.stripe : ''} ${className ?? ''}`}>
      {children}
    </div>
  );
}
