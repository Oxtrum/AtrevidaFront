'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CreditCard } from 'lucide-react';
import { CursorPagination, DataTable, FilterBar, PageHeader, StatCard, StatGrid } from '@/components/AdminConfig';
import type { Column } from '@/components/AdminConfig';
import { CustomSelect } from '@/components/Custom/CustomSelectAdmin';
import { PagoDetalleCodeButton, PagoDetalleModal, PagoProductosCell } from '@/components/Pagos/PagoDetalleModal';
import { getPagosDB } from '@/lib/api/pagos';
import type { Pago } from '@/lib/api/pagos';
import { PAGE_LIMIT } from '@/lib/api/pagination';
import { canViewFinancialReports } from '@/lib/auth/adminSession';
import { useAdminLocalScopeState } from '@/lib/auth/useAdminLocalScope';
import { useCursorPagination } from '@/lib/hooks/useCursorPagination';
import { useLocales } from '@/lib/hooks/useLocales';
import { useServerSort } from '@/lib/hooks/useServerSort';
import { formatDateTime } from '@/lib/utils/formatDateTime';
import type { SortState } from '@/lib/utils/sortRows';

interface PagoRow extends Pago, Record<string, unknown> {}

/** Orden que el servidor aplica sin ordenar_por; solo se usa para marcar el header de fecha. */
const ORDEN_POR_DEFECTO: SortState = { key: 'fecha_creacion', dir: 'desc' };

const ESTADO_OPTIONS = ['PAGADO', 'PENDIENTE', 'BORRADOR'];
const ESTADO_LABELS: Record<string, string> = { BORRADOR: 'POR CONFIRMAR' };
const TODAS = '';

const formatMoney = (value: unknown) => `Bs. ${Number(value ?? 0).toLocaleString('es-BO', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`;

/** Un filtro de texto solo se aplica con dos letras o mas: una sola devuelve casi todo. */
const filtroTextoActivo = (value: string) => {
  const normalized = value.trim();
  return normalized.length >= 2 ? normalized : '';
};

/**
 * Historial de pagos: lo ya cobrado, por sucursal, cliente, NIT, servicio y estado. Se llega desde el boton de
 * Cobros. Cada usuario ve lo que su sucursal le permite; el administrador puede ver todas.
 */
