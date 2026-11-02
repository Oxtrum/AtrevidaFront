'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Banknote } from 'lucide-react';
import { AdminButton, CursorPagination, DataTable } from '@/components/AdminConfig';
import type { Column } from '@/components/AdminConfig';
import { toast } from '@/components/Shared/Toast';
import { getCuentaCliente, getDeudores } from '@/lib/api/cuenta';
import type { CuentaCliente, DeudorCliente } from '@/lib/api/cuenta';
import { PAGE_LIMIT } from '@/lib/api/pagination';
import { useCursorPagination } from '@/lib/hooks/useCursorPagination';
import { useServerSort } from '@/lib/hooks/useServerSort';
import { formatMoney } from '@/lib/utils/format';
import type { SortState } from '@/lib/utils/sortRows';
import { ClientePopover } from './ClientePopover';
import { CobroModal } from './CobroModal';
import { DeudaCliente } from './SaldoCliente';

type Row = DeudorCliente & Record<string, unknown>;

/** Orden que aplica el servidor sin ordenar_por: la mayor deuda primero. Solo marca el header. */
const ORDEN_POR_DEFECTO: SortState = { key: 'deuda', dir: 'desc' };

interface CobroAbierto {
  deudor: DeudorCliente;
  cuenta: CuentaCliente;
}

interface DeudoresTableProps {
  /** Texto de busqueda ya con debounce; lo pone la pagina para compartir un solo buscador con la otra vista. */
  busqueda: string;
}

/** Clientes con deuda, de mayor a menor. Cobrar abre el cobro en la misma fila; la fila abre la ficha. */
export function DeudoresTable({ busqueda }: DeudoresTableProps) {
  const router = useRouter();
  const serverSort = useServerSort(ORDEN_POR_DEFECTO);
  const { params: sortParams } = serverSort;
  const pagination = useCursorPagination(`${busqueda}|${serverSort.key}`);
  const { cursor, requestRevision, shouldIncludeTotal, setMetadata } = pagination;

  const [deudores, setDeudores] = useState<DeudorCliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cobro, setCobro] = useState<CobroAbierto | null>(null);
  const [abriendoId, setAbriendoId] = useState<number | null>(null);
  const requestRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);

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
        { busqueda: busqueda || undefined, limit: PAGE_LIMIT, cursor, include_total: shouldIncludeTotal(), ...sortParams },
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
  }, [busqueda, sortParams, cursor, requestRevision, shouldIncludeTotal, setMetadata]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  useEffect(() => () => {
    requestRef.current += 1;
    controllerRef.current?.abort();
  }, []);

  const verCliente = useCallback((row: DeudorCliente) => router.push(`/atrevida-gestion/clientes/${row.cliente_id}`), [router]);

  const cobrar = useCallback(async (row: DeudorCliente) => {
    setAbriendoId(row.cliente_id);
    try {
      setCobro({ deudor: row, cuenta: await getCuentaCliente(row.cliente_id) });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo cargar la cuenta');
    } finally {
      setAbriendoId(null);
    }
  }, []);

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
        <span onClick={(e) => e.stopPropagation()}>
          <AdminButton size="sm" icon={<Banknote size={14} strokeWidth={2} />} onClick={() => void cobrar(row)} disabled={abriendoId === row.cliente_id}>
            Cobrar
          </AdminButton>
        </span>
      ),
    },
  ], [cobrar, abriendoId]);

  return (
    <>
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

      <CobroModal
        isOpen={cobro !== null}
        clienteId={cobro?.deudor.cliente_id ?? 0}
        nombre={cobro ? `${cobro.deudor.nombre} ${cobro.deudor.apellido}`.trim() : 'cliente'}
        cuenta={cobro?.cuenta ?? null}
        onClose={() => setCobro(null)}
        onCobrado={() => {
          setCobro(null);
          pagination.resetAfterMutation();
        }}
      />
    </>
  );
}
