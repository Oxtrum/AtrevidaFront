'use client';

import Link from 'next/link';
import { AlertTriangle, CalendarClock, PackageX } from 'lucide-react';
import { getGastosFijosProximos } from '@/lib/api/finanzas';
import { getAlertasInventario } from '@/lib/api/inventario';
import { isAdminSys } from '@/lib/auth/adminSession';
import { useAsyncData } from '@/lib/hooks/useAsyncData';
import { useConfiguracion } from '@/lib/hooks/useConfiguracion';
import { formatDateISO, formatMoney } from '@/lib/utils/format';
import styles from './DashboardTrastienda.module.css';

const noop = async () => [];

/** Singular si hay exactamente 1, plural si no. */
const plural = (n: number, uno: string, varios: string) => (n === 1 ? uno : varios);

/**
 * Resumen de trastienda para el dashboard: bajo stock, reservas con alerta de
 * inventario y gastos fijos por vencer. Si el backend aún no responde, no se
 * muestra nada (no debe romper el dashboard existente).
 */
export function DashboardTrastienda() {
  const { moneda } = useConfiguracion();
  const showFinance = typeof window !== 'undefined' && isAdminSys();
  const alertas = useAsyncData(getAlertasInventario, 'dash-alertas');
  const gastos = useAsyncData(showFinance ? getGastosFijosProximos : noop, `dash-gastos-${showFinance}`);

  if (alertas.error && gastos.error) return null;

  const bajo = alertas.data?.items_bajo_stock ?? [];
  const reservas = alertas.data?.reservas_con_alerta ?? [];
  const proximos = gastos.data ?? [];
  if (!alertas.loading && !gastos.loading && bajo.length === 0 && reservas.length === 0 && proximos.length === 0) return null;

  return (
    <section className={styles.grid} aria-label="Trastienda">
      {!alertas.error && bajo.length > 0 && (
        <Link href="/atrevida-gestion/inventario" className={styles.card}>
          <span className={styles.icon}><PackageX size={18} strokeWidth={1.8} /></span>
          <div className={styles.body}>
            <span className={styles.head}>
              <strong className={styles.value}>{bajo.length}</strong>
              <span className={styles.label}>{plural(bajo.length, 'ítem bajo stock', 'ítems bajo stock')}</span>
            </span>
            <span className={styles.detail}>{bajo.slice(0, 3).map((i) => i.nombre).join(', ')}{bajo.length > 3 ? ` y ${bajo.length - 3} más` : ''}</span>
          </div>
        </Link>
      )}
      {!alertas.error && reservas.length > 0 && (
        <Link href="/atrevida-gestion/inventario" className={`${styles.card} ${styles.warn}`}>
          <span className={styles.icon}><AlertTriangle size={18} strokeWidth={1.8} /></span>
          <div className={styles.body}>
            <span className={styles.head}>
              <strong className={styles.value}>{reservas.length}</strong>
              <span className={styles.label}>{plural(reservas.length, 'reserva próxima', 'reservas próximas')}</span>
            </span>
            <span className={styles.detail}>sin insumos suficientes</span>
          </div>
        </Link>
      )}
      {!gastos.error && proximos.length > 0 && (
        <Link href="/atrevida-gestion/finanzas" className={styles.card}>
          <span className={styles.icon}><CalendarClock size={18} strokeWidth={1.8} /></span>
          <div className={styles.body}>
            <span className={styles.head}>
              <strong className={styles.value}>{proximos.length}</strong>
              <span className={styles.label}>{plural(proximos.length, 'próximo gasto fijo', 'próximos gastos fijos')}</span>
            </span>
            {proximos.slice(0, 2).map((g) => (
              <span key={g.gasto_fijo_id} className={styles.detail}>
                {g.nombre} · {formatMoney(g.monto, moneda)} · vence {formatDateISO(g.fecha_cobro)}
              </span>
            ))}
            {proximos.length > 2 && <span className={styles.detail}>y {proximos.length - 2} más</span>}
          </div>
        </Link>
      )}
    </section>
  );
}
