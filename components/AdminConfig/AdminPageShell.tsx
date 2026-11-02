'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LockKeyhole } from 'lucide-react';
import { getStoredAdminRole } from '@/lib/auth/adminSession';
import styles from './AdminPageShell.module.css';

interface AdminPageShellProps {
  children: React.ReactNode;
  /** Roles (`rol_codigo`) con acceso. Omitir = cualquier usuario autenticado. */
  roles?: string[];
  /** Mensaje cuando el rol no alcanza. */
  deniedMessage?: string;
}

/**
 * Control de acceso de una pagina: sin token manda al login y con un rol sin permiso muestra un aviso. El menu, el
 * fondo y el espacio entre secciones los pone AdminShell desde el layout del panel.
 */
export function AdminPageShell({
  children,
  roles,
  deniedMessage = 'Tu rol no tiene acceso a esta sección.',
}: AdminPageShellProps) {
  const router = useRouter();
  const [state, setState] = useState<'checking' | 'ok' | 'denied'>('checking');

  useEffect(() => {
    if (!window.localStorage.getItem('adminToken')) {
      router.push('/atrevida-gestion/login');
      return;
    }
    const role = getStoredAdminRole();
    const next = !roles || (role && roles.includes(role)) ? 'ok' : 'denied';
    // setTimeout: el rol/token solo existen en el cliente (mismo patron que Header).
    const timer = window.setTimeout(() => setState(next), 0);
    return () => window.clearTimeout(timer);
  }, [router, roles]);

  if (state === 'ok') return <>{children}</>;
  if (state === 'denied') {
    return (
      <div className={styles.denied}>
        <LockKeyhole size={28} strokeWidth={1.5} />
        <p>{deniedMessage}</p>
      </div>
    );
  }
  return null;
}
