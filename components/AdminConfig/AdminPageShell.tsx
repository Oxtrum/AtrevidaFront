'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LockKeyhole } from 'lucide-react';
import Header from '@/components/AdminHeader/Header';
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
 * Esqueleto de toda página admin: guard de token, malla de fondo, sidebar y
 * contenedor. Reemplaza el boilerplate repetido en cada page.tsx.
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
    // setTimeout: el rol/token solo existen en el cliente (mismo patrón que Header).
    const timer = window.setTimeout(() => setState(next), 0);
    return () => window.clearTimeout(timer);
  }, [router, roles]);

  return (
    <div className={styles.pageContainer}>
      <div className="admin-mesh" />
      <Header />
      <main className={styles.main}>
        <div className={styles.container}>
          {state === 'ok' && children}
          {state === 'denied' && (
            <div className={styles.denied}>
              <LockKeyhole size={28} strokeWidth={1.5} />
              <p>{deniedMessage}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
