'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle, PlayCircle, Plus, X, XCircle } from 'lucide-react';
import { AdminButton, DataTable, Column, RowActionsMenu, RowAction, CursorPagination, FilterBar } from '@/components/AdminConfig';
import { CustomSelect } from '@/components/Custom/CustomSelectAdmin';
import { toast } from '@/components/Shared/Toast';
import { getLocalesDB } from '@/lib/api/servicios';
import {
  getPlanesDB,
  getPlanByID,
  cambiarEstadoPlan,
  marcarSesionPlan,
  type PlanItem,
  type PlanDetalle,
  type PlanServicioDetalle,
} from '@/lib/api/planes';
import { useAdminLocalScopeState } from '@/lib/auth/useAdminLocalScope';
import ReservarPlanModal from './ReservarPlanModal';
import CobrarPlanModal from './CobrarPlanModal';
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
  const [detalle, setDetalle] = useState<PlanDetalle | null>(null);
  const [detalleLoading, setDetalleLoading] = useState(false);
  const [reservarOpen, setReservarOpen] = useState(false);
  const [planACobrar, setPlanACobrar] = useState<PlanRow | null>(null);

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

  const recargarDetalle = useCallback(async (planId: number) => {
    setDetalleLoading(true);
    try {
      const res = await getPlanByID(planId);
      setDetalle(res?.data?.plan ?? null);
    } catch {
      toast.error('No se pudo cargar el detalle del plan.');
      setDetalle(null);
    } finally {
      setDetalleLoading(false);
    }
  }, []);

  useEffect(() => {
    if (planAbierto) recargarDetalle(planAbierto.id);
    else setDetalle(null);
  }, [planAbierto, recargarDetalle]);

  const sesiones = useMemo(() => {
    const map = new Map<number, PlanServicioDetalle[]>();
    for (const s of detalle?.servicios ?? []) {
      const arr = map.get(s.sesion_numero) ?? [];
      arr.push(s);
      map.set(s.sesion_numero, arr);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0])
      .map(([numero, servs]) => ({ numero, servicios: servs, hecha: servs.every((x) => x.realizado) }));
  }, [detalle]);
  const hechas = sesiones.filter((s) => s.hecha).length;

  // Servicios incluidos (únicos): se entregan en cada sesión, se listan una vez.
  const serviciosIncluidos = useMemo(() => {
    const vistos = new Set<string>();
    const out: string[] = [];
    for (const s of detalle?.servicios ?? []) {
      const label = (s.nombre_texto ?? '').trim();
      if (!label) continue;
      const clave = label.toLowerCase();
      if (vistos.has(clave)) continue;
      vistos.add(clave);
      out.push(label);
    }
    return out;
  }, [detalle]);

  const toggleSesion = async (numero: number, realizado: boolean) => {
    if (!planAbierto) return;
    try {
      await marcarSesionPlan(planAbierto.id, numero, realizado);
      await recargarDetalle(planAbierto.id);
      pagination.resetAfterMutation();
      toast.success(realizado ? 'Sesión marcada' : 'Sesión pendiente');
    } catch {
      toast.error('No se pudo actualizar la sesión');
    }
  };

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

  const handleCambiarEstado = async (plan: PlanRow, nuevoEstado: string) => {
    try {
      await cambiarEstadoPlan(plan.id, nuevoEstado);
      toast.success(`Plan ${nuevoEstado}`);
      pagination.resetAfterMutation();
    } catch {
      toast.error('No se pudo cambiar el estado.');
    }
  };

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
      render: (_v, row) => {
        const actions: RowAction[] = [];
        if (row.estado === 'RESERVADO') {
          actions.push(
            { label: 'Cobrar', icon: <CheckCircle size={12} strokeWidth={2} />, onClick: () => setPlanACobrar(row) },
            { label: 'Activar', icon: <PlayCircle size={12} strokeWidth={2} />, onClick: () => handleCambiarEstado(row, 'ACTIVO') },
            { label: 'Cancelar', icon: <XCircle size={12} strokeWidth={2} />, onClick: () => handleCambiarEstado(row, 'CANCELADO'), variant: 'danger' },
          );
        } else if (row.estado === 'ACTIVO') {
          actions.push(
            { label: 'Completar', icon: <CheckCircle size={12} strokeWidth={2} />, onClick: () => handleCambiarEstado(row, 'COMPLETADO') },
            { label: 'Cancelar', icon: <XCircle size={12} strokeWidth={2} />, onClick: () => handleCambiarEstado(row, 'CANCELADO'), variant: 'danger' },
          );
        }
        return actions.length > 0 ? (
          <div onClick={(e) => e.stopPropagation()}>
            <RowActionsMenu actions={actions} />
          </div>
        ) : null;
      },
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
              <div className={styles.detalleOverlay} onClick={() => setPlanAbierto(null)}>
                <div className={styles.detalleModal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.detalleHeader}>
                  <div>
                    <h3 className={styles.detalleTitle}>{planAbierto.combo_nombre_texto ?? 'Plan'}</h3>
                    <p className={styles.detalleSubtitle}>{planAbierto.cliente}</p>
                  </div>
                  <button
                    type="button"
                    className={styles.cerrarBtn}
                    onClick={() => setPlanAbierto(null)}
                    aria-label="Cerrar detalle del plan"
                  >
                    <X size={16} strokeWidth={2} />
                  </button>
                </div>

                {detalleLoading ? (
                  <p className={styles.detalleLoading}>Cargando sesiones...</p>
                ) : sesiones.length === 0 ? (
                  <p className={styles.detalleLoading}>Este plan no tiene sesiones registradas.</p>
                ) : (
                  <>
                    <div className={styles.progresoWrap}>
                      <div className={styles.progresoTop}>
                        <span>Progreso del paquete</span>
                        <strong>{hechas}/{sesiones.length} sesiones</strong>
                      </div>
                      <div className={styles.progresoBar}>
                        <div
                          className={styles.progresoFill}
                          style={{ width: `${sesiones.length ? Math.round((hechas / sesiones.length) * 100) : 0}%` }}
                        />
                      </div>
                    </div>
                    {serviciosIncluidos.length > 0 && (
                      <div className={styles.serviciosIncluidos}>
                        <span className={styles.serviciosIncluidosLabel}>Servicios incluidos</span>
                        <ul className={styles.serviciosIncluidosList}>
                          {serviciosIncluidos.map((label, i) => (
                            <li key={i}>{label}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {sesiones.map((s) => (
                      <div key={s.numero} className={`${styles.sesionRow} ${s.hecha ? styles.sesionHecha : ''}`}>
                        <span className={styles.sesionNum}>Sesión {s.numero}</span>
                        <button
                          type="button"
                          className={styles.toggleBtn}
                          onClick={() => toggleSesion(s.numero, !s.hecha)}
                        >
                          {s.hecha ? '✓ Hecha' : 'Marcar hecha'}
                        </button>
                      </div>
                    ))}
                  </>
                )}
                </div>
              </div>
            )}
      {reservarOpen && (
        <ReservarPlanModal
          locales={locales}
          onClose={() => setReservarOpen(false)}
          onReservado={pagination.resetAfterMutation}
        />
      )}
      {planACobrar && (
        <CobrarPlanModal
          plan={planACobrar}
          locales={locales}
          onClose={() => setPlanACobrar(null)}
          onCobrado={pagination.resetAfterMutation}
        />
      )}
    </>
  );
}
