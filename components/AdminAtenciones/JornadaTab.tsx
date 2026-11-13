'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Eye,
  Pencil,
  Play,
  XCircle,
} from 'lucide-react';
import {
  AdminPanel,
  AdminButton,
  AlertBanner,
  CursorPagination,
  FilterBar,
  LocalSelect,
  StatCard,
  StatGrid,
  StatusBadge,
} from '@/components/AdminConfig';
import type { BadgeTone } from '@/components/AdminConfig';
import { CustomSelect } from '@/components/Custom/CustomSelectAdmin';
import { AtencionDetalleModal } from '@/components/AdminAtenciones/AtencionDetalleModal';
import { AtencionFormModal } from '@/components/AdminAtenciones/AtencionFormModal';
import { ReservaDetailModal } from '@/components/AdminReservas/ReservaDetailModal';
import { CancelarReservaModal } from '@/components/AdminReservas/CancelarReservaModal';
import {
  getAtencion,
  getJornada,
  getJornadaResumen,
  type Atencion,
  type EstadoOperativoJornada,
  type JornadaAtencion,
  type JornadaPage,
} from '@/lib/api/atenciones';
import { getAdminLocalScope } from '@/lib/api/localScope';
import { getReservaByID } from '@/lib/api/reservas';
import { PAGE_LIMIT } from '@/lib/api/pagination';
import { useCursorPagination } from '@/lib/hooks/useCursorPagination';
import type { ReservaBD } from '@/types/reserva';
import { toast } from '@/components/Shared/Toast';
import styles from './JornadaTab.module.css';

const ESTADO_META: Record<EstadoOperativoJornada, { label: string; tone: BadgeTone }> = {
  PROGRAMADA: { label: 'Programada', tone: 'info' },
  PENDIENTE_CIERRE: { label: 'Pendiente de cierre', tone: 'warning' },
  ATENDIDA: { label: 'Atendida', tone: 'success' },
  CANCELADA: { label: 'Cancelada', tone: 'danger' },
};

const ESTADO_OPTIONS = (Object.keys(ESTADO_META) as EstadoOperativoJornada[]).map((value) => ({
  value,
  label: ESTADO_META[value].label,
}));

interface JornadaLink {
  fecha: string;
  localId: string;
  estado: string;
  q: string;
}

/** Restaura fecha, local, estado y busqueda cuando se recarga o comparte la URL de Jornada. */
function readJornadaLink(): JornadaLink {
  const scopeLocal = String(getAdminLocalScope()?.local_id ?? '');
  if (typeof window === 'undefined') return { fecha: '', localId: scopeLocal, estado: 'PROGRAMADA', q: '' };
  const params = new URLSearchParams(window.location.search);
  const esJornada = params.get('vista') === 'jornada';
  const estado = params.get('estado') ?? '';
  return {
    fecha: esJornada ? (params.get('fecha') ?? '') : '',
    // El alcance del usuario tiene prioridad incluso si la URL compartida
    // contiene otro local. El backend aplica la misma restricción.
    localId: scopeLocal || (esJornada ? (params.get('local_id') ?? '') : ''),
    estado: estado in ESTADO_META ? estado : 'PROGRAMADA',
    q: esJornada ? (params.get('q') ?? '') : '',
  };
}

interface FormularioAtencion {
  reserva: ReservaBD;
  atencion?: Atencion;
}

interface DetalleAtencion {
  reserva: ReservaBD;
  atencion: Atencion;
}

