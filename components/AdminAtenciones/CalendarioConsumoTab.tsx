'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CalendarDays, ChevronLeft, ChevronRight, List, MapPin } from 'lucide-react';
import { AdminPanel, AlertBanner, CursorPagination, FilterBar, LocalSelect, StatusBadge } from '@/components/AdminConfig';
import { CustomSelect } from '@/components/Custom/CustomSelectAdmin';
import { AtencionDetalleModal } from '@/components/AdminAtenciones/AtencionDetalleModal';
import { getAtencion, getCalendarioConsumo, type Atencion } from '@/lib/api/atenciones';
import { getAdminLocalScope } from '@/lib/api/localScope';
import { getReservaByID } from '@/lib/api/reservas';
import { PAGE_LIMIT as DEFAULT_PAGE_LIMIT } from '@/lib/api/pagination';
import { useCursorPagination } from '@/lib/hooks/useCursorPagination';
import { useInventarioItems } from '@/lib/hooks/useInventarioItems';
import { formatQty } from '@/lib/utils/format';
import type { ReservaBD } from '@/types/reserva';
import type { CalendarioConsumoEvento } from '@/types/atencionesVistas';
import { toast } from '@/components/Shared/Toast';
import styles from './CalendarioConsumoTab.module.css';
import listStyles from './CalendarioLista.module.css';

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MAX_EVENTOS_DIA = 4;

function toISO(date: Date) { return date.toLocaleDateString('en-CA'); }
function hoyISO() { return toISO(new Date()); }
function sumarDias(iso: string, amount: number) { const date = new Date(`${iso}T00:00:00`); date.setDate(date.getDate() + amount); return toISO(date); }
function lunesDe(iso: string) { const date = new Date(`${iso}T00:00:00`); date.setDate(date.getDate() + (date.getDay() === 0 ? -6 : 1 - date.getDay())); return toISO(date); }
function etiquetaDia(iso: string, index: number) { const date = new Date(`${iso}T00:00:00`); return `${DIAS[index]} ${date.getDate()} ${date.toLocaleDateString('es-BO', { month: 'short' }).replace('.', '')}`; }

interface LinkConsumo { fecha: string; localId: string; itemId: string; estado: string; cliente: string; servicio: string; empleado: string; q: string }
function readLink(): LinkConsumo {
  const scopeLocal = String(getAdminLocalScope()?.local_id ?? '');
  if (typeof window === 'undefined') return { fecha: '', localId: scopeLocal, itemId: '', estado: '', cliente: '', servicio: '', empleado: '', q: '' };
  const params = new URLSearchParams(window.location.search);
  const active = params.get('vista') === 'consumo';
  return {
    fecha: active ? (params.get('fecha') ?? '') : '', localId: scopeLocal || (active ? (params.get('local_id') ?? '') : ''),
    itemId: active ? (params.get('item_id') ?? '') : '', estado: active ? (params.get('estado_descuento') ?? '') : '',
    cliente: active ? (params.get('cliente') ?? '') : '', servicio: active ? (params.get('servicio') ?? '') : '',
    empleado: active ? (params.get('empleado') ?? '') : '', q: active ? (params.get('q') ?? '') : '',
  };
}
interface DetalleAtencion { atencion: Atencion; reserva: ReservaBD }

