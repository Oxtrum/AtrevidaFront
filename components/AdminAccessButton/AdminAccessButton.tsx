'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { clearStoredAdminSession, isStoredAdminTokenExpired } from '@/lib/auth/adminSession';
import styles from './AdminAccessButton.module.css';

interface AdminAccessButtonProps {
  variant?: 'desktop' | 'mobile';
  onNavigate?: () => void;
}

/**
 * Atajo a administración en el sitio público. Solo aparece si hay un token de
 * admin VIGENTE en localStorage (admin frecuente). Si el token está vencido lo
 * limpia para que el botón no quede colgado. No es un control de seguridad: el
 * acceso real lo decide el backend (login + cuenta activa).
 */
export default function AdminAccessButton({ variant = 'desktop', onNavigate }: AdminAccessButtonProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const token = window.localStorage.getItem('adminToken');
    if (!token) return;

    if (isStoredAdminTokenExpired()) {
      clearStoredAdminSession();
      return;
    }

    // Lectura de localStorage tras montar (evita mismatch de hidratación SSR).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShow(true);
  }, []);

  if (!show) return null;

  const className = variant === 'mobile'
    ? `${styles.mobile} mobileNavItem`
    : styles.desktop;

  return (
    <Link href="/atrevida-gestion/dashboard" className={className} onClick={onNavigate}>
      <ShieldCheck size={16} strokeWidth={1.9} />
      Ir a administración
    </Link>
  );
}
