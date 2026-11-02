'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Wallet } from 'lucide-react';
import { AdminPageShell, CursorPagination, DataTable, FilterBar, PageHeader, RowActionsMenu } from '@/components/AdminConfig';
import type { Column } from '@/components/AdminConfig';
import { ClientePopover, DeudaCliente } from '@/components/AdminClientes';
import { getDeudores } from '@/lib/api/cuenta';
import type { DeudorCliente } from '@/lib/api/cuenta';
import { PAGE_LIMIT } from '@/lib/api/pagination';
import { useCursorPagination } from '@/lib/hooks/useCursorPagination';
import { useServerSort } from '@/lib/hooks/useServerSort';
import { formatMoney } from '@/lib/utils/format';
import type { SortState } from '@/lib/utils/sortRows';

type Row = DeudorCliente & Record<string, unknown>;

/** Orden que aplica el servidor sin ordenar_por: la mayor deuda primero. Solo marca el header. */
const ORDEN_POR_DEFECTO: SortState = { key: 'deuda', dir: 'desc' };

/** Clientes con deuda, de mayor a menor. Desde aquí se abre la cuenta de cada uno. */
export default function CuentasPorCobrarPage() {
  const router = useRouter();
  const [busqueda, setBusqueda] = useState('');
  const [busquedaDebounced, setBusquedaDebounced] = useState('');
  const serverSort = useServerSort(ORDEN_POR_DEFECTO);
  const { params: sortParams } = serverSort;
  const pagination = useCursorPagination(`${busquedaDebounced}|${serverSort.key}`);
  const { cursor, requestRevision, shouldIncludeTotal, setMetadata } = pagination;

  const [deudores, setDeudores] = useState<DeudorCliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setBusquedaDebounced(busqueda.trim()), 350);
    return () => window.clearTimeout(t);
  }, [busqueda]);

  const cargar = useCallback(async () => {
    void requestRevision;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const id = ++requestRef.current;
    setLoading(true);
    setError(null);
    try {
      const res = await getDeudores(
        { busqueda: busquedaDebounced || undefined, limit: PAGE_LIMIT, cursor, include_total: shouldIncludeTotal(), ...sortParams },
        controller.signal,
      );
      if (id !== requestRef.current) return;
      setDeudores(res.deudores);
      setMetadata(res.paginacion);
    } catch (err) {
      if (controller.signal.aborted || id !== requestRef.current) return;
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las cuentas');
    } finally {
      if (id === requestRef.current) setLoading(false);
    }
  }, [busquedaDebounced, sortParams, cursor, requestRevision, shouldIncludeTotal, setMetadata]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  useEffect(() => () => {
    requestRef.current += 1;
    controllerRef.current?.abort();
  }, []);

  const verCliente = useCallback((row: DeudorCliente) => router.push(`/atrevida-gestion/clientes/${row.cliente_id}`), [router]);

  const columns: Column<Row>[] = useMemo(() => [
    {
      key: 'apellido',
      label: 'Cliente',
      searchable: false,
      render: (_v, row) => (
        <ClientePopover nombre={`${row.nombre} ${row.apellido}`.trim()} telefono={row.numero_telefono} clienteId={row.cliente_id} />
      ),
    },
    { key: 'numero_telefono', label: 'Teléfono', searchable: false },
    { key: 'total_cargos', label: 'Cargado', searchable: false, render: (_v, row) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatMoney(row.total_cargos)}</span> },
    { key: 'total_abonos', label: 'Abonado', searchable: false, render: (_v, row) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatMoney(row.total_abonos)}</span> },
    {
      key: 'deuda',
      label: 'Deuda',
      searchable: false,
      firstSort: 'desc',
      render: (_v, row) => <DeudaCliente monto={row.deuda} />,
    },
    {
      key: 'acciones',
      label: '',
      searchable: false,
      sortable: false,
      render: (_v, row) => (
        <RowActionsMenu actions={[{ label: 'Ver cliente', icon: <Eye size={12} strokeWidth={2} />, onClick: () => verCliente(row) }]} />
      ),
    },
  ], [verCliente]);

  return (
    <AdminPageShell>
      <PageHeader
        kicker="Cobranza"
        kickerIcon={<Wallet size={14} strokeWidth={2} />}
        title="Cuentas por cobrar"
        accentWord="cobrar"
        subtitle="Clientes con deuda, de mayor a menor. Abre un cliente para ver su cuenta y cobrarle."
      />

      <FilterBar>
        <FilterBar.Item label="Buscar" grow>
          <input type="text" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Nombre, apellido o teléfono…" />
        </FilterBar.Item>
      </FilterBar>

      <DataTable<Row>
        columns={columns}
        data={deudores as Row[]}
        loading={loading}
        error={error}
        onRefresh={cargar}
        getRowKey={(r) => r.cliente_id}
        onRowClick={verCliente}
        sort={serverSort.sort}
        onSortChange={serverSort.onSortChange}
        hideSearch
        emptyMessage="No hay clientes con deuda"
      />
      <CursorPagination page={pagination.page} totalPages={pagination.totalPages} hasNext={pagination.hasNext} loading={loading} onPrevious={pagination.previous} onNext={pagination.next} />
    </AdminPageShell>
  );
}
