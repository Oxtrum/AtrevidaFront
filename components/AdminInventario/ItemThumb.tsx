import { Package } from 'lucide-react';
import styles from './AdminInventario.module.css';

/** Miniatura del ítem; ícono genérico si no hay imagen. */
export function ItemThumb({ url, name }: { url?: string | null; name: string }) {
  return (
    <span className={styles.thumb}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- URL del storage externo
        <img src={url} alt={name} className={styles.thumbImg} loading="lazy" />
      ) : (
        <Package size={18} strokeWidth={1.5} />
      )}
    </span>
  );
}
