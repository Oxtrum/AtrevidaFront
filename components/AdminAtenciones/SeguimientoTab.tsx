'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Eye, Pencil, Play, XCircle } from 'lucide-react';
import { AdminButton, AdminPanel, AlertBanner, CursorPagination, FilterBar, LocalSelect, StatCard, StatGrid, StatusBadge } from '@/components/AdminConfig';
import type { BadgeTone } from '@/components/AdminConfig';
import { CustomSelect } from '@/components/Custom/CustomSelectAdmin';
import { AtencionDetalleModal } from '@/components/AdminAtenciones/AtencionDetalleModal';
import { AtencionFormModal } from '@/components/AdminAtenciones/AtencionFormModal';
import { ReservaDetailModal } from '@/components/AdminReservas/ReservaDetailModal';
import { CancelarReservaModal } from '@/components/AdminReservas/CancelarReservaModal';
import { getAtencion, getSeguimiento, getSeguimientoResumen, type Atencion, type SeguimientoItem, type TipoSeguimiento } from '@/lib/api/atenciones';
import { getAdminLocalScope } from '@/lib/api/localScope';
import { getReservaByID } from '@/lib/api/reservas';
import { PAGE_LIMIT } from '@/lib/api/pagination';
import { useCursorPagination } from '@/lib/hooks/useCursorPagination';
import type { ReservaBD } from '@/types/reserva';
import { toast } from '@/components/Shared/Toast';
import styles from './JornadaTab.module.css';

const META: Record<TipoSeguimiento, { label: string; tone: BadgeTone }> = {
  DEDUCCION_PENDIENTE: { label: 'Problema con stock', tone: 'warning' }, INASISTENCIA: { label: 'Inasistencia', tone: 'danger' },
  CANCELACION: { label: 'Cancelada', tone: 'danger' }, PENDIENTE_CIERRE: { label: 'Pendiente de cierre', tone: 'warning' },
};
type ModalData = { reserva: ReservaBD; atencion?: Atencion };

function fechaCorta(valor: string) {
  const [anio, mes, dia] = valor.slice(0, 10).split('-').map(Number);
  if (!anio || !mes || !dia) return valor;
  return new Date(anio, mes - 1, dia).toLocaleDateString('es-BO', { day: 'numeric', month: 'short', year: 'numeric' }).replace('.', '');
}

interface SeguimientoLink { localId: string; desde: string; hasta: string; tipo: TipoSeguimiento | ''; q: string }
function readSeguimientoLink(): SeguimientoLink {
  const scopeLocal = String(getAdminLocalScope()?.local_id ?? '');
  if (typeof window === 'undefined') return { localId: scopeLocal, desde: '', hasta: '', tipo: '', q: '' };
  const params = new URLSearchParams(window.location.search);
  const activo = params.get('vista') === 'seguimiento';
  const tipo = params.get('tipo') ?? '';
  const tipos: TipoSeguimiento[] = ['DEDUCCION_PENDIENTE', 'INASISTENCIA', 'CANCELACION', 'PENDIENTE_CIERRE'];
  return {
    localId: scopeLocal || (activo ? (params.get('local_id') ?? '') : ''),
    desde: activo ? (params.get('fecha_desde') ?? '') : '', hasta: activo ? (params.get('fecha_hasta') ?? '') : '',
    tipo: tipos.includes(tipo as TipoSeguimiento) ? tipo as TipoSeguimiento : '', q: activo ? (params.get('q') ?? '') : '',
  };
}