/** Calendario semanal de insumos declarados en cada atención cerrada. */
export function CalendarioConsumoTab() {
  const [link] = useState(readLink);
  const [fechaBase, setFechaBase] = useState(() => link.fecha || hoyISO());
  const [localId, setLocalId] = useState(link.localId);
  const [itemId, setItemId] = useState(link.itemId);
  const [estado, setEstado] = useState(link.estado);
  const [cliente] = useState(link.cliente);
  const [servicio] = useState(link.servicio);
  const [empleado, setEmpleado] = useState(link.empleado);
  const [q, setQ] = useState(link.q);
  const [textoAplicado, setTextoAplicado] = useState(() => ({ cliente: link.cliente.trim(), servicio: link.servicio.trim(), empleado: link.empleado.trim(), q: link.q.trim() }));
  const [expandidos, setExpandidos] = useState<Set<string>>(() => new Set());
  const localAsignado = getAdminLocalScope();
  const { items } = useInventarioItems({ activo: true, limit: 200 });

  useEffect(() => { const timer = window.setTimeout(() => setTextoAplicado({ cliente: cliente.trim(), servicio: servicio.trim(), empleado: empleado.trim(), q: q.trim() }), 350); return () => window.clearTimeout(timer); }, [cliente, servicio, empleado, q]);
  const lunes = useMemo(() => lunesDe(fechaBase), [fechaBase]);
  const sabado = useMemo(() => sumarDias(lunes, 5), [lunes]);
  const dias = useMemo(() => DIAS.map((_, index) => sumarDias(lunes, index)), [lunes]);
  const filters = useMemo(() => ({ fecha_desde: lunes, fecha_hasta: sabado, local_id: localId ? Number(localId) : undefined, item_id: itemId ? Number(itemId) : undefined, estado_descuento: (estado === 'DESCONTADO' || estado === 'PENDIENTE' ? estado : undefined) as 'DESCONTADO' | 'PENDIENTE' | undefined, ...textoAplicado }), [lunes, sabado, localId, itemId, estado, textoAplicado]);
  const pagination = useCursorPagination(JSON.stringify(filters));
  const { cursor, requestRevision, shouldIncludeTotal, setMetadata } = pagination;
  const [eventos, setEventos] = useState<CalendarioConsumoEvento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0); const controllerRef = useRef<AbortController | null>(null);
  const load = useCallback(async () => {
    void requestRevision; controllerRef.current?.abort(); const controller = new AbortController(); controllerRef.current = controller; const id = ++requestRef.current;
    setLoading(true); setError(null);
    try { const response = await getCalendarioConsumo({ ...filters, limit: DEFAULT_PAGE_LIMIT, cursor, include_total: shouldIncludeTotal() }, controller.signal); if (id !== requestRef.current) return; setEventos(response.eventos); setMetadata(response.paginacion); }
    catch (err) { if (controller.signal.aborted || id !== requestRef.current) return; setError(err instanceof Error ? err.message : 'No se pudo cargar el calendario de consumo'); }
    finally { if (id === requestRef.current) setLoading(false); }
  }, [filters, cursor, requestRevision, shouldIncludeTotal, setMetadata]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => () => { requestRef.current += 1; controllerRef.current?.abort(); }, []);
  useEffect(() => { const params = new URLSearchParams(); params.set('vista', 'consumo'); params.set('fecha', fechaBase); if (localId) params.set('local_id', localId); if (itemId) params.set('item_id', itemId); if (estado) params.set('estado_descuento', estado); Object.entries(textoAplicado).forEach(([key, value]) => { if (value) params.set(key, value); }); window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`); }, [fechaBase, localId, itemId, estado, textoAplicado]);
  const porDia = useMemo(() => { const map = new Map<string, CalendarioConsumoEvento[]>(); dias.forEach((day) => map.set(day, [])); eventos.forEach((event) => map.get(event.fecha)?.push(event)); return map; }, [dias, eventos]);
  const [detalle, setDetalle] = useState<DetalleAtencion | null>(null);
  const abrirAtencion = async (evento: CalendarioConsumoEvento) => { try { const [atencion, reservaResponse] = await Promise.all([getAtencion(evento.atencion_id), getReservaByID(evento.reserva_id)]); if (!reservaResponse.data?.reserva) throw new Error('No se encontró la reserva vinculada.'); setDetalle({ atencion, reserva: reservaResponse.data.reserva }); } catch (err) { toast.error(err instanceof Error ? err.message : 'No se pudo cargar la atención.'); } };
  const itemOptions = items.filter((item) => item.activo).map((item) => ({ value: String(item.id), label: `${item.nombre} (${item.unidad_medida})` }));
  return <>
    <div className={styles.filters}><FilterBar>
      <FilterBar.Item label="Semana" className={styles.weekFilter}><div className={styles.weekNav}><button type="button" onClick={() => setFechaBase(sumarDias(fechaBase, -7))} aria-label="Semana anterior"><ChevronLeft size={16} /></button><input type="date" value={fechaBase} onChange={(event) => setFechaBase(event.target.value)} /><button type="button" onClick={() => setFechaBase(sumarDias(fechaBase, 7))} aria-label="Semana siguiente"><ChevronRight size={16} /></button><button type="button" className={styles.today} onClick={() => setFechaBase(hoyISO())}>Hoy</button></div></FilterBar.Item>
      {localAsignado ? <FilterBar.Item label="Local"><input value={localAsignado.nombre_local ?? 'Local asignado'} disabled aria-label="Local asignado" /></FilterBar.Item> : <FilterBar.Item label="Local"><LocalSelect value={localId} onChange={setLocalId} emptyLabel="Todos los locales" /></FilterBar.Item>}
      <FilterBar.Item label="Insumo"><CustomSelect value={itemId} onChange={setItemId} options={itemOptions} placeholder="Todos" allowClear /></FilterBar.Item>
      <FilterBar.Item label="Stock"><CustomSelect value={estado} onChange={setEstado} options={[{ value: 'DESCONTADO', label: 'Descontado' }, { value: 'PENDIENTE', label: 'Deducción pendiente' }]} placeholder="Todos" allowClear searchable={false} /></FilterBar.Item>
      <FilterBar.Item label="Personal"><input value={empleado} onChange={(event) => setEmpleado(event.target.value)} placeholder="Quién atendió" /></FilterBar.Item><FilterBar.Item label="Buscar" grow><input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Cliente, reserva, servicio o insumo" /></FilterBar.Item>
    </FilterBar></div>
    {error && <AlertBanner tone="danger" title="No se pudo cargar el calendario de consumo">{error}</AlertBanner>}
    <AdminPanel className={styles.calendarPanel}><div className={styles.calendarHeading}><CalendarDays size={16} aria-hidden="true" /><strong>Insumos usados</strong><span>Semana del {lunes} al {sabado}</span></div>
      {loading && <p className={styles.state}>Cargando consumos…</p>}
      {!loading && !error && <div className={styles.calendar}>{dias.map((dia, index) => { const lista = porDia.get(dia) ?? []; const expanded = expandidos.has(dia); const visibles = expanded ? lista : lista.slice(0, MAX_EVENTOS_DIA); return <section key={dia} className={styles.day}><header><span>{etiquetaDia(dia, index)}</span><small>{lista.length} {lista.length === 1 ? 'atención' : 'atenciones'}</small></header><div className={styles.events}>{lista.length === 0 ? <p className={styles.emptyDay}>Sin consumos</p> : visibles.map((evento) => <button key={evento.atencion_id} type="button" className={styles.event} onClick={() => void abrirAtencion(evento)}><span className={styles.eventTop}><span className={styles.eventTime}>{evento.hora_inicio?.slice(0, 5) || 'Sin hora'}</span>{evento.insumos_pendientes > 0 && <AlertTriangle size={13} className={styles.warn} />}</span><strong>{evento.cliente || 'Sin cliente'}</strong><span className={styles.service}>{evento.servicio || 'Sin servicio'}</span>{evento.insumos.length > 0 ? <span className={styles.supplies}>{evento.insumos.map((insumo, i) => <span key={`${insumo.item_id ?? 'sin'}-${i}`}><span>{insumo.item_nombre}</span><b className={insumo.cantidad_pendiente > 0 ? styles.pendingQty : undefined}>{formatQty(insumo.cantidad_usada, insumo.unidad_medida)}</b></span>)}</span> : !itemId && <span className={styles.noSupplies}>Sin insumos registrados</span>}<span className={styles.meta}><MapPin size={11} /> {evento.empleado_nombre || 'Sin personal'} · {evento.local_nombre || 'Sin local'}</span>{evento.insumos_pendientes > 0 && <StatusBadge tone="danger">Deducción pendiente</StatusBadge>}</button>)}{lista.length > MAX_EVENTOS_DIA && <button type="button" className={styles.more} onClick={() => setExpandidos((current) => { const next = new Set(current); if (next.has(dia)) next.delete(dia); else next.add(dia); return next; })}>{expanded ? 'Ver menos' : `Ver ${lista.length - MAX_EVENTOS_DIA} más`}</button>}</div></section>; })}</div>}
    </AdminPanel>
    {!loading && !error && <AdminPanel className={listStyles.panel}>
      <div className={listStyles.heading}><List size={16} aria-hidden="true" /><strong>Lista de consumos</strong><span>{eventos.length} en esta página</span></div>
      <div className={listStyles.list}>
        {eventos.map((evento) => <button key={evento.atencion_id} type="button" className={listStyles.row} onClick={() => void abrirAtencion(evento)}>
          <span className={listStyles.time}>{evento.hora_inicio?.slice(0, 5) || 'Sin hora'}</span>
          <span className={listStyles.main}>
            <strong className={listStyles.title}>{evento.cliente || 'Sin cliente'}</strong>
            <span className={listStyles.detail}>{evento.servicio || 'Sin servicio'} · {evento.empleado_nombre || 'Sin personal'}</span>
          </span>
          <span className={listStyles.secondary}>
            {evento.insumos.length > 0 ? <span className={listStyles.supplies}>{evento.insumos.map((insumo, index) => <span className={listStyles.supply} key={`${insumo.item_id ?? 'sin'}-${index}`}>{insumo.item_nombre} <strong>{formatQty(insumo.cantidad_usada, insumo.unidad_medida)}</strong></span>)}</span> : <span className={listStyles.meta}>Sin insumos registrados</span>}
            <span className={listStyles.meta}>{evento.local_nombre || 'Sin local'} · Reserva #{evento.reserva_id}</span>
          </span>
          <span className={listStyles.side}>{evento.insumos_pendientes > 0 && <StatusBadge tone="danger">Deducción pendiente</StatusBadge>}</span>
        </button>)}
        {eventos.length === 0 && <p className={styles.state}>No hay consumos para los filtros seleccionados.</p>}
      </div>
    </AdminPanel>}
    <CursorPagination page={pagination.page} totalPages={pagination.totalPages} hasNext={pagination.hasNext} loading={loading} onPrevious={pagination.previous} onNext={pagination.next} />
    <AtencionDetalleModal reserva={detalle?.reserva ?? null} atencion={detalle?.atencion ?? null} onClose={() => setDetalle(null)} />
  </>;
}
