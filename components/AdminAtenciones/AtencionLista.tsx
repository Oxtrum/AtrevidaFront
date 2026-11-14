import { AdminPanel, EmptyState } from '@/components/AdminConfig';
import styles from './AtencionLista.module.css';

interface AtencionListaProps {
  /** Cuántas filas hay. Con 0 se muestra el estado vacío. */
  total: number;
  loading: boolean;
  /** Mensaje cuando no hay filas; `hint` dice qué hacer. */
  vacio: { title: string; hint?: string };
  children: React.ReactNode;
}

/** Lista de AtencionFila con su cargando y sin resultados. Todas las pestañas la usan igual. */
export function AtencionLista({ total, loading, vacio, children }: AtencionListaProps) {
  if (total === 0) {
    return (
      <AdminPanel className={styles.lista}>
        <EmptyState loading={loading} title={loading ? 'Cargando…' : vacio.title} hint={vacio.hint} />
      </AdminPanel>
    );
  }
  return <section className={`${styles.lista} ${loading ? styles.recargando : ''}`} aria-busy={loading}>{children}</section>;
}

/** Bloque de filas con título (Mañana, Tarde…). Sin título, solo agrupa. */
export function AtencionGrupo({ titulo, cantidad, children }: { titulo?: string; cantidad?: number; children: React.ReactNode }) {
  return (
    <div className={styles.grupo}>
      {titulo && <h3 className={styles.grupoTitulo}>{titulo}{cantidad !== undefined && <span>{cantidad}</span>}</h3>}
      {children}
    </div>
  );
}