/** Casos operativos que todavía requieren una acción, separados de Historial. */
export function SeguimientoTab() {
  const scope = getAdminLocalScope();
  const [link] = useState(readSeguimientoLink);
  const [localId, setLocalId] = useState(link.localId);
  const [desde, setDesde] = useState(link.desde); const [hasta, setHasta] = useState(link.hasta);
  const [tipo, setTipo] = useState<TipoSeguimiento | ''>(link.tipo); const [q, setQ] = useState(link.q); const [qAplicado, setQAplicado] = useState(link.q);
  useEffect(() => { const timer = window.setTimeout(() => setQAplicado(q.trim()), 350); return () => window.clearTimeout(timer); }, [q]);
  const filters = useMemo(() => ({ local_id: localId ? Number(localId) : undefined, fecha_desde: desde || undefined, fecha_hasta: hasta || undefined, tipo: tipo || undefined, q: qAplicado || undefined }), [localId, desde, hasta, tipo, qAplicado]);
  const pagination = useCursorPagination(JSON.stringify(filters)); const { cursor, requestRevision, shouldIncludeTotal, setMetadata } = pagination;
  const [items, setItems] = useState<SeguimientoItem[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0); const controller = useRef<AbortController | null>(null);
  const load = useCallback(async () => { void requestRevision; controller.current?.abort(); const current = new AbortController(); controller.current = current; const id = ++requestRef.current; setLoading(true); setError(null); try { const res = await getSeguimiento({ ...filters, limit: PAGE_LIMIT, cursor, include_total: shouldIncludeTotal() }, current.signal); if (id !== requestRef.current) return; setItems(res.items); setMetadata(res.paginacion); } catch (err) { if (!current.signal.aborted && id === requestRef.current) setError(err instanceof Error ? err.message : 'No se pudo cargar seguimiento.'); } finally { if (id === requestRef.current) setLoading(false); } }, [filters, cursor, requestRevision, shouldIncludeTotal, setMetadata]);
  useEffect(() => { void load(); }, [load]);
  const [summary, setSummary] = useState({ deducciones_pendientes: 0, inasistencias: 0, cancelaciones: 0, pendientes_cierre: 0 });
  useEffect(() => { const abort = new AbortController(); void getSeguimientoResumen({ local_id: filters.local_id, fecha_desde: filters.fecha_desde, fecha_hasta: filters.fecha_hasta }, abort.signal).then(setSummary).catch(() => undefined); return () => abort.abort(); }, [filters.local_id, filters.fecha_desde, filters.fecha_hasta]);
  const [form, setForm] = useState<ModalData | null>(null); const [detail, setDetail] = useState<Required<ModalData> | null>(null); const [reserva, setReserva] = useState<ReservaBD | null>(null); const [reservaCancelacion, setReservaCancelacion] = useState<ReservaBD | null>(null);

  useEffect(() => {
    const params = new URLSearchParams({ vista: 'seguimiento' });
    if (localId) params.set('local_id', localId); if (desde) params.set('fecha_desde', desde); if (hasta) params.set('fecha_hasta', hasta);
    if (tipo) params.set('tipo', tipo); if (qAplicado) params.set('q', qAplicado);
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
  }, [localId, desde, hasta, tipo, qAplicado]);
  const cargarReserva = async (id: number) => { const response = await getReservaByID(id); if (!response.data?.reserva) throw new Error('No se encontró la reserva vinculada.'); return response.data.reserva; };
  const verReserva = async (id: number) => { try { setReserva(await cargarReserva(id)); } catch (err) { toast.error(err instanceof Error ? err.message : 'No se pudo cargar la reserva.'); } };
  const atender = async (row: SeguimientoItem, editar = false) => { try { const r = await cargarReserva(row.reserva_id); const a = editar && row.atencion_id ? await getAtencion(row.atencion_id) : undefined; setForm({ reserva: r, atencion: a }); } catch (err) { toast.error(err instanceof Error ? err.message : 'No se pudo cargar el registro.'); } };
  const verAtencion = async (row: SeguimientoItem) => { if (!row.atencion_id) return; try { const [a, r] = await Promise.all([getAtencion(row.atencion_id), cargarReserva(row.reserva_id)]); setDetail({ atencion: a, reserva: r }); } catch (err) { toast.error(err instanceof Error ? err.message : 'No se pudo cargar la atención.'); } };
  const solicitarCancelacion = async (row: SeguimientoItem) => { if (row.atencion_id) return; try { setReservaCancelacion(await cargarReserva(row.reserva_id)); } catch (err) { toast.error(err instanceof Error ? err.message : 'No se pudo cargar la reserva.'); } };
  const setTipoFiltro = (next: TipoSeguimiento) => setTipo((current) => current === next ? '' : next);
  return <>
    <div className={styles.filters}><FilterBar>
      <FilterBar.Item label="Desde"><input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} /></FilterBar.Item><FilterBar.Item label="Hasta"><input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} /></FilterBar.Item>
      {scope ? <FilterBar.Item label="Local"><input disabled value={scope.nombre_local ?? 'Local asignado'} /></FilterBar.Item> : <FilterBar.Item label="Local"><LocalSelect value={localId} onChange={setLocalId} emptyLabel="Todos los locales" /></FilterBar.Item>}
      <FilterBar.Item label="Tipo"><CustomSelect value={tipo} onChange={(value) => setTipo(value as TipoSeguimiento)} options={(Object.keys(META) as TipoSeguimiento[]).map((value) => ({ value, label: META[value].label }))} placeholder="Todos" allowClear searchable={false} /></FilterBar.Item>
      <FilterBar.Item label="Buscar" grow><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cliente, reserva, servicio o personal" /></FilterBar.Item>
    </FilterBar></div>
    <StatGrid><StatCard value={summary.pendientes_cierre} label="Pendientes de cierre" accentColor="#FFE600" onClick={() => setTipoFiltro('PENDIENTE_CIERRE')} active={tipo === 'PENDIENTE_CIERRE'} /><StatCard value={summary.deducciones_pendientes} label="Problemas con stock" accentColor="#F59E0B" onClick={() => setTipoFiltro('DEDUCCION_PENDIENTE')} active={tipo === 'DEDUCCION_PENDIENTE'} /><StatCard value={summary.inasistencias} label="Inasistencias" accentColor="#EF4444" onClick={() => setTipoFiltro('INASISTENCIA')} active={tipo === 'INASISTENCIA'} /><StatCard value={summary.cancelaciones} label="Cancelaciones" accentColor="#EF4444" onClick={() => setTipoFiltro('CANCELACION')} active={tipo === 'CANCELACION'} /></StatGrid>
    {error && <AlertBanner tone="danger" title="No se pudo cargar seguimiento">{error}</AlertBanner>}
    <AdminPanel className={styles.listPanel}><div className={styles.list}>{loading && <p className={styles.state}>Cargando seguimiento…</p>}{!loading && items.length === 0 && <p className={styles.state}>No hay casos pendientes para los filtros seleccionados.</p>}{items.map((row) => <article className={`${styles.row} ${styles.seguimientoRow}`} key={`${row.tipo}-${row.atencion_id ?? row.reserva_id}`}><div className={`${styles.time} ${styles.seguimientoTime}`}><strong>{fechaCorta(row.fecha)}</strong><span>{row.hora_inicio?.slice(0, 5) ?? 'Sin hora'} – {row.hora_fin?.slice(0, 5) ?? '—'}</span></div><div className={styles.main}><span className={styles.cliente}>{row.cliente || 'Sin cliente'}</span><p className={styles.servicio}>{row.servicio || 'Sin servicio'}</p><div className={styles.meta}><span>{row.local_nombre || 'Sin local'}</span>{row.empleado_nombre && <span>{row.empleado_nombre}</span>}{row.motivo && <span>{row.motivo}</span>}{row.detalle_insumos_pendientes && <span className={styles.pending}><AlertTriangle size={13} />{row.detalle_insumos_pendientes}</span>}</div></div><div className={styles.side}><StatusBadge tone={META[row.tipo].tone}>{META[row.tipo].label}</StatusBadge><div className={styles.actions}>{row.puede_atender && <AdminButton size="sm" onClick={() => void atender(row)}><Play size={14} />Atender</AdminButton>}{row.puede_atender && !row.atencion_id && <AdminButton size="sm" variant="danger" onClick={() => void solicitarCancelacion(row)}><XCircle size={14} />Cancelar reserva</AdminButton>}{row.atencion_id && <AdminButton size="sm" variant="secondary" onClick={() => void verAtencion(row)}><Eye size={14} />Ver atención</AdminButton>}{row.puede_editar_atencion && <AdminButton size="sm" variant="secondary" onClick={() => void atender(row, true)}><Pencil size={14} />Editar</AdminButton>}<AdminButton size="sm" variant="secondary" onClick={() => void verReserva(row.reserva_id)}><Eye size={14} />Ver reserva</AdminButton></div></div></article>)}</div></AdminPanel>
    <CursorPagination page={pagination.page} totalPages={pagination.totalPages} hasNext={pagination.hasNext} loading={loading} onPrevious={pagination.previous} onNext={pagination.next} />
    <ReservaDetailModal reserva={reserva} onClose={() => setReserva(null)} onEdit={() => undefined} onDelete={() => undefined} readOnly /><AtencionDetalleModal reserva={detail?.reserva ?? null} atencion={detail?.atencion ?? null} onClose={() => setDetail(null)} /><AtencionFormModal reserva={form?.reserva ?? null} atencion={form?.atencion} onClose={() => setForm(null)} onSaved={() => { setForm(null); void load(); }} /><CancelarReservaModal reserva={reservaCancelacion} onClose={() => setReservaCancelacion(null)} onCancelled={() => { void load(); void getSeguimientoResumen({ local_id: filters.local_id, fecha_desde: filters.fecha_desde, fecha_hasta: filters.fecha_hasta }).then(setSummary).catch(() => undefined); }} />
  </>;
}
