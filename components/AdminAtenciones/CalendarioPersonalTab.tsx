'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CalendarDays, ChevronLeft, ChevronRight, ClipboardList, Eye, List, MapPin, Pencil, UsersRound } from 'lucide-react';
import {
  AdminPanel,
  AdminButton,
  AlertBanner,
  CursorPagination,
  FilterBar,
  LocalSelect,
  StatusBadge,
} from '@/components/AdminConfig';
import { AtencionDetalleModal } from '@/components/AdminAtenciones/AtencionDetalleModal';
import { AtencionFormModal } from '@/components/AdminAtenciones/AtencionFormModal';
import { ReservaDetailModal } from '@/components/AdminReservas/ReservaDetailModal';
import {
  getAtencion,
  getCalendarioPersonal,
  type Atencion,
} from '@/lib/api/atenciones';
import { getAdminLocalScope } from '@/lib/api/localScope';
import { getReservaByID } from '@/lib/api/reservas';
import { PAGE_LIMIT } from '@/lib/api/pagination';
import { useCursorPagination } from '@/lib/hooks/useCursorPagination';
import type { ReservaBD } from '@/types/reserva';
import type { CalendarioPersonalEvento } from '@/types/atencionesVistas';
import { toast } from '@/components/Shared/Toast';
import styles from './CalendarioPersonalTab.module.css';
import listStyles from './CalendarioLista.module.css';

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MAX_EVENTOS_DIA = 4;

function toISO(date: Date): string {
  return date.toLocaleDateString('en-CA');
}

function lunesDe(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  const day = date.getDay();
  date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day));
  return toISO(date);
}

function sumarDias(iso: string, dias: number): string {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + dias);
  return toISO(date);
}

function etiquetaDia(iso: string, index: number): string {
  const date = new Date(`${iso}T00:00:00`);
  return `${DIAS[index]} ${date.getDate()} ${date.toLocaleDateString('es-BO', { month: 'short' }).replace('.', '')}`;
}

function fechaLista(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  return date.toLocaleDateString('es-BO', { weekday: 'short', day: 'numeric', month: 'short' }).replaceAll('.', '');
}

function hoyISO(): string {
  return toISO(new Date());
}

interface LinkPersonal {
  fecha: string;
  localId: string;
  cliente: string;
  servicio: string;
  empleado: string;
  q: string;
}

function readLink(): LinkPersonal {
  const scopeLocal = String(getAdminLocalScope()?.local_id ?? '');
  if (typeof window === 'undefined') return { fecha: '', localId: scopeLocal, cliente: '', servicio: '', empleado: '', q: '' };
  const params = new URLSearchParams(window.location.search);
  const isPersonal = params.get('vista') === 'personal';
  return {
    fecha: isPersonal ? (params.get('fecha') ?? '') : '',
    localId: scopeLocal || (isPersonal ? (params.get('local_id') ?? '') : ''),
    cliente: isPersonal ? (params.get('cliente') ?? '') : '',
    servicio: isPersonal ? (params.get('servicio') ?? '') : '',
    empleado: isPersonal ? (params.get('empleado') ?? '') : '',
    q: isPersonal ? (params.get('q') ?? '') : '',
  };
}

interface DetalleAtencion {
  atencion: Atencion;
  reserva: ReservaBD;
}

