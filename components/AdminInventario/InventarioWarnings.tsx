import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { AlertBanner } from '@/components/AdminConfig';
import { formatQty } from '@/lib/utils/format';
import type { AdvertenciaInventario } from '@/types/inventario';
import styles from './AdminInventario.module.css';

/**
 * Banner no bloqueante tras crear/agendar una reserva sin stock suficiente
 * (RN-12). La reserva ya quedó guardada; esto solo informa.
 */
export function InventarioWarningBanner({ advertencias }: { advertencias: AdvertenciaInventario[] }) {
  if (advertencias.length === 0) return null;
  return (
    <AlertBanner
      tone="warning"
      title="La reserva se guardó, pero falta stock para este servicio"
      action={<Link href="/atrevida-gestion/inventario" className="admin-button admin-button-secondary">Ir a Inventario</Link>}
    >
      <ul className={styles.warnList}>
        {advertencias.map((a) => (
          <li key={a.item_id}>
            {a.item_nombre}: requiere {formatQty(a.requerido, a.unidad)}, disponible {formatQty(a.disponible, a.unidad)}
          </li>
        ))}
      </ul>
    </AlertBanner>
  );
}

/** Badge "⚠ inventario" para listados de reservas (alerta_inventario = true). */
export function InventarioAlertBadge({ title = 'Stock insuficiente para los insumos de este servicio' }: { title?: string }) {
  return (
    <span className={styles.alertBadge} title={title}>
      <AlertTriangle size={11} strokeWidth={2.2} />
      Inventario
    </span>
  );
}
