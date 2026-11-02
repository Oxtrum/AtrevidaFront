'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { AdminButton, DataTable, Column, CursorPagination, FilterBar } from '@/components/AdminConfig';
import { CustomSelect } from '@/components/Custom/CustomSelectAdmin';
import { getLocalesDB } from '@/lib/api/servicios';
import { getPlanesDB, type PlanItem } from '@/lib/api/planes';
import { useAdminLocalScopeState } from '@/lib/auth/useAdminLocalScope';
import ReservarPlanModal from './ReservarPlanModal';
import { PaqueteDetalleModal } from './PaqueteDetalleModal';
import { PlanAcciones } from './PlanAcciones';
import styles from './PaquetesActivos.module.css';
import { PAGE_LIMIT } from '@/lib/api/pagination';
import { useCursorPagination } from '@/lib/hooks/useCursorPagination';
import { useServerSort } from '@/lib/hooks/useServerSort';

interface LocalOpt { id: number; nombre: string; }

interface PlanRow extends PlanItem, Record<string, unknown> {}

/** Paquetes de todos los clientes: reservar uno nuevo, cobrarlo, activarlo y marcar sus sesiones. Es la pestaña Paquetes de Clientes. */
export function PaquetesActivosTable() {
  const adminLocalScope = useAdminLocalScopeState();
  const scopedLocalName = adminLocalScope.workplace?.nombre_local ?? '';

  const [planes, setPlanes] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [locales, setLocales] = useState<LocalOpt[]>([]);
  const [filtroLocal, setFiltroLocal] = useState(scopedLocalName);

  const [filtroEstado, setFiltroEstado] = useState(''); // '' = Todos
  const [busqueda, setBusqueda] = useState('');
  const [busquedaDebounced, setBusquedaDebounced] = useState('');
	// Sin orden pedido el servidor ordena por prioridad de estado (no es una columna), asi que ningun header queda marcado.
	const serverSort = useServerSort();
	const { params: sortParams } = serverSort;
	const pagination = useCursorPagination(`${filtroLocal}|${filtroEstado}|${scopedLocalName}|${busquedaDebounced}|${serverSort.key}`);
	const { cursor: paginationCursor, requestRevision, shouldIncludeTotal, setMetadata: setPaginationMetadata } = pagination;
	const requestRef = useRef(0);
	const requestControllerRef = useRef<AbortController | null>(null);
  const [planAbierto, setPlanAbierto] = useState<PlanRow | null>(null);
  const [reservarOpen, setReservarOpen] = useState(false);

  // Sin local elegido = todas las sucursales. Usuarios con local asignado quedan fijados al suyo.
  const hasFilter = adminLocalScope.ready;

  const localOptions = [
    ...(scopedLocalName ? [] : [{ value: '', label: 'Todas las sucursales' }]),
    ...locales.map((l) => ({ value: l.nombre, label: l.nombre })),
  ];

  const fetchPlanes = useCallback(async () => {
    void requestRevision;
    if (!adminLocalScope.ready) return;
	requestControllerRef.current?.abort();
	const controller = new AbortController();
	requestControllerRef.current = controller;
    setLoading(true);
	const requestId = ++requestRef.current;
    try {
      const res = await getPlanesDB({
        local: filtroLocal || undefined,
        estado: filtroEstado || undefined,
		busqueda: busquedaDebounced || undefined,
		orden: 'prioridad_estado',
		limit: PAGE_LIMIT,
		cursor: paginationCursor,
		include_total: shouldIncludeTotal(),
			...sortParams,
      }, controller.signal);
	  if (requestId !== requestRef.current) return;
      setPlanes((res?.data?.planes ?? []) as unknown as PlanRow[]);
	  setPaginationMetadata(res?.data?.paginacion);
    } catch {
	  if (controller.signal.aborted) return;
	  if (requestId !== requestRef.current) return;
      setPlanes([]);
    } finally {
	  if (requestId === requestRef.current) setLoading(false);
    }
  }, [adminLocalScope.ready, filtroLocal, filtroEstado, busquedaDebounced, sortParams, paginationCursor, requestRevision, shouldIncludeTotal, setPaginationMetadata]);

	useEffect(() => () => {
		requestRef.current += 1;
		requestControllerRef.current?.abort();
	}, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setBusquedaDebounced(busqueda.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [busqueda]);

  const fetchLocales = useCallback(async () => {
    try {
      const res = await getLocalesDB() as { data?: { locales?: LocalOpt[] } };
      setLocales(res?.data?.locales ?? []);
    } catch { /* best-effort */ }
  }, []);

  useEffect(() => {
    fetchLocales();
  }, [fetchLocales]);

  useEffect(() => {
    if (hasFilter) fetchPlanes();
    else setPlanes([]);
  }, [fetchPlanes, hasFilter]);

  useEffect(() => {
    if (scopedLocalName) setFiltroLocal(scopedLocalName);
  }, [scopedLocalName]);

  const columns: Column<PlanRow>[] = [
    { key: 'cliente', label: 'Cliente' },
    {
      key: 'combo_nombre_texto',
      label: 'Paquete',
      render: (_v, row) => <span>{row.combo_nombre_texto ?? '—'}</span>,
    },
    ...(!scopedLocalName ? [{
      key: 'local_nombre_texto',
      label: 'Local',
      render: (_v: unknown, row: PlanRow) => <span className={styles.localCell}>{row.local_nombre_texto ?? '—'}</span>,
    } as Column<PlanRow>] : []),
    {
      key: 'precio_total',
      label: 'Total',
      searchable: false,
      render: (_v, row) => <span>{row.precio_total} Bs</span>,
    },
    {
      key: 'estado',
      label: 'Estado',
      searchable: false,
    },
    {
      key: 'acciones',
      label: '',
      searchable: false,
      sortable: false,
      render: (_v, row) => (
        <div onClick={(e) => e.stopPropagation()}>
          <PlanAcciones plan={row} onCambio={pagination.resetAfterMutation} />
        </div>
      ),
    },
  ];

  return (
    <>
          <FilterBar>
            <FilterBar.Item label="Buscar" grow>
              <input
                type="text"
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                placeholder="Cliente, paquete o código"
                aria-label="Buscar paquete"
              />
            </FilterBar.Item>
            {!scopedLocalName && (
              <FilterBar.Item label="Local">
                <CustomSelect value={filtroLocal} onChange={setFiltroLocal} options={localOptions} searchable={false} />
              </FilterBar.Item>
            )}
            <FilterBar.Item label="Estado">
              <CustomSelect
                value={filtroEstado}
                onChange={setFiltroEstado}
                searchable={false}
                options={[
                  { value: '', label: 'Todos' },
                  { value: 'RESERVADO', label: 'Reservado' },
                  { value: 'ACTIVO', label: 'Activo' },
                  { value: 'COMPLETADO', label: 'Completado' },
                  { value: 'CANCELADO', label: 'Cancelado' },
                ]}
              />
            </FilterBar.Item>
            <FilterBar.Action>
              <AdminButton icon={<Plus size={16} strokeWidth={2.2} />} onClick={() => setReservarOpen(true)}>
                Reservar paquete
              </AdminButton>
            </FilterBar.Action>
          </FilterBar>

          <DataTable<PlanRow> sort={serverSort.sort} onSortChange={serverSort.onSortChange}
              columns={columns}
              data={planes}
              loading={loading}
              onRefresh={fetchPlanes}
              getRowKey={(p) => p.id}
              onRowClick={(p) => setPlanAbierto(p)}
              emptyMessage="No hay paquetes registrados."
              hideSearch
            />
			<CursorPagination page={pagination.page} totalPages={pagination.totalPages} hasNext={pagination.hasNext} loading={loading} onPrevious={pagination.previous} onNext={pagination.next} />
      {planAbierto && (
        <PaqueteDetalleModal plan={planAbierto} onClose={() => setPlanAbierto(null)} onCambio={pagination.resetAfterMutation} />
      )}
      {reservarOpen && (
        <ReservarPlanModal
          locales={locales}
          onClose={() => setReservarOpen(false)}
          onReservado={pagination.resetAfterMutation}
        />
      )}
    </>
  );
}