/** Calendario semanal de atenciones cerradas que prioriza quién atendió. */
export function CalendarioPersonalTab() {
  const [link] = useState(readLink);
  const [fechaBase, setFechaBase] = useState(() => link.fecha || hoyISO());
  const [localId, setLocalId] = useState(link.localId);
  const [cliente, setCliente] = useState(link.cliente);
  const [servicio, setServicio] = useState(link.servicio);
  const [empleado, setEmpleado] = useState(link.empleado);
  const [q, setQ] = useState(link.q);
  const [textoAplicado, setTextoAplicado] = useState(() => ({
    cliente: link.cliente.trim(), servicio: link.servicio.trim(), empleado: link.empleado.trim(), q: link.q.trim(),
  }));
  const [expandidos, setExpandidos] = useState<Set<string>>(() => new Set());
  const localAsignado = getAdminLocalScope();

  useEffect(() => {
    const timer = window.setTimeout(() => setTextoAplicado({
      cliente: cliente.trim(), servicio: servicio.trim(), empleado: empleado.trim(), q: q.trim(),
    }), 350);
    return () => window.clearTimeout(timer);
  }, [cliente, servicio, empleado, q]);

  const lunes = useMemo(() => lunesDe(fechaBase), [fechaBase]);
  const sabado = useMemo(() => sumarDias(lunes, 5), [lunes]);
  const dias = useMemo(() => DIAS.map((_, index) => sumarDias(lunes, index)), [lunes]);
  const filters = useMemo(() => ({
    fecha_desde: lunes,
    fecha_hasta: sabado,
    local_id: localId ? Number(localId) : undefined,
    ...textoAplicado,
  }), [lunes, sabado, localId, textoAplicado]);
  const pagination = useCursorPagination(JSON.stringify(filters));
  const { cursor, requestRevision, shouldIncludeTotal, setMetadata } = pagination;

  const [eventos, setEventos] = useState<CalendarioPersonalEvento[]>([]);
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
      const response = await getCalendarioPersonal({
        ...filters,
        limit: PAGE_LIMIT,
        cursor,
        include_total: shouldIncludeTotal(),
      }, controller.signal);
      if (id !== requestRef.current) return;
      setEventos(response.eventos);
      setMetadata(response.paginacion);
    } catch (err) {
      if (controller.signal.aborted || id !== requestRef.current) return;
      setError(err instanceof Error ? err.message : 'No se pudo cargar el calendario de personal');
    } finally {
      if (id === requestRef.current) setLoading(false);
    }
  }, [filters, cursor, requestRevision, shouldIncludeTotal, setMetadata]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => () => { requestRef.current += 1; controllerRef.current?.abort(); }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    params.set('vista', 'personal');
    params.set('fecha', fechaBase);
    if (localId) params.set('local_id', localId);
    if (textoAplicado.cliente) params.set('cliente', textoAplicado.cliente);
    if (textoAplicado.servicio) params.set('servicio', textoAplicado.servicio);
    if (textoAplicado.empleado) params.set('empleado', textoAplicado.empleado);
    if (textoAplicado.q) params.set('q', textoAplicado.q);
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
  }, [fechaBase, localId, textoAplicado]);

  const eventosPorDia = useMemo(() => {
    const map = new Map<string, CalendarioPersonalEvento[]>();
    dias.forEach((dia) => map.set(dia, []));
    eventos.forEach((evento) => map.get(evento.fecha)?.push(evento));
    return map;
  }, [dias, eventos]);

  const [detalle, setDetalle] = useState<DetalleAtencion | null>(null);
  const [reservaAbierta, setReservaAbierta] = useState<ReservaBD | null>(null);
  const [edicion, setEdicion] = useState<DetalleAtencion | null>(null);
  const abrirAtencion = async (evento: CalendarioPersonalEvento) => {
    try {
      const [atencion, reservaResponse] = await Promise.all([getAtencion(evento.atencion_id), getReservaByID(evento.reserva_id)]);
      if (!reservaResponse.data?.reserva) throw new Error('No se encontró la reserva vinculada.');
      setDetalle({ atencion, reserva: reservaResponse.data.reserva });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo cargar la atención.');
    }
  };
  const verReserva = async (evento: CalendarioPersonalEvento) => {
    try {
      const response = await getReservaByID(evento.reserva_id);
      if (!response.data?.reserva) throw new Error('No se encontró la reserva vinculada.');
      setReservaAbierta(response.data.reserva);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo cargar la reserva.');
    }
  };
  const editarAtencion = async (evento: CalendarioPersonalEvento) => {
    if (evento.insumos_pendientes <= 0) return;
    try {
      const [atencion, reservaResponse] = await Promise.all([getAtencion(evento.atencion_id), getReservaByID(evento.reserva_id)]);
      if (!reservaResponse.data?.reserva) throw new Error('No se encontró la reserva vinculada.');
      setEdicion({ atencion, reserva: reservaResponse.data.reserva });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo cargar la atención.');
    }
  };

  const cambiarSemana = (diasCambio: number) => setFechaBase(sumarDias(fechaBase, diasCambio));
  const alternarDia = (dia: string) => setExpandidos((current) => {
    const next = new Set(current);
    if (next.has(dia)) next.delete(dia); else next.add(dia);
    return next;
  });

  return (
    <>
      <div className={styles.filters}>
        <FilterBar>
          <FilterBar.Item label="Semana" className={styles.weekFilter}>
            <div className={styles.weekNav}>
              <button type="button" onClick={() => cambiarSemana(-7)} aria-label="Semana anterior"><ChevronLeft size={16} /></button>
              <input type="date" value={fechaBase} onChange={(event) => setFechaBase(event.target.value)} />
              <button type="button" onClick={() => cambiarSemana(7)} aria-label="Semana siguiente"><ChevronRight size={16} /></button>
              <button type="button" className={styles.today} onClick={() => setFechaBase(hoyISO())}>Hoy</button>
            </div>
          </FilterBar.Item>
          {localAsignado ? (
            <FilterBar.Item label="Local"><input value={localAsignado.nombre_local ?? 'Local asignado'} disabled aria-label="Local asignado" /></FilterBar.Item>
          ) : (
            <FilterBar.Item label="Local"><LocalSelect value={localId} onChange={setLocalId} emptyLabel="Todos los locales" /></FilterBar.Item>
          )}
          <FilterBar.Item label="Personal"><input value={empleado} onChange={(event) => setEmpleado(event.target.value)} placeholder="Quién atendió" /></FilterBar.Item>
          <FilterBar.Item label="Cliente"><input value={cliente} onChange={(event) => setCliente(event.target.value)} placeholder="Nombre del cliente" /></FilterBar.Item>
          <FilterBar.Item label="Servicio"><input value={servicio} onChange={(event) => setServicio(event.target.value)} placeholder="Servicio realizado" /></FilterBar.Item>
          <FilterBar.Item label="Buscar" grow><input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Reserva, cliente, servicio o personal" /></FilterBar.Item>
        </FilterBar>
      </div>

      {error && <AlertBanner tone="danger" title="No se pudo cargar el calendario de personal">{error}</AlertBanner>}
      <AdminPanel className={styles.calendarPanel}>
        <div className={styles.calendarHeading}>
          <CalendarDays size={16} aria-hidden="true" />
          <strong>Personal que atendió</strong>
          <span>Semana del {lunes} al {sabado}</span>
        </div>
        {loading && <p className={styles.state}>Cargando atenciones…</p>}
        {!loading && !error && (
          <div className={styles.calendar}>
            {dias.map((dia, index) => {
              const eventosDia = eventosPorDia.get(dia) ?? [];
              const expandido = expandidos.has(dia);
              const visibles = expandido ? eventosDia : eventosDia.slice(0, MAX_EVENTOS_DIA);
              return (
                <section key={dia} className={styles.day}>
                  <header><span>{etiquetaDia(dia, index)}</span><small>{eventosDia.length} {eventosDia.length === 1 ? 'atención' : 'atenciones'}</small></header>
                  <div className={styles.events}>
                    {eventosDia.length === 0 ? <p className={styles.emptyDay}>Sin atenciones</p> : visibles.map((evento) => (
                      <button key={evento.atencion_id} type="button" className={styles.event} onClick={() => void abrirAtencion(evento)}>
                        <span className={styles.eventTime}>{evento.hora_inicio?.slice(0, 5) || 'Sin hora'} – {evento.hora_fin?.slice(0, 5) || '—'}</span>
                        <span className={styles.personal}><UsersRound size={13} aria-hidden="true" /><strong>{evento.empleado_nombre || 'Sin personal registrado'}</strong></span>
                        <span className={styles.reservaInfo}>
                          <strong>{evento.cliente || 'Sin cliente'}</strong>
                          <span className={styles.service}>{evento.servicio || 'Sin servicio'}</span>
                          <span className={styles.meta}><MapPin size={11} /> {evento.lugar || evento.local_nombre || 'Sin lugar'}</span>
                        </span>
                        {evento.insumos_pendientes > 0 && <StatusBadge tone="danger">Stock pendiente</StatusBadge>}
                      </button>
                    ))}
                    {eventosDia.length > MAX_EVENTOS_DIA && (
                      <button type="button" className={styles.more} onClick={() => alternarDia(dia)}>{expandido ? 'Ver menos' : `Ver ${eventosDia.length - MAX_EVENTOS_DIA} más`}</button>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </AdminPanel>
      {!loading && !error && (
        <AdminPanel className={listStyles.panel}>
          <div className={listStyles.heading}>
            <List size={16} aria-hidden="true" />
            <strong>Lista de atenciones</strong>
            <span>{eventos.length} en esta página</span>
          </div>
          <div className={listStyles.list}>
            {eventos.map((evento) => (
              <article key={evento.atencion_id} className={listStyles.row}>
                <div className={listStyles.time}>
                  <span className={listStyles.date}>{fechaLista(evento.fecha)}</span>
                  <strong>{evento.hora_inicio?.slice(0, 5) || 'Sin hora'}</strong>
                  <span>{evento.hora_fin?.slice(0, 5) || '—'}</span>
                </div>
                <div className={listStyles.main}>
                  <span className={listStyles.cliente}>{evento.cliente || 'Sin cliente'}</span>
                  <p className={listStyles.servicio}>{evento.servicio || 'Sin servicio'}</p>
                  <div className={listStyles.meta}>
                    <span>{evento.empleado_nombre || 'Sin personal registrado'}</span>
                    <span>{evento.local_nombre || evento.lugar || 'Sin local'}</span>
                    {evento.insumos_pendientes > 0 ? <span className={listStyles.pending}><AlertTriangle size={12} />{evento.insumos_pendientes} pendiente(s)</span> : <span>Sin problemas de stock</span>}
                    <span>Reserva #{evento.reserva_id}</span>
                  </div>
                </div>
                <div className={listStyles.side}>
                  <StatusBadge tone={evento.insumos_pendientes > 0 ? 'danger' : 'success'}>{evento.insumos_pendientes > 0 ? 'Deducción pendiente' : 'Atendida'}</StatusBadge>
                  <div className={listStyles.actions}>
                    <AdminButton variant="secondary" size="xs" icon={<ClipboardList size={13} />} onClick={() => void abrirAtencion(evento)}>Ver atención</AdminButton>
                    {evento.insumos_pendientes > 0 && <AdminButton variant="secondary" size="xs" icon={<Pencil size={13} />} onClick={() => void editarAtencion(evento)}>Editar atención</AdminButton>}
                    <AdminButton variant="secondary" size="xs" icon={<Eye size={13} />} onClick={() => void verReserva(evento)}>Ver reserva</AdminButton>
                  </div>
                </div>
              </article>
            ))}
            {eventos.length === 0 && <p className={styles.state}>No hay atenciones para los filtros seleccionados.</p>}
          </div>
        </AdminPanel>
      )}
      <CursorPagination page={pagination.page} totalPages={pagination.totalPages} hasNext={pagination.hasNext} loading={loading} onPrevious={pagination.previous} onNext={pagination.next} />
      <ReservaDetailModal reserva={reservaAbierta} onClose={() => setReservaAbierta(null)} onEdit={() => undefined} onDelete={() => undefined} readOnly />
      <AtencionFormModal reserva={edicion?.reserva ?? null} atencion={edicion?.atencion ?? null} onClose={() => setEdicion(null)} onSaved={() => { setEdicion(null); void load(); }} />
      <AtencionDetalleModal reserva={detalle?.reserva ?? null} atencion={detalle?.atencion ?? null} onClose={() => setDetalle(null)} />
    </>
  );
}