export default function HistorialDePagosPage() {
  const adminLocalScope = useAdminLocalScopeState();
  const scopedLocal = adminLocalScope.workplace?.nombre_local ?? '';
  const { locales } = useLocales();

  const [pagos, setPagos] = useState<PagoRow[]>([]);
  const [detallePagoCodigo, setDetallePagoCodigo] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cliente, setCliente] = useState('');
  const [clienteDebounced, setClienteDebounced] = useState('');
  const [nit, setNit] = useState('');
  const [nitDebounced, setNitDebounced] = useState('');
  const [producto, setProducto] = useState('');
  const [productoDebounced, setProductoDebounced] = useState('');
  const [estado, setEstado] = useState('PAGADO');
  const [local, setLocal] = useState(TODAS);

  const localEfectivo = scopedLocal || local;
  const clienteActivo = filtroTextoActivo(clienteDebounced);
  const nitActivo = filtroTextoActivo(nitDebounced);
  const productoActivo = filtroTextoActivo(productoDebounced);
  const serverSort = useServerSort(ORDEN_POR_DEFECTO);
  const { params: sortParams } = serverSort;
  const pagination = useCursorPagination(`${localEfectivo}|${clienteActivo}|${nitActivo}|${productoActivo}|${estado}|${serverSort.key}`);
  const { cursor: paginationCursor, requestRevision, shouldIncludeTotal, setMetadata: setPaginationMetadata } = pagination;
  const requestRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setClienteDebounced(cliente), 350);
    return () => clearTimeout(timer);
  }, [cliente]);
  useEffect(() => {
    const timer = setTimeout(() => setNitDebounced(nit), 350);
    return () => clearTimeout(timer);
  }, [nit]);
  useEffect(() => {
    const timer = setTimeout(() => setProductoDebounced(producto), 350);
    return () => clearTimeout(timer);
  }, [producto]);

  const fetchData = useCallback(async () => {
    void requestRevision;
    if (!adminLocalScope.ready) return;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const requestId = ++requestRef.current;
    setLoading(true);
    setError(null);
    try {
      const res = await getPagosDB({
        local_nombre: localEfectivo || undefined,
        cliente_nombre: clienteActivo || undefined,
        cliente_nit: nitActivo || undefined,
        producto: productoActivo || undefined,
        estado: estado || undefined,
        activo: true,
        limit: PAGE_LIMIT,
        cursor: paginationCursor,
        include_total: shouldIncludeTotal(),
        ...sortParams,
      }, controller.signal);
      if (requestId !== requestRef.current) return;
      setPagos((res.data?.pagos ?? []) as PagoRow[]);
      setTotal(res.data?.total ?? 0);
      setPaginationMetadata(res.data?.paginacion);
    } catch (err) {
      if (controller.signal.aborted || requestId !== requestRef.current) return;
      setError(err instanceof Error ? err.message : 'Error al cargar pagos');
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [adminLocalScope.ready, localEfectivo, clienteActivo, nitActivo, productoActivo, estado, sortParams, paginationCursor, requestRevision, shouldIncludeTotal, setPaginationMetadata]);

  useEffect(() => () => {
    requestRef.current += 1;
    controllerRef.current?.abort();
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const [verTotal, setVerTotal] = useState(false);
  useEffect(() => {
    setVerTotal(canViewFinancialReports());
  }, []);
  const totalBs = useMemo(() => pagos.reduce((sum, pago) => sum + Number(pago.total_final ?? 0), 0), [pagos]);

  const opcionesLocal = useMemo(
    () => scopedLocal
      ? [{ value: scopedLocal, label: scopedLocal }]
      : [{ value: TODAS, label: 'Todas' }, ...locales.map((l) => ({ value: l.nombre, label: l.nombre }))],
    [locales, scopedLocal],
  );

  const columns: Column<PagoRow>[] = [
    {
      key: 'codigo_pago',
      label: 'Código',
      searchable: false,
      render: (value) => <PagoDetalleCodeButton codigoPago={String(value)} onOpen={setDetallePagoCodigo} />,
    },
    ...(!localEfectivo ? [{ key: 'local_nombre', label: 'Local' } as Column<PagoRow>] : []),
    { key: 'cliente_nombre', label: 'Cliente' },
    { key: 'cliente_nit', label: 'NIT', searchable: false },
    {
      key: 'primer_producto',
      label: 'Servicios / productos',
      searchable: false,
      render: (value, row) => (
        <PagoProductosCell
          codigoPago={row.codigo_pago}
          primerProducto={String(value ?? '')}
          cantidadProductos={Number(row.cantidad_productos ?? 0)}
          esAbono={row.es_abono === true}
          onOpen={setDetallePagoCodigo}
        />
      ),
    },
    { key: 'tipo_pago', label: 'Tipo', searchable: false, render: (val) => String(val || 'No definido').toUpperCase() },
    { key: 'total_final', label: 'Total', searchable: false, render: formatMoney },
    {
      key: 'fecha_creacion',
      label: 'Fecha y hora',
      searchable: false,
      firstSort: 'desc',
      render: (val) => formatDateTime(val as string),
    },
    {
      key: 'estado',
      label: 'Estado',
      searchable: false,
      render: (val) => (
        <span className={val === 'PAGADO' ? 'admin-status-active' : 'admin-status-pending'}>
          {ESTADO_LABELS[String(val)] ?? String(val)}
        </span>
      ),
    },
  ];

  return (
    <div className="admin-stack">
      <PageHeader
        kicker="Cobros"
        kickerIcon={<CreditCard size={14} strokeWidth={2} />}
        title="Historial de Pagos"
        accentWord="Pagos"
        subtitle="Lo ya cobrado. Para registrar un cobro nuevo vuelve a Cobros."
        backHref="/atrevida-gestion/caja"
      />

      <StatGrid>
        <StatCard value={loading ? '—' : total} label="Pagos encontrados" loading={loading} />
        {/* La suma es un dato financiero: solo admin_sys. El resto ve los pagos, no el total. */}
        {verTotal && <StatCard value={loading ? '—' : formatMoney(totalBs)} label="Total visible" loading={loading} />}
      </StatGrid>

      <FilterBar>
        <FilterBar.Item label="Cliente" grow>
          <input type="text" value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Nombre del cliente" aria-label="Buscar pagos por cliente" />
        </FilterBar.Item>
        <FilterBar.Item label="NIT">
          <input type="text" value={nit} onChange={(e) => setNit(e.target.value)} placeholder="NIT" aria-label="Buscar pagos por NIT" />
        </FilterBar.Item>
        <FilterBar.Item label="Servicio o producto">
          <input type="text" value={producto} onChange={(e) => setProducto(e.target.value)} placeholder="Servicio o producto" aria-label="Buscar pagos por servicio o producto" />
        </FilterBar.Item>
        <FilterBar.Item label="Sucursal">
          <CustomSelect value={localEfectivo} onChange={(v) => { if (!scopedLocal) setLocal(v); }} options={opcionesLocal} searchable={false} allowClear={false} />
        </FilterBar.Item>
        <FilterBar.Item label="Estado">
          <CustomSelect
            value={estado}
            onChange={setEstado}
            options={[{ value: '', label: 'Todos' }, ...ESTADO_OPTIONS.map((e) => ({ value: e, label: ESTADO_LABELS[e] ?? e }))]}
            searchable={false}
            allowClear={false}
          />
        </FilterBar.Item>
      </FilterBar>

      <DataTable<PagoRow>
        sort={serverSort.sort}
        onSortChange={serverSort.onSortChange}
        columns={columns}
        data={pagos}
        loading={loading}
        error={error}
        onRefresh={fetchData}
        getRowKey={(p) => p.codigo_pago}
        hideSearch
        emptyMessage="No se encontraron pagos"
      />
      <CursorPagination page={pagination.page} totalPages={pagination.totalPages} hasNext={pagination.hasNext} loading={loading} onPrevious={pagination.previous} onNext={pagination.next} />

      {detallePagoCodigo && (
        <PagoDetalleModal key={detallePagoCodigo} codigoPago={detallePagoCodigo} onClose={() => setDetallePagoCodigo(null)} />
      )}
    </div>
  );
}