export function JornadaTab() {
  const [link] = useState(readJornadaLink);
  const [localId, setLocalId] = useState(link.localId);
  const [fecha, setFecha] = useState(link.fecha);
  const [estado, setEstado] = useState(link.estado);
  const [q, setQ] = useState(link.q);
  const [qAplicado, setQAplicado] = useState(link.q);
  const [hoyServidor, setHoyServidor] = useState('');
  const localAsignado = getAdminLocalScope();

  useEffect(() => {
    const t = window.setTimeout(() => setQAplicado(q), 350);
    return () => window.clearTimeout(t);
  }, [q]);

  const filters = useMemo(
    () => ({
      fecha: fecha || undefined,
      local_id: localId ? Number(localId) : undefined,
      estado: estado ? (estado as EstadoOperativoJornada) : undefined,
      q: qAplicado.trim() || undefined,
    }),
    [fecha, localId, estado, qAplicado],
  );
  const pagination = useCursorPagination(JSON.stringify(filters));
  const { cursor, requestRevision, shouldIncludeTotal, setMetadata } = pagination;

  const [data, setData] = useState<JornadaPage | null>(null);
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
      const res = await getJornada({
        ...filters,
        limit: PAGE_LIMIT,
        cursor,
        include_total: shouldIncludeTotal(),
      }, controller.signal);
      if (id !== requestRef.current) return;
      setData(res);
      setMetadata(res.paginacion);
      if (res.hoy) setHoyServidor(res.hoy);
      else if (!filters.fecha && res.fecha) setHoyServidor(res.fecha);
    } catch (err) {
      if (controller.signal.aborted || id !== requestRef.current) return;
      setError(err instanceof Error ? err.message : 'Error al cargar la jornada');
    } finally {
      if (id === requestRef.current) setLoading(false);
    }
  }, [filters, cursor, requestRevision, shouldIncludeTotal, setMetadata]);

  useEffect(() => {
    void load();
  }, [load]);

  const [resumenData, setResumenData] = useState<JornadaPage | null>(null);
  const [resumenError, setResumenError] = useState<string | null>(null);
  const resumenRequest = useRef(0);
  const resumenController = useRef<AbortController | null>(null);

  const loadResumen = useCallback(async () => {
    resumenController.current?.abort();
    const controller = new AbortController();
    resumenController.current = controller;
    const id = ++resumenRequest.current;
    setResumenData(null);
    setResumenError(null);
    try {
      const res = await getJornadaResumen({ fecha: fecha || undefined, local_id: localId ? Number(localId) : undefined }, controller.signal);
      if (id !== resumenRequest.current) return;
      setResumenData(res);
      if (res.hoy) setHoyServidor(res.hoy);
    } catch (err) {
      if (controller.signal.aborted || id !== resumenRequest.current) return;
      setResumenError(err instanceof Error ? err.message : 'No se pudo cargar el resumen de jornada');
    }
  }, [fecha, localId]);

  useEffect(() => {
    void loadResumen();
  }, [loadResumen]);

  useEffect(() => () => {
    requestRef.current += 1;
    controllerRef.current?.abort();
    resumenRequest.current += 1;
    resumenController.current?.abort();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    params.set('vista', 'jornada');
    if (fecha) params.set('fecha', fecha);
    if (localId) params.set('local_id', localId);
    if (estado) params.set('estado', estado);
    if (qAplicado.trim()) params.set('q', qAplicado.trim());
    const query = params.toString();
    window.history.replaceState(null, '', query ? `${window.location.pathname}?${query}` : window.location.pathname);
  }, [fecha, localId, estado, qAplicado]);

  const [reservaAbierta, setReservaAbierta] = useState<ReservaBD | null>(null);
  const [reservaCancelacion, setReservaCancelacion] = useState<ReservaBD | null>(null);
  const [detalle, setDetalle] = useState<DetalleAtencion | null>(null);
  const [formulario, setFormulario] = useState<FormularioAtencion | null>(null);

  const cargarReserva = async (reservaID: number): Promise<ReservaBD> => {
    const response = await getReservaByID(reservaID);
    if (!response.data?.reserva) throw new Error('No se encontró la reserva vinculada.');
    return response.data.reserva;
  };

  const verReserva = async (reservaID: number) => {
    try {
      setReservaAbierta(await cargarReserva(reservaID));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo cargar la reserva.');
    }
  };

  const atender = async (row: JornadaAtencion) => {
    try {
      setFormulario({ reserva: await cargarReserva(row.reserva_id) });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo cargar la reserva.');
    }
  };

  const solicitarCancelacion = async (reservaID: number) => {
    try {
      setReservaCancelacion(await cargarReserva(reservaID));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo cargar la reserva.');
    }
  };

  const verAtencion = async (row: JornadaAtencion) => {
    if (!row.atencion_id) return;
    try {
      const [atencion, reserva] = await Promise.all([
        getAtencion(row.atencion_id),
        cargarReserva(row.reserva_id),
      ]);
      setDetalle({ atencion, reserva });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo cargar la atención.');
    }
  };

  const editarAtencion = async (row: JornadaAtencion) => {
    if (!row.atencion_id || !row.puede_editar_atencion) return;
    try {
      const [atencion, reserva] = await Promise.all([
        getAtencion(row.atencion_id),
        cargarReserva(row.reserva_id),
      ]);
      setFormulario({ reserva, atencion });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo cargar la atención.');
    }
  };

  const fechaMostrada = fecha || hoyServidor || data?.fecha || '';
  const shiftFecha = (dias: number) => {
    const [year, month, day] = fechaMostrada.split('-').map(Number);
    if (!year || !month || !day) return;
    const next = new Date(Date.UTC(year, month - 1, day + dias));
    setFecha(next.toISOString().slice(0, 10));
  };

  const resumen = resumenData?.resumen;
  const rows = data?.items ?? [];
  const resumenLoading = !resumenData && !resumenError;
  const filtroResumen = [
    fechaMostrada ? `fecha ${fechaMostrada}` : '',
    localId ? 'local seleccionado' : '',
    estado ? `estado ${ESTADO_META[estado as EstadoOperativoJornada]?.label ?? estado}` : '',
    qAplicado.trim() ? `búsqueda "${qAplicado.trim()}"` : '',
  ].filter(Boolean).join(', ');
  const filtrarPorEstado = (nuevoEstado: EstadoOperativoJornada) => {
    setEstado((actual) => (actual === nuevoEstado ? '' : nuevoEstado));
  };

  return (
    <>
      <div className={styles.filters}>
        <FilterBar>
          <FilterBar.Item label="Fecha" className={styles.dateFilter}>
            <div className={styles.dateNav}>
              <button type="button" onClick={() => shiftFecha(-1)} disabled={!fechaMostrada} aria-label="Día anterior">
                <ChevronLeft size={16} />
              </button>
              <input type="date" value={fechaMostrada} onChange={(event) => setFecha(event.target.value)} />
              <button type="button" onClick={() => shiftFecha(1)} disabled={!fechaMostrada} aria-label="Día siguiente">
                <ChevronRight size={16} />
              </button>
              <button type="button" className={styles.hoy} onClick={() => setFecha(hoyServidor)} disabled={!hoyServidor}>
                Hoy
              </button>
            </div>
          </FilterBar.Item>
          {!localAsignado && (
            <FilterBar.Item label="Local">
              <LocalSelect value={localId} onChange={setLocalId} emptyLabel="Todos los locales" />
            </FilterBar.Item>
          )}
          {localAsignado && (
            <FilterBar.Item label="Local">
              <input type="text" value={localAsignado.nombre_local ?? 'Local asignado'} disabled aria-label="Local asignado" />
            </FilterBar.Item>
          )}
          <FilterBar.Item label="Estado">
            <CustomSelect
              value={estado}
              onChange={setEstado}
              options={ESTADO_OPTIONS}
              placeholder="Todos"
              allowClear
              searchable={false}
            />
          </FilterBar.Item>
          <FilterBar.Item label="Buscar" grow>
            <input
              type="text"
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Cliente, reserva, servicio o personal"
            />
          </FilterBar.Item>
        </FilterBar>
      </div>

      <StatGrid>
        <StatCard value={resumen?.programadas ?? 0} label="Programadas" accentColor="#14AEEF" loading={resumenLoading} onClick={() => filtrarPorEstado('PROGRAMADA')} active={estado === 'PROGRAMADA'} />
        <StatCard value={resumen?.atendidas ?? 0} label="Atendidas" accentColor="#22C55E" loading={resumenLoading} onClick={() => filtrarPorEstado('ATENDIDA')} active={estado === 'ATENDIDA'} />
        <StatCard value={resumen?.pendientes_cierre ?? 0} label="Pendientes de cierre" accentColor="#FFE600" loading={resumenLoading} onClick={() => filtrarPorEstado('PENDIENTE_CIERRE')} active={estado === 'PENDIENTE_CIERRE'} />
        <StatCard
          value={resumen?.canceladas ?? 0}
          label="Canceladas / No asistieron"
          accentColor="#EF4444"
          loading={resumenLoading}
          onClick={() => filtrarPorEstado('CANCELADA')}
          active={estado === 'CANCELADA'}
        />
        <StatCard value={resumen?.deducciones_pendientes ?? 0} label="Problemas con stock" accentColor="#F59E0B" loading={resumenLoading} />
      </StatGrid>

      {error && (
        <AlertBanner tone="danger" title="No se pudo cargar la jornada">
          {error}
        </AlertBanner>
      )}
      {resumenError && (
        <AlertBanner tone="danger" title="No se pudo cargar el resumen de jornada">
          {resumenError}
        </AlertBanner>
      )}

      <AdminPanel className={styles.listPanel}>
        <section className={styles.list} aria-busy={loading}>
          {loading && !data && <p className={styles.state}>Cargando jornada…</p>}
          {!loading && !error && rows.length === 0 && (
            <p className={styles.state}>Sin reservas para {filtroResumen || 'este día'}.</p>
          )}
          {rows.map((row) => {
            const meta = ESTADO_META[row.estado_operativo] ?? {
              label: row.estado_operativo,
              tone: 'neutral' as BadgeTone,
            };
            const estadoLabel = row.estado_operativo === 'CANCELADA' && row.motivo_cancelacion_tipo === 'INASISTENCIA'
              ? 'Cancelada · Inasistencia'
              : meta.label;
            return (
              <article key={row.reserva_id} className={styles.row}>
                <div className={styles.time}>
                  <strong>{row.hora_desde}</strong>
                  <span>{row.hora_hasta}</span>
                </div>
                <div className={styles.main}>
                  <span className={styles.cliente}>{row.cliente || 'Sin cliente'}</span>
                  <p className={styles.servicio}>{row.servicio || 'Sin servicio'}</p>
                  <div className={styles.meta}>
                    <span>{row.empleado_nombre || 'Sin personal'}</span>
                    <span>{row.local_nombre || 'Sin local'}</span>
                    {row.insumos_pendientes > 0 ? (
                      <span
                        className={styles.pending}
                        title={row.insumos_resumen ? `Insumos registrados: ${row.insumos_resumen}` : undefined}
                      >
                        <AlertTriangle size={12} />
                        {row.insumos_pendientes} pendiente(s)
                      </span>
                    ) : (
                      <span title={row.insumos_resumen ? `Insumos: ${row.insumos_resumen}` : undefined}>
                        {row.insumos_registrados > 0 ? `${row.insumos_registrados} insumo(s)` : 'Sin insumos'}
                      </span>
                    )}
                    <button
                      type="button"
                      className={styles.reservaLink}
                      onClick={() => void verReserva(row.reserva_id)}
                    >
                      Reserva #{row.reserva_id}
                    </button>
                  </div>
                </div>
                <div className={styles.side}>
                  <StatusBadge tone={meta.tone} title={row.motivo_cancelacion_tipo}>{estadoLabel}</StatusBadge>
                  <div className={styles.actions}>
                    {row.puede_atender && (
                      <AdminButton size="xs" icon={<Play size={13} />} onClick={() => void atender(row)}>
                        Atender
                      </AdminButton>
                    )}
                    {row.estado_reserva === 'AGENDADO' && !row.atencion_id && (
                      <AdminButton variant="danger" size="xs" icon={<XCircle size={13} />} onClick={() => void solicitarCancelacion(row.reserva_id)}>
                        Cancelar reserva
                      </AdminButton>
                    )}
                    {row.puede_ver_atencion && (
                      <AdminButton variant="secondary" size="xs" icon={<ClipboardList size={13} />} onClick={() => void verAtencion(row)}>
                        Ver atención
                      </AdminButton>
                    )}
                    {row.puede_editar_atencion && (
                      <AdminButton variant="secondary" size="xs" icon={<Pencil size={13} />} onClick={() => void editarAtencion(row)}>
                        Editar atención
                      </AdminButton>
                    )}
                    <AdminButton variant="secondary" size="xs" icon={<Eye size={13} />} onClick={() => void verReserva(row.reserva_id)}>
                      Ver reserva
                    </AdminButton>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      </AdminPanel>
      <CursorPagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        hasNext={pagination.hasNext}
        loading={loading}
        onPrevious={pagination.previous}
        onNext={pagination.next}
      />

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
        reserva={detalle?.reserva ?? null}
        atencion={detalle?.atencion ?? null}
        onClose={() => setDetalle(null)}
      />
      <AtencionFormModal
        reserva={formulario?.reserva ?? null}
        atencion={formulario?.atencion ?? null}
        onClose={() => setFormulario(null)}
        onSaved={() => {
          setFormulario(null);
          void load();
          void loadResumen();
        }}
      />
      <CancelarReservaModal
        reserva={reservaCancelacion}
        onClose={() => setReservaCancelacion(null)}
        onCancelled={() => { void load(); void loadResumen(); }}
      />
    </>
  );
}
