'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CursorPagination, DataTable, FilterBar, LocalSelect, StatusBadge } from '@/components/AdminConfig';
import type { Column } from '@/components/AdminConfig';
import { CustomSelect } from '@/components/Custom/CustomSelectAdmin';
import { getMovimientosInventario } from '@/lib/api/inventario';
import { getAdminLocalScope } from '@/lib/api/localScope';
import { PAGE_LIMIT } from '@/lib/api/pagination';
import { useCursorPagination } from '@/lib/hooks/useCursorPagination';
import { formatDateTimeISO, formatQty } from '@/lib/utils/format';
import { TIPOS_MOVIMIENTO_ENTRADA, TIPOS_MOVIMIENTO_LABEL } from '@/types/inventario';
import type { MovimientoInventario, TipoMovimientoInventario } from '@/types/inventario';
import styles from './AdminInventario.module.css';

type Row = MovimientoInventario & Record<string, unknown>;

/** Kardex: historial de entradas, salidas y ajustes con el stock resultante (RN-02/03). */
export function MovimientosTab() {
  const [localId, setLocalId] = useState(String(getAdminLocalScope()?.local_id ?? ''));
  const [tipo, setTipo] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(q.trim()), 350);
    return () => window.clearTimeout(t);
  }, [q]);

  const filters = useMemo(
    () => ({
      local_id: localId ? Number(localId) : undefined,
      tipo: (tipo || undefined) as TipoMovimientoInventario | undefined,
      fecha_desde: desde || undefined,
      fecha_hasta: hasta || undefined,
      q: debouncedQ || undefined,
    }),
    [localId, tipo, desde, hasta, debouncedQ],
  );
  const pagination = useCursorPagination(JSON.stringify(filters));
  const { cursor, requestRevision, shouldIncludeTotal, setMetadata } = pagination;

  const [rows, setRows] = useState<MovimientoInventario[]>([]);
  const [total, setTotal] = useState<number | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    void requestRevision;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const id = ++requestRef.current;
    setLoading(true);
    setError(null);
    try {
      const res = await getMovimientosInventario({ ...filters, limit: PAGE_LIMIT, cursor, include_total: shouldIncludeTotal() }, controller.signal);
      if (id !== requestRef.current) return;
      setRows(res.movimientos);
      if (res.paginacion?.total_registros !== undefined) setTotal(res.paginacion.total_registros);
      setMetadata(res.paginacion);
    } catch (err) {
      if (controller.signal.aborted || id !== requestRef.current) return;
      setError(err instanceof Error ? err.message : 'Error al cargar movimientos');
    } finally {
      if (id === requestRef.current) setLoading(false);
    }
  }, [filters, cursor, requestRevision, shouldIncludeTotal, setMetadata]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => () => {
    requestRef.current += 1;
    controllerRef.current?.abort();
  }, []);

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
        <FilterBar.Item label="Buscar" grow>
          <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ítem, local o motivo…" />
        </FilterBar.Item>
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
        data={rows as Row[]}
        loading={loading}
        error={error}
        onRefresh={load}
        getRowKey={(m) => m.id}
        hideSearch
        emptyMessage="Sin movimientos para estos filtros"
      />
      <CursorPagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        hasNext={pagination.hasNext}
        loading={loading}
        onPrevious={pagination.previous}
        onNext={pagination.next}
      />
      {total !== undefined && (
        <p className={styles.muted} style={{ textAlign: 'center', margin: '0.25rem 0 0' }}>
          {total.toLocaleString('es-BO')} {total === 1 ? 'movimiento' : 'movimientos'} con estos filtros
        </p>
      )}
    </>
  );
}
