'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Eye, SlidersHorizontal, X } from 'lucide-react';
import {
  ConfirmDialog,
  CursorPagination,
  DataTable,
  FilterBar,
  LocalSelect,
  RowActionsMenu,
  StatusBadge,
} from '@/components/AdminConfig';
import type { Column } from '@/components/AdminConfig';
import { CustomSelect } from '@/components/Custom/CustomSelectAdmin';
import { AtencionAcciones } from '@/components/AdminAtenciones/AtencionAcciones';
import { AtencionDetalleModal } from '@/components/AdminAtenciones/AtencionDetalleModal';
import { AtencionFormModal } from '@/components/AdminAtenciones/AtencionFormModal';
import { ReservaDetailModal } from '@/components/AdminReservas/ReservaDetailModal';
import { desactivarAtencion, getAtencion, getAtenciones, type Atencion } from '@/lib/api/atenciones';
import { getAdminLocalScope } from '@/lib/api/localScope';
import { PAGE_LIMIT } from '@/lib/api/pagination';
import { getReservaByID } from '@/lib/api/reservas';
import { useCursorPagination } from '@/lib/hooks/useCursorPagination';
import { useInventarioItems } from '@/lib/hooks/useInventarioItems';
import { useServerSort } from '@/lib/hooks/useServerSort';
import type { SortState } from '@/lib/utils/sortRows';
import type { ReservaBD } from '@/types/reserva';
import { toast } from '@/components/Shared/Toast';
import styles from './HistorialAtencionesTab.module.css';

type AtencionRow = Atencion & Record<string, unknown>;
interface AtencionConReserva { atencion: Atencion; reserva: ReservaBD }

/** Orden que el servidor aplica sin ordenar_por; solo se usa para marcar el header de fecha. */
const ORDEN_POR_DEFECTO: SortState = { key: 'fecha_atencion', dir: 'desc' };

const formatDate = (value: string) => {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return year && month && day
    ? new Date(year, month - 1, day).toLocaleDateString('es-BO', { day: 'numeric', month: 'short', year: 'numeric' })
    : value;
};

const textoInicial = { q: '', cliente: '', servicio: '', empleado: '' };

interface HistorialLink {
  localId: string;
  desde: string;
  hasta: string;
  texto: typeof textoInicial;
  itemId: string;
  pendientesStock: string;
  resultado: string;
  sort: SortState | null;
}

/** Restaura filtros y orden cuando se recarga o comparte la URL del Historial. */
function readHistorialLink(): HistorialLink {
  const scopeLocal = String(getAdminLocalScope()?.local_id ?? '');
  if (typeof window === 'undefined') {
    return { localId: scopeLocal, desde: '', hasta: '', texto: textoInicial, itemId: '', pendientesStock: '', resultado: '', sort: null };
  }
  const params = new URLSearchParams(window.location.search);
  const esHistorial = params.get('vista') === 'historial';
  const orden = params.get('ordenar_por') ?? '';
  const sentido = params.get('sentido');
  const pendientes = params.get('pendientes_stock') ?? '';
  return {
    localId: scopeLocal || (esHistorial ? (params.get('local_id') ?? '') : ''),
    desde: esHistorial ? (params.get('fecha_desde') ?? '') : '',
    hasta: esHistorial ? (params.get('fecha_hasta') ?? '') : '',
    texto: esHistorial
      ? {
          q: params.get('q') ?? '',
          cliente: params.get('cliente') ?? '',
          servicio: params.get('servicio') ?? '',
          empleado: params.get('empleado') ?? '',
        }
      : textoInicial,
    itemId: esHistorial ? (params.get('item_id') ?? '') : '',
    pendientesStock: esHistorial && (pendientes === 'true' || pendientes === 'false') ? pendientes : '',
    resultado: esHistorial && ['ATENDIDA', 'CANCELADA', 'INASISTENCIA'].includes(params.get('resultado') ?? '')
      ? params.get('resultado') ?? ''
      : '',
    sort: esHistorial && orden && (sentido === 'asc' || sentido === 'desc')
      ? { key: orden, dir: sentido }
      : null,
  };
}

