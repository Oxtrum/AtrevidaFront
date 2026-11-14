'use client';

import { usePathname } from 'next/navigation';
import Header from '@/components/AdminHeader/Header';
import styles from './AdminShell.module.css';

const LOGIN_PATH = '/atrevida-gestion/login';

/**
 * Armazon de todas las paginas del panel: fondo, menu lateral y contenedor con el espacio entre secciones.
 * Vive en el layout del panel: una pagina solo devuelve su contenido y cada hijo directo queda separado por el
 * mismo espacio. El login no lo usa.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === LOGIN_PATH) return <>{children}</>;

  return (
    <div className={styles.pageContainer}>
      <div className="admin-mesh" />
      <Header />
      <main className={styles.main}>
        <div className={`${styles.container} admin-stack`}>{children}</div>
      </main>
    </div>
  );
}
