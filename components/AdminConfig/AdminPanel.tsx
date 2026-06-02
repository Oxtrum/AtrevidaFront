import { forwardRef } from 'react';
import styles from './AdminPanel.module.css';

interface AdminPanelProps {
  children: React.ReactNode;
  accentStripe?: boolean;
  className?: string;
}

export const AdminPanel = forwardRef<HTMLDivElement, AdminPanelProps>(
  ({ children, accentStripe, className }, ref) => {
    return (
      <div ref={ref} className={`${styles.panel} ${accentStripe ? styles.stripe : ''} ${className ?? ''}`}>
        {children}
      </div>
    );
  }
);

AdminPanel.displayName = 'AdminPanel';