/** Historial de atenciones con filtros de servidor, orden por columna y paginación por cursor. */
export function HistorialAtencionesTab() {
  const [link] = useState(readHistorialLink);
  const [localId, setLocalId] = useState(link.localId);
  const [desde, setDesde] = useState(link.desde);
  const [hasta, setHasta] = useState(link.hasta);
  const [texto, setTexto] = useState(link.texto);
  const [textoAplicado, setTextoAplicado] = useState(link.texto);
  const [itemId, setItemId] = useState(link.itemId);
  const [pendientesStock, setPendientesStock] = useState(link.pendientesStock);
  const [resultado, setResultado] = useState(link.resultado);
  const [avanzadosAbiertos, setAvanzadosAbiertos] = useState(() => Boolean(
    link.texto.cliente || link.texto.servicio || link.texto.empleado || link.itemId || link.pendientesStock,
  ));
  const { items } = useInventarioItems({ activo: true });

  useEffect(() => {
    const t = window.setTimeout(() => setTextoAplicado(texto), 350);
    return () => window.clearTimeout(t);
  }, [texto]);

  const serverSort = useServerSort(ORDEN_POR_DEFECTO, link.sort);
  const { params: sortParams } = serverSort;
  const filters = useMemo(
    () => ({
      local_id: localId ? Number(localId) : undefined,
      fecha_desde: desde || undefined,
      fecha_hasta: hasta || undefined,
      cliente: textoAplicado.cliente.trim() || undefined,
      servicio: textoAplicado.servicio.trim() || undefined,
      empleado: textoAplicado.empleado.trim() || undefined,
      item_id: itemId ? Number(itemId) : undefined,
      pendientes_stock: pendientesStock === '' ? undefined : pendientesStock === 'true',
      resultado: resultado ? (resultado as 'ATENDIDA' | 'CANCELADA' | 'INASISTENCIA') : undefined,
      q: textoAplicado.q.trim() || undefined,
      ...sortParams,
    }),
    [localId, desde, hasta, textoAplicado, itemId, pendientesStock, resultado, sortParams],
  );
  const pagination = useCursorPagination(JSON.stringify(filters));
  const { cursor, requestRevision, shouldIncludeTotal, setMetadata } = pagination;

  const [rows, setRows] = useState<Atencion[]>([]);
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
      const res = await getAtenciones(
        { ...filters, limit: PAGE_LIMIT, cursor, include_total: shouldIncludeTotal() },
        controller.signal,
      );
      if (id !== requestRef.current) return;
      setRows(res.atenciones);
      const totalRegistros = res.paginacion?.total_registros ?? res.total_registros;
      if (totalRegistros !== undefined) setTotal(totalRegistros);
      setMetadata(res.paginacion);
    } catch (err) {
      if (controller.signal.aborted || id !== requestRef.current) return;
      setError(err instanceof Error ? err.message : 'Error al cargar atenciones');
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

  useEffect(() => {
    const params = new URLSearchParams();
    params.set('vista', 'historial');
    if (localId) params.set('local_id', localId);
    if (desde) params.set('fecha_desde', desde);
    if (hasta) params.set('fecha_hasta', hasta);
    if (textoAplicado.q.trim()) params.set('q', textoAplicado.q.trim());
    if (textoAplicado.cliente.trim()) params.set('cliente', textoAplicado.cliente.trim());
    if (textoAplicado.servicio.trim()) params.set('servicio', textoAplicado.servicio.trim());
    if (textoAplicado.empleado.trim()) params.set('empleado', textoAplicado.empleado.trim());
    if (itemId) params.set('item_id', itemId);
    if (pendientesStock) params.set('pendientes_stock', pendientesStock);
    if (resultado) params.set('resultado', resultado);
    if (sortParams.ordenar_por) {
      params.set('ordenar_por', sortParams.ordenar_por);
      if (sortParams.sentido) params.set('sentido', sortParams.sentido);
    }
    const query = params.toString();
    window.history.replaceState(null, '', query ? `${window.location.pathname}?${query}` : window.location.pathname);
  }, [localId, desde, hasta, textoAplicado, itemId, pendientesStock, resultado, sortParams]);

  const [reservaAbierta, setReservaAbierta] = useState<ReservaBD | null>(null);
  const [atencionAbierta, setAtencionAbierta] = useState<AtencionConReserva | null>(null);
  const [atencionEnEdicion, setAtencionEnEdicion] = useState<AtencionConReserva | null>(null);
  const [atencionDesactivar, setAtencionDesactivar] = useState<Atencion | null>(null);
  const [restituirStock, setRestituirStock] = useState(false);
  const [desactivando, setDesactivando] = useState(false);

  const leerAtencionYReserva = async (atencionId: number, reservaId: number): Promise<AtencionConReserva> => {
    const [atencion, reservaResponse] = await Promise.all([getAtencion(atencionId), getReservaByID(reservaId)]);
    const reserva = reservaResponse.data?.reserva;
    if (!reserva) throw new Error('No se encontró la reserva vinculada.');
    return { atencion, reserva };
  };

  const verReserva = async (row: Atencion) => {
    try {
      const response = await getReservaByID(row.reserva_id);
      if (!response.data?.reserva) throw new Error('No se encontró la reserva vinculada.');
      setReservaAbierta(response.data.reserva);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo cargar la reserva.');
    }
  };

  const verAtencion = async (row: Atencion) => {
    try {
      setAtencionAbierta(await leerAtencionYReserva(row.id, row.reserva_id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo cargar la atención.');
    }
  };

  const editarAtencion = async (row: Atencion) => {
    if (row.insumos_pendientes <= 0) return;
    try {
      setAtencionEnEdicion(await leerAtencionYReserva(row.id, row.reserva_id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo cargar la atención.');
    }
  };

  const confirmarDesactivacion = async () => {
    if (!atencionDesactivar) return;
    setDesactivando(true);
    try {
      await desactivarAtencion(atencionDesactivar.id, restituirStock);
      toast.success(restituirStock ? 'Atención desactivada y stock restituido.' : 'Atención desactivada.');
      setAtencionDesactivar(null);
      pagination.resetAfterMutation();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo desactivar la atención.');
    } finally {
      setDesactivando(false);
    }
  };

  const columns: Column<AtencionRow>[] = [
    { key: 'fecha_atencion', label: 'Fecha', firstSort: 'desc', render: (value) => formatDate(String(value)) },
    {
      key: 'resultado',
      label: 'Resultado',
      render: (_, row) => {
        if (row.resultado === 'CANCELADA') {
          const inasistencia = row.motivo_cancelacion_tipo === 'INASISTENCIA';
          const detalle = [row.motivo_cancelacion_tipo, row.motivo_cancelacion_detalle].filter(Boolean).join(' · ');
          return <StatusBadge tone="danger" title={detalle || undefined}>{inasistencia ? 'Cancelada · Inasistencia' : 'Cancelada'}</StatusBadge>;
        }
        return <StatusBadge tone="success">Atendida</StatusBadge>;
      },
    },
    { key: 'hora_inicio', label: 'Horario', render: (_, row) => [row.hora_inicio, row.hora_fin].filter(Boolean).join(' – ') || 'Horario no registrado' },
    { key: 'cliente_nombre', label: 'Cliente', render: (value) => <span className={styles.truncate} title={String(value || '')}>{String(value || '—')}</span> },
    { key: 'servicio_reserva', label: 'Servicio', render: (value) => <span className={styles.truncate} title={String(value || '')}>{String(value || '—')}</span> },
    { key: 'empleado_nombre', label: 'Personal', render: (value) => <span className={styles.truncate} title={String(value || '')}>{String(value || '—')}</span> },
    { key: 'local_nombre', label: 'Local', render: (value) => <span className={styles.truncate} title={String(value || '')}>{String(value || '—')}</span> },
    {
      key: 'acciones',
      label: 'Acciones',
      searchable: false,
      sortable: false,
      render: (_, row) => (
        row.resultado === 'CANCELADA' ? (
          <RowActionsMenu
            ariaLabel={`Acciones de la reserva cancelada ${row.reserva_id}`}
            actions={[{ label: 'Ver reserva', icon: <Eye size={14} />, onClick: () => void verReserva(row) }]}
          />
        ) : (
          <AtencionAcciones
            atencion={row}
            onEdit={() => void editarAtencion(row)}
            onVerReserva={() => void verReserva(row)}
            onVerAtencion={() => void verAtencion(row)}
            onDesactivar={() => { setRestituirStock(false); setAtencionDesactivar(row); }}
          />
        )
      ),
    },
  ];

  const insumoOptions = items
    .filter((item) => item.activo)
    .map((item) => ({ value: String(item.id), label: item.nombre }));

  const limpiarFiltros = () => {
    setDesde(''); setHasta(''); setTexto(textoInicial); setTextoAplicado(textoInicial);
    setItemId(''); setPendientesStock(''); setResultado('');
    if (!getAdminLocalScope()) setLocalId('');
  };

  return (
    <>
      <div className={styles.filterGap}>
        <FilterBar>
          <FilterBar.Item label="Buscar" grow>
            <input
              type="text"
              value={texto.q}
              onChange={(event) => setTexto((current) => ({ ...current, q: event.target.value }))}
              placeholder="Cliente, reserva, servicio…"
            />
          </FilterBar.Item>
          {!getAdminLocalScope() && (
            <FilterBar.Item label="Local">
              <LocalSelect value={localId} onChange={setLocalId} emptyLabel="Todos los locales" />
            </FilterBar.Item>
          )}
          {getAdminLocalScope() && (
            <FilterBar.Item label="Local">
              <input type="text" disabled value={getAdminLocalScope()?.nombre_local ?? 'Local asignado'} aria-label="Local asignado" />
            </FilterBar.Item>
          )}
          <FilterBar.Item label="Resultado">
            <CustomSelect
              value={resultado}
              onChange={setResultado}
              options={[
                { value: 'ATENDIDA', label: 'Atendida' },
                { value: 'CANCELADA', label: 'Cancelada' },
                { value: 'INASISTENCIA', label: 'Cancelada · Inasistencia' },
              ]}
              placeholder="Todos"
              allowClear
              searchable={false}
            />
          </FilterBar.Item>
          <FilterBar.Item label="Desde"><input type="date" value={desde} max={hasta || undefined} onChange={(event) => setDesde(event.target.value)} /></FilterBar.Item>
          <FilterBar.Item label="Hasta"><input type="date" value={hasta} min={desde || undefined} onChange={(event) => setHasta(event.target.value)} /></FilterBar.Item>
          <FilterBar.Action>
            <button type="button" className={styles.filterAction} onClick={() => setAvanzadosAbiertos((current) => !current)} aria-expanded={avanzadosAbiertos}>
              <SlidersHorizontal size={14} /> {avanzadosAbiertos ? 'Menos filtros' : 'Más filtros'}
            </button>
          </FilterBar.Action>
          <FilterBar.Action>
            <button type="button" className={styles.clearFilters} onClick={limpiarFiltros}><X size={14} /> Limpiar</button>
          </FilterBar.Action>
        </FilterBar>
      </div>

      {avanzadosAbiertos && (
        <div className={styles.advancedFilters}>
          <FilterBar>
          <FilterBar.Item label="Cliente">
            <input
              type="text"
              value={texto.cliente}
              onChange={(event) => setTexto((current) => ({ ...current, cliente: event.target.value }))}
              placeholder="Nombre del cliente"
            />
          </FilterBar.Item>
          <FilterBar.Item label="Servicio">
            <input
              type="text"
              value={texto.servicio}
              onChange={(event) => setTexto((current) => ({ ...current, servicio: event.target.value }))}
              placeholder="Servicio realizado"
            />
          </FilterBar.Item>
          <FilterBar.Item label="Personal">
            <input
              type="text"
              value={texto.empleado}
              onChange={(event) => setTexto((current) => ({ ...current, empleado: event.target.value }))}
              placeholder="Quien atendió"
            />
          </FilterBar.Item>
          <FilterBar.Item label="Insumo">
            <CustomSelect
              value={itemId}
              onChange={setItemId}
              options={insumoOptions}
              placeholder="Todos"
              allowClear
            />
          </FilterBar.Item>
          <FilterBar.Item label="Pendientes">
            <CustomSelect
              value={pendientesStock}
              onChange={setPendientesStock}
              options={[
                { value: 'true', label: 'Con deducción pendiente' },
                { value: 'false', label: 'Sin pendientes' },
              ]}
              placeholder="Todos"
              allowClear
              searchable={false}
            />
          </FilterBar.Item>
          </FilterBar>
        </div>
      )}

      <div className={styles.historyTable}><DataTable<AtencionRow>
        sort={serverSort.sort}
        onSortChange={serverSort.onSortChange}
        columns={columns}
        data={rows as AtencionRow[]}
        loading={loading}
        error={error}
        onRefresh={load}
        getRowKey={(row) => row.id}
        hideSearch
        emptyMessage="Sin atenciones para estos filtros"
      /></div>
      <CursorPagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        hasNext={pagination.hasNext}
        loading={loading}
        onPrevious={pagination.previous}
        onNext={pagination.next}
      />
      {total !== undefined && (
        <p className={styles.muted}>
          {total.toLocaleString('es-BO')} {total === 1 ? 'registro' : 'registros'} con estos filtros
        </p>
      )}

      {reservaAbierta && (
        <ReservaDetailModal
          reserva={reservaAbierta}
          onClose={() => setReservaAbierta(null)}
          onEdit={() => undefined}
          onDelete={() => undefined}
          readOnly
        />
      )}
      <AtencionDetalleModal
        reserva={atencionAbierta?.reserva ?? null}
        atencion={atencionAbierta?.atencion ?? null}
        onClose={() => setAtencionAbierta(null)}
      />
      <AtencionFormModal
        reserva={atencionEnEdicion?.reserva ?? null}
        atencion={atencionEnEdicion?.atencion ?? null}
        onClose={() => setAtencionEnEdicion(null)}
        onSaved={() => { setAtencionEnEdicion(null); pagination.resetAfterMutation(); }}
      />
      <ConfirmDialog
        isOpen={!!atencionDesactivar}
        title="Desactivar atención"
        confirmLabel="Desactivar"
        danger
        loading={desactivando}
        onConfirm={() => void confirmarDesactivacion()}
        onClose={() => { if (!desactivando) setAtencionDesactivar(null); }}
        message={(
          <div className={styles.deactivateMessage}>
            <p>La atención de {atencionDesactivar?.empleado_nombre} quedará fuera del listado. ¿Deseas restituir al inventario las cantidades descontadas?</p>
            <label>
              <input type="checkbox" checked={restituirStock} onChange={(event) => setRestituirStock(event.target.checked)} />
              Restituir el stock descontado por esta atención
            </label>
            <small>Los insumos que quedaron con deducción pendiente no modifican el stock.</small>
          </div>
        )}
      />
    </>
  );
}
