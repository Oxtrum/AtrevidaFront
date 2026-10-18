'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { AlertBanner, DataTable, FilterBar, LocalSelect, SectionLabel } from '@/components/AdminConfig';
import type { Column } from '@/components/AdminConfig';
import { getAlertasInventario } from '@/lib/api/inventario';
import { getAdminLocalScope } from '@/lib/api/localScope';
import { useAsyncData } from '@/lib/hooks/useAsyncData';
import { formatDateISO, formatQty } from '@/lib/utils/format';
import type { AlertaReservaInventario, InventarioItem } from '@/types/inventario';
import { StockBadge } from './StockBadge';
import styles from './AdminInventario.module.css';

type ItemRow = InventarioItem & Record<string, unknown>;
type ReservaRow = AlertaReservaInventario & Record<string, unknown>;

/** Qué hay que reponer ya: ítems bajo mínimo + reservas futuras sin stock para su servicio. */
export function AlertasTab() {
  const [localId, setLocalId] = useState(String(getAdminLocalScope()?.local_id ?? ''));
  const { data, loading, error, reload } = useAsyncData(
    () => getAlertasInventario(localId ? Number(localId) : undefined),
    `alertas-${localId}`,
  );

  const itemColumns: Column<ItemRow>[] = [
    {
      key: 'nombre',
      label: 'Ítem',
      render: (_v, row) => (
        <span className={styles.itemCell}>
          <span>
            <span className={styles.itemName}>{row.nombre}</span>
            <span className={styles.itemCode}>{row.codigo}</span>
          </span>
        </span>
      ),
    },
    { key: 'local_nombre', label: 'Local', render: (v) => (v as string) || <span className={styles.muted}>—</span> },
    { key: 'stock_actual', label: 'Stock', render: (_v, r) => <span className={`${styles.num} ${r.stock_actual <= 0 ? styles.negative : ''}`}>{formatQty(r.stock_actual, r.unidad_medida)}</span> },
    { key: 'stock_minimo', label: 'Mínimo', render: (_v, r) => <span className={`${styles.num} ${styles.muted}`}>{formatQty(r.stock_minimo, r.unidad_medida)}</span> },
    { key: 'estado', label: 'Estado', searchable: false, render: (_v, r) => <StockBadge item={r} /> },
  ];

  const reservaColumns: Column<ReservaRow>[] = [
    { key: 'fecha', label: 'Fecha', render: (_v, r) => `${formatDateISO(r.fecha)} ${r.hora_desde}` },
    { key: 'cliente', label: 'Cliente' },
    { key: 'servicio', label: 'Servicio' },
    { key: 'local', label: 'Local' },
    {
      key: 'advertencias',
      label: 'Falta',
      searchable: false,
      render: (_v, r) => (
        <ul className={styles.warnList}>
          {r.advertencias.map((a) => (
            <li key={a.item_id}>{a.item_nombre}: necesita {formatQty(a.requerido, a.unidad)}, hay {formatQty(a.disponible, a.unidad)}</li>
          ))}
        </ul>
      ),
    },
    {
      key: 'ver',
      label: '',
      searchable: false,
      render: (_v, r) => <Link href={`/atrevida-gestion/reservas/editar/${r.reserva_id}`} className="admin-button admin-button-secondary">Ver reserva</Link>,
    },
  ];

  const sinAlertas = data && data.items_bajo_stock.length === 0 && data.reservas_con_alerta.length === 0;

  return (
    <div className={styles.stack}>
      {!getAdminLocalScope() && (
        <FilterBar>
          <FilterBar.Item label="Local">
            <LocalSelect value={localId} onChange={setLocalId} emptyLabel="Todos los locales" />
          </FilterBar.Item>
        </FilterBar>
      )}
      {sinAlertas && (
        <AlertBanner tone="info" title="Todo en orden">
          No hay ítems bajo stock ni reservas con advertencia de inventario.
        </AlertBanner>
      )}

      <SectionLabel icon={<AlertTriangle size={13} />}>Ítems bajo stock mínimo (por local)</SectionLabel>
      <DataTable<ItemRow>
        columns={itemColumns}
        data={(data?.items_bajo_stock ?? []) as ItemRow[]}
        loading={loading}
        error={error}
        onRefresh={reload}
        getRowKey={(i) => `${i.id}-${i.local_id ?? 0}`}
        hideSearch
        emptyMessage="Ningún ítem bajo su mínimo"
      />

      <SectionLabel>Reservas próximas con advertencia de inventario</SectionLabel>
      <DataTable<ReservaRow>
        columns={reservaColumns}
        data={(data?.reservas_con_alerta ?? []) as ReservaRow[]}
        loading={loading}
        error={error}
        getRowKey={(r) => r.reserva_id}
        hideSearch
        emptyMessage="Ninguna reserva futura queda sin insumos"
      />
    </div>
  );
}
