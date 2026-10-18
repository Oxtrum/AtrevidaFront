'use client';

import { useMemo, useState } from 'react';
import { DataTable, FilterBar, LocalSelect, StatusBadge } from '@/components/AdminConfig';
import type { Column } from '@/components/AdminConfig';
import { CustomSelect } from '@/components/Custom/CustomSelectAdmin';
import { getMovimientosInventario } from '@/lib/api/inventario';
import { getAdminLocalScope } from '@/lib/api/localScope';
import { useAsyncData } from '@/lib/hooks/useAsyncData';
import { formatDateTimeISO, formatQty } from '@/lib/utils/format';
import { TIPOS_MOVIMIENTO_ENTRADA, TIPOS_MOVIMIENTO_LABEL } from '@/types/inventario';
import type { MovimientoInventario, TipoMovimientoInventario } from '@/types/inventario';
import styles from './AdminInventario.module.css';

type Row = MovimientoInventario & Record<string, unknown>;
const EMPTY: MovimientoInventario[] = [];

/** Kardex: historial de entradas, salidas y ajustes con el stock resultante (RN-02/03). */
export function MovimientosTab() {
  const [localId, setLocalId] = useState(String(getAdminLocalScope()?.local_id ?? ''));
  const [tipo, setTipo] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const params = useMemo(
    () => ({
      local_id: localId ? Number(localId) : undefined,
      tipo: (tipo || undefined) as TipoMovimientoInventario | undefined,
      fecha_desde: desde || undefined,
      fecha_hasta: hasta || undefined,
    }),
    [localId, tipo, desde, hasta],
  );
  const { data, loading, error, reload } = useAsyncData(() => getMovimientosInventario(params), JSON.stringify(params));

  const columns: Column<Row>[] = [
    { key: 'creado_en', label: 'Fecha', searchable: false, render: (v) => formatDateTimeISO(v as string) },
    { key: 'item_nombre', label: 'Ítem' },
    { key: 'local_nombre', label: 'Local' },
    {
      key: 'tipo',
      label: 'Tipo',
      render: (v) => {
        const t = v as TipoMovimientoInventario;
        return <StatusBadge tone={TIPOS_MOVIMIENTO_ENTRADA.includes(t) ? 'success' : 'warning'}>{TIPOS_MOVIMIENTO_LABEL[t]}</StatusBadge>;
      },
    },
    {
      key: 'cantidad',
      label: 'Cantidad',
      searchable: false,
      render: (_v, row) => {
        const entrada = TIPOS_MOVIMIENTO_ENTRADA.includes(row.tipo);
        return <span className={`${styles.num} ${entrada ? styles.positive : styles.negative}`}>{entrada ? '+' : '−'}{formatQty(row.cantidad)}</span>;
      },
    },
    {
      key: 'stock_resultante',
      label: 'Stock resultante',
      searchable: false,
      render: (v) => <span className={`${styles.num} ${(v as number) < 0 ? styles.negative : ''}`}>{formatQty(v as number)}</span>,
    },
    { key: 'motivo', label: 'Motivo / ref.', render: (_v, row) => row.motivo || (row.reserva_id ? `Reserva #${row.reserva_id}` : row.compra_id ? `Compra #${row.compra_id}` : '—') },
    { key: 'usuario_nombre', label: 'Usuario', render: (v) => (v as string) || '—' },
  ];

  return (
    <>
      <div className={styles.filterGap}>
      <FilterBar>
        {!getAdminLocalScope() && (
          <FilterBar.Item label="Local">
            <LocalSelect value={localId} onChange={setLocalId} emptyLabel="Todos los locales" />
          </FilterBar.Item>
        )}
        <FilterBar.Item label="Tipo">
          <CustomSelect
            value={tipo}
            onChange={setTipo}
            options={(Object.keys(TIPOS_MOVIMIENTO_LABEL) as TipoMovimientoInventario[]).map((t) => ({ value: t, label: TIPOS_MOVIMIENTO_LABEL[t] }))}
            placeholder="Todos"
            allowClear
            searchable={false}
          />
        </FilterBar.Item>
        <FilterBar.Item label="Desde">
          <input type="date" value={desde} max={hasta || undefined} onChange={(e) => setDesde(e.target.value)} />
        </FilterBar.Item>
        <FilterBar.Item label="Hasta">
          <input type="date" value={hasta} min={desde || undefined} onChange={(e) => setHasta(e.target.value)} />
        </FilterBar.Item>
      </FilterBar>
      </div>

      <DataTable<Row>
        columns={columns}
        data={(data ?? EMPTY) as Row[]}
        loading={loading}
        error={error}
        onRefresh={reload}
        getRowKey={(m) => m.id}
        searchPlaceholder="Buscar por ítem, local o motivo…"
        emptyMessage="Sin movimientos para estos filtros"
      />
    </>
  );
}
