'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Bell,
  CalendarClock,
  Check,
  Clock3,
  MapPin,
  PackageMinus,
  Phone,
  RefreshCw,
  Square,
  SquareCheckBig,
  TriangleAlert,
  UserRound,
  X,
} from 'lucide-react';
import {
  getReservasNotificaciones,
  marcarReservaNotificacionLeida,
  marcarReservasNotificacionesLeidas,
  type ReservaNotificacion,
} from '@/lib/api/notificaciones';
import { getAlertasInventario } from '@/lib/api/inventario';
import { getStoredAdminRole } from '@/lib/auth/adminSession';
import { formatQty } from '@/lib/utils/format';
import type { AlertasInventario } from '@/types/inventario';
import styles from './NotificationBell.module.css';

const ROLE_LABELS: Record<string, string> = {
  admin_sys: 'Admin sistema',
  admin: 'Administrador',
  gerencia: 'Recepción',
};

const FOREGROUND_POLL_MS = 5 * 60 * 1000;
const BACKGROUND_POLL_MS = 30 * 60 * 1000;

function hasAdminToken() {
  if (typeof window === 'undefined') return false;
  return Boolean(window.localStorage.getItem('adminToken'));
}

function getMockedUserName() {
  if (typeof window === 'undefined') return 'Admin';

  try {
    const stored = window.localStorage.getItem('adminUser');
    if (!stored) return 'Admin';
    const parsed = JSON.parse(stored) as { username?: string };
    return parsed.username || 'Admin';
  } catch {
    return 'Admin';
  }
}

function formatDate(value: string) {
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function getService(reserva: ReservaNotificacion) {
  return reserva.servicio_confirmado || reserva.servicio || reserva.servicio_solicitado || 'Servicio por confirmar';
}

/** Enlace a Inventario ya filtrado por ítem (y local) para llegar directo al stock. */
function inventarioHref(params: { tab?: 'items' | 'compras'; q?: string; localId?: number }) {
  const sp = new URLSearchParams();
  sp.set('tab', params.tab ?? 'items');
  if (params.q) sp.set('q', params.q);
  if (params.localId) sp.set('local_id', String(params.localId));
  return `/atrevida-gestion/inventario?${sp.toString()}`;
}

function getCreatedTime(value?: string) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function sortByNewestCreated(reservas: ReservaNotificacion[]) {
  return [...reservas].sort((a, b) => getCreatedTime(b.creado_en) - getCreatedTime(a.creado_en));
}

function formatCreatedAt(value?: string) {
  if (!value) return null;

  const createdAt = new Date(value);
  if (Number.isNaN(createdAt.getTime())) return null;

  const diffMs = Date.now() - createdAt.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60_000));

  if (diffMinutes < 1) return 'Ahora';
  if (diffMinutes < 60) return `Hace ${diffMinutes} min`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `Hace ${diffHours} h`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays} dias`;

  return createdAt.toLocaleDateString('es-BO', { day: '2-digit', month: 'short' });
}

type Tab = 'reservas' | 'stock';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('reservas');
  const [alertas, setAlertas] = useState<AlertasInventario | null>(null);
  const [reservas, setReservas] = useState<ReservaNotificacion[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [markingId, setMarkingId] = useState<number | null>(null);
  const [markingSelected, setMarkingSelected] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userName, setUserName] = useState('Admin');
  const [role, setRole] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const requestInFlightRef = useRef<Promise<void> | null>(null);

  const fetchNotifications = useCallback(({ silent = false } = {}) => {
    if (requestInFlightRef.current) return requestInFlightRef.current;

    const request = (async () => {
      if (!hasAdminToken()) {
        setIsAuthenticated(false);
        setReservas([]);
        setTotal(0);
        return;
      }

      setIsAuthenticated(true);
      if (!silent) setLoading(true);
      setError(null);

      try {
        // Las alertas de stock no deben tumbar las notificaciones de reservas (ni al revés).
        const [response, alertasResult] = await Promise.all([
          getReservasNotificaciones(20),
          getAlertasInventario().catch(() => null),
        ]);
        setAlertas(alertasResult);
        const data = response.data ?? { total: 0, reservas: [] };
        const nextReservas = sortByNewestCreated(data.reservas ?? []);
        setReservas(nextReservas);
        setTotal(data.total ?? data.reservas?.length ?? 0);
        setSelectedIds((current) => {
          const visibleIds = new Set(nextReservas.map((reserva) => reserva.id));
          return new Set([...current].filter((id) => visibleIds.has(id)));
        });
        setLastFetch(new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudieron cargar las notificaciones');
      } finally {
        if (!silent) setLoading(false);
      }
    })();

    requestInFlightRef.current = request;
    void request.finally(() => {
      if (requestInFlightRef.current === request) requestInFlightRef.current = null;
    });
    return request;
  }, []);

  useEffect(() => {
    setIsAuthenticated(hasAdminToken());
    setUserName(getMockedUserName());
    setRole(getStoredAdminRole());
    void fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!isAuthenticated) return;

    let timer: number | undefined;
    const schedule = () => {
      if (timer) window.clearTimeout(timer);
      const interval = document.visibilityState === 'hidden' ? BACKGROUND_POLL_MS : FOREGROUND_POLL_MS;
      timer = window.setTimeout(async () => {
        await fetchNotifications({ silent: true });
        schedule();
      }, interval);
    };

    const handleVisibilityChange = () => {
      schedule();
    };

    schedule();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (timer) window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchNotifications, isAuthenticated]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || bellRef.current?.contains(target)) return;
      setOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [open]);

  const handleMarkAsRead = async (id: number) => {
    setMarkingId(id);
    setError(null);

    try {
      await marcarReservaNotificacionLeida(id);
      setReservas((current) => current.filter((reserva) => reserva.id !== id));
      setTotal((current) => Math.max(0, current - 1));
      setSelectedIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo marcar como leída');
    } finally {
      setMarkingId(null);
    }
  };

  const toggleSelected = (id: number) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAllVisible = () => {
    setSelectedIds((current) => {
      const allVisibleSelected = reservas.length > 0 && reservas.every((reserva) => current.has(reserva.id));
      if (allVisibleSelected) return new Set();
      return new Set(reservas.map((reserva) => reserva.id));
    });
  };

  const handleMarkSelectedAsRead = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;

    setMarkingSelected(true);
    setError(null);

    try {
      await marcarReservasNotificacionesLeidas(ids);
      const removedIds = new Set(ids);
      const removedCount = reservas.filter((reserva) => removedIds.has(reserva.id)).length;
      setReservas((current) => current.filter((reserva) => !removedIds.has(reserva.id)));
      setTotal((current) => Math.max(0, current - removedCount));
      setSelectedIds(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron marcar las seleccionadas como vistas');
    } finally {
      setMarkingSelected(false);
    }
  };

  const initials = useMemo(() => userName.slice(0, 2).toUpperCase(), [userName]);
  const selectedCount = selectedIds.size;
  const allVisibleSelected = reservas.length > 0 && reservas.every((reserva) => selectedIds.has(reserva.id));
  const reposicion = alertas?.reposicion ?? [];
  // La reposición ya resume las reservas afectadas; solo se cuentan aparte si no hay reposición.
  const stockCount =
    reposicion.length + (alertas?.items_bajo_stock.length ?? 0) + (reposicion.length === 0 ? (alertas?.reservas_con_alerta.length ?? 0) : 0);
  const badgeTotal = total + stockCount;
  const displayTotal = badgeTotal > 99 ? '99+' : String(badgeTotal);
  const panelMeta =
    tab === 'reservas'
      ? total === 1 ? '1 reserva agendada pendiente' : `${total} reservas agendadas pendientes`
      : stockCount === 0 ? 'Sin alertas de stock' : stockCount === 1 ? '1 alerta de stock' : `${stockCount} alertas de stock`;

  return (
    <div className={styles.actions}>
      <div className={styles.bellWrap}>
        <button
          ref={bellRef}
          type="button"
          className={`${styles.iconButton} ${open ? styles.iconButtonActive : ''}`}
          onClick={() => setOpen((value) => !value)}
          aria-label="Abrir notificaciones"
          aria-expanded={open}
        >
          <Bell size={19} strokeWidth={1.8} />
          {badgeTotal > 0 && <span className={styles.badge}>{displayTotal}</span>}
        </button>

        {open && (
          <div ref={panelRef} className={styles.panel} role="dialog" aria-label="Notificaciones de reservas">
            <div className={styles.panelHeader}>
              <div>
                <h2 className={styles.panelTitle}>Notificaciones</h2>
                <span className={styles.panelMeta}>{panelMeta}</span>
              </div>
              <div className={styles.headerTools}>
                {tab === 'reservas' && (
                  <button
                    type="button"
                    className={styles.markAllButton}
                    onClick={handleMarkSelectedAsRead}
                    disabled={loading || markingSelected || selectedCount === 0}
                  >
                    <Check size={14} strokeWidth={2} />
                    {markingSelected ? 'Marcando...' : selectedCount > 0 ? `Marcar ${selectedCount}` : 'Marcar'}
                  </button>
                )}
                <button
                  type="button"
                  className={styles.refreshButton}
                  onClick={() => fetchNotifications()}
                  disabled={loading || !isAuthenticated}
                  aria-label="Recargar notificaciones"
                >
                  <RefreshCw size={17} strokeWidth={1.8} className={loading ? styles.spinning : ''} />
                </button>
                <button
                  type="button"
                  className={styles.refreshButton}
                  onClick={() => setOpen(false)}
                  aria-label="Cerrar notificaciones"
                >
                  <X size={17} strokeWidth={1.8} />
                </button>
              </div>
            </div>

            <div className={styles.tabs} role="tablist" aria-label="Tipo de notificación">
              <button type="button" role="tab" aria-selected={tab === 'reservas'} className={`${styles.tab} ${tab === 'reservas' ? styles.tabActive : ''}`} onClick={() => setTab('reservas')}>
                <CalendarClock size={15} strokeWidth={1.9} />
                Reservas
                {total > 0 && <span className={styles.tabCount}>{total}</span>}
              </button>
              <button type="button" role="tab" aria-selected={tab === 'stock'} className={`${styles.tab} ${tab === 'stock' ? styles.tabActive : ''}`} onClick={() => setTab('stock')}>
                <TriangleAlert size={15} strokeWidth={1.9} />
                Stock
                {stockCount > 0 && <span className={`${styles.tabCount} ${styles.tabCountWarn}`}>{stockCount}</span>}
              </button>
            </div>

            <div className={styles.content}>
              {error && <p className={styles.notice}>{error}</p>}

              {tab === 'stock' ? (
                loading ? (
                  <div className={styles.skeletonList} aria-label="Cargando alertas">
                    <span className={styles.skeletonItem} />
                    <span className={styles.skeletonItem} />
                  </div>
                ) : alertas === null ? (
                  <p className={styles.notice}>No se pudieron cargar las alertas de stock.</p>
                ) : stockCount === 0 ? (
                  <div className={styles.empty}>
                    <span className={styles.emptyIcon}>
                      <Check size={21} strokeWidth={1.7} />
                    </span>
                    <strong>Todo el stock en orden</strong>
                    <span>No hay ítems bajo su mínimo ni reservas con insumos faltantes.</span>
                  </div>
                ) : (
                  <div className={styles.list}>
                    {reposicion.length > 0 && (
                      <>
                        <h3 className={styles.groupTitle}>Hay que reponer</h3>
                        {reposicion.map((r) => (
                          <article key={`rp-${r.item_id}-${r.local_id}`} className={`${styles.card} ${styles.cardIconRow}`}>
                            <span className={`${styles.cardIcon} ${styles.iconDanger}`}>
                              <PackageMinus size={18} strokeWidth={1.8} />
                            </span>
                            <div className={styles.cardBody}>
                              <div className={styles.cardTop}>
                                <span className={styles.client}>{r.item_nombre}</span>
                                <span className={`${styles.stockTag} ${styles.stockTagOut}`}>Faltan {formatQty(r.faltante, r.unidad)}</span>
                              </div>
                              <div className={styles.chips}>
                                <span className={styles.chip}><MapPin size={12} strokeWidth={1.9} />{r.local_nombre}</span>
                                <span className={styles.chip}>{r.reservas} {r.reservas === 1 ? 'reserva agendada' : 'reservas agendadas'} desde {formatDate(r.proxima)}</span>
                              </div>
                              <ul className={styles.shortList}>
                                <li className={styles.shortRow}>
                                  <span className={styles.shortName}>Necesitan</span>
                                  <span className={styles.shortNums}><strong>{formatQty(r.comprometido, r.unidad)}</strong></span>
                                </li>
                                <li className={styles.shortRow}>
                                  <span className={styles.shortName}>Hay en stock</span>
                                  <span className={styles.shortNums}><strong className={r.stock <= 0 ? styles.neg : undefined}>{formatQty(r.stock, r.unidad)}</strong></span>
                                </li>
                              </ul>
                              <div className={styles.actionRow}>
                                <Link href={inventarioHref({ tab: 'compras' })} className={styles.linkButton} onClick={() => setOpen(false)}>
                                  Registrar compra
                                </Link>
                                <Link href={inventarioHref({ q: r.item_nombre, localId: r.local_id })} className={styles.linkButtonGhost} onClick={() => setOpen(false)}>
                                  Ver stock
                                </Link>
                              </div>
                            </div>
                          </article>
                        ))}
                      </>
                    )}
                    {alertas.reservas_con_alerta.length > 0 && (
                      <>
                        <h3 className={styles.groupTitle}>Reservas sin insumos suficientes</h3>
                        {alertas.reservas_con_alerta.map((r) => (
                          <article key={`r-${r.reserva_id}`} className={`${styles.card} ${styles.cardIconRow}`}>
                            <span className={`${styles.cardIcon} ${styles.iconWarn}`}>
                              <TriangleAlert size={18} strokeWidth={1.8} />
                            </span>
                            <div className={styles.cardBody}>
                              <div className={styles.cardTop}>
                                <span className={styles.client}>{r.cliente}</span>
                                <span className={styles.createdAt}>{formatDate(r.fecha)} · {r.hora_desde}</span>
                              </div>
                              <span className={styles.service}>{r.servicio}</span>
                              <div className={styles.chips}>
                                <span className={styles.chip}><MapPin size={12} strokeWidth={1.9} />{r.local}</span>
                              </div>
                              <ul className={styles.shortList}>
                                {r.advertencias.map((a) => (
                                  <li key={a.item_id} className={styles.shortRow}>
                                    <Link href={inventarioHref({ q: a.item_nombre })} className={styles.shortName} onClick={() => setOpen(false)}>
                                      {a.item_nombre}
                                    </Link>
                                    <span className={styles.shortNums}>
                                      necesita <strong>{formatQty(a.requerido, a.unidad)}</strong>
                                      <span className={styles.sep}>·</span>
                                      hay <strong className={a.disponible <= 0 ? styles.neg : undefined}>{formatQty(a.disponible, a.unidad)}</strong>
                                    </span>
                                  </li>
                                ))}
                              </ul>
                              <div className={styles.actionRow}>
                                <Link href={inventarioHref({ q: r.advertencias[0]?.item_nombre })} className={styles.linkButton} onClick={() => setOpen(false)}>
                                  <PackageMinus size={14} strokeWidth={2} />
                                  Ver stock
                                </Link>
                                <Link href={`/atrevida-gestion/reservas/editar/${r.reserva_id}`} className={styles.linkButtonGhost} onClick={() => setOpen(false)}>
                                  Ver reserva
                                </Link>
                              </div>
                            </div>
                          </article>
                        ))}
                      </>
                    )}
                    {alertas.items_bajo_stock.length > 0 && (
                      <>
                        <h3 className={styles.groupTitle}>Ítems bajo su mínimo</h3>
                        {alertas.items_bajo_stock.map((i) => (
                          <article key={`i-${i.id}-${i.local_id ?? 0}`} className={`${styles.card} ${styles.cardIconRow}`}>
                            <span className={`${styles.cardIcon} ${i.stock_actual <= 0 ? styles.iconDanger : styles.iconWarn}`}>
                              <PackageMinus size={18} strokeWidth={1.8} />
                            </span>
                            <div className={styles.cardBody}>
                              <div className={styles.cardTop}>
                                <span className={styles.client}>{i.nombre}</span>
                                <span className={`${styles.stockTag} ${i.stock_actual <= 0 ? styles.stockTagOut : ''}`}>
                                  {i.stock_actual <= 0 ? 'Agotado' : 'Bajo mínimo'}
                                </span>
                              </div>
                              <div className={styles.chips}>
                                {i.local_nombre && <span className={styles.chip}><MapPin size={12} strokeWidth={1.9} />{i.local_nombre}</span>}
                              </div>
                              <div className={styles.stockRow}>
                                <span className={styles.stockBar} aria-hidden="true">
                                  <span
                                    className={`${styles.stockFill} ${i.stock_actual <= 0 ? styles.stockFillOut : ''}`}
                                    style={{ width: `${i.stock_minimo > 0 ? Math.min(100, Math.max(4, (i.stock_actual / i.stock_minimo) * 100)) : 4}%` }}
                                  />
                                </span>
                                <span className={styles.stockText}>
                                  <strong className={i.stock_actual <= 0 ? styles.neg : undefined}>{formatQty(i.stock_actual, i.unidad_medida)}</strong>
                                  {' '}de {formatQty(i.stock_minimo, i.unidad_medida)} mín.
                                </span>
                              </div>
                              <div className={styles.actionRow}>
                                <Link href={inventarioHref({ q: i.nombre, localId: i.local_id })} className={styles.linkButton} onClick={() => setOpen(false)}>
                                  <PackageMinus size={14} strokeWidth={2} />
                                  Ver stock
                                </Link>
                                <Link href={inventarioHref({ tab: 'compras' })} className={styles.linkButtonGhost} onClick={() => setOpen(false)}>
                                  Registrar compra
                                </Link>
                              </div>
                            </div>
                          </article>
                        ))}
                      </>
                    )}
                  </div>
                )
              ) : null}

              {tab !== 'reservas' ? null : loading ? (
                <div className={styles.skeletonList} aria-label="Cargando notificaciones">
                  <span className={styles.skeletonItem} />
                  <span className={styles.skeletonItem} />
                  <span className={styles.skeletonItem} />
                </div>
              ) : reservas.length === 0 ? (
                <div className={styles.empty}>
                  <span className={styles.emptyIcon}>
                    <Bell size={21} strokeWidth={1.7} />
                  </span>
                  <strong>No hay reservas pendientes</strong>
                  <span>Cuando una reserva agendada requiera atención, aparecerá en esta lista.</span>
                </div>
              ) : (
                <div className={styles.list}>
                  <div className={styles.selectionBar}>
                    <button
                      type="button"
                      className={styles.selectionButton}
                      onClick={toggleAllVisible}
                      disabled={markingSelected}
                    >
                      {allVisibleSelected ? (
                        <SquareCheckBig size={15} strokeWidth={1.8} />
                      ) : (
                        <Square size={15} strokeWidth={1.8} />
                      )}
                      {allVisibleSelected ? 'Limpiar selección' : 'Seleccionar visibles'}
                    </button>
                    <span>{selectedCount} seleccionadas</span>
                  </div>
                  {reservas.map((reserva) => {
                    const createdLabel = formatCreatedAt(reserva.creado_en);

                    return (
                      <article
                        key={reserva.id}
                        className={`${styles.card} ${selectedIds.has(reserva.id) ? styles.itemSelected : ''}`}
                      >
                        <button
                          type="button"
                          className={styles.selectButton}
                          onClick={() => toggleSelected(reserva.id)}
                          disabled={markingSelected}
                          aria-label={selectedIds.has(reserva.id) ? 'Quitar selección' : 'Seleccionar notificación'}
                        >
                          {selectedIds.has(reserva.id) ? (
                            <SquareCheckBig size={17} strokeWidth={1.9} />
                          ) : (
                            <Square size={17} strokeWidth={1.9} />
                          )}
                        </button>
                        <div className={styles.cardBody}>
                          <div className={styles.cardTop}>
                            <span className={styles.client}>{reserva.cliente}</span>
                            {createdLabel && (
                              <span className={styles.createdAt}>
                                <span className={styles.dot} aria-hidden="true" />
                                {createdLabel}
                              </span>
                            )}
                          </div>
                          <span className={styles.service}>{getService(reserva)}</span>
                          <div className={styles.chips}>
                            <span className={styles.chip}>
                              <MapPin size={12} strokeWidth={1.9} />
                              {reserva.local}
                            </span>
                            <span className={styles.chip}>
                              <Clock3 size={12} strokeWidth={1.9} />
                              {formatDate(reserva.fecha)} · {reserva.hora_desde} - {reserva.hora_hasta}
                            </span>
                            <span className={styles.chip}>
                              <Phone size={12} strokeWidth={1.9} />
                              {reserva.numero_telefono || 'Sin teléfono'}
                            </span>
                          </div>
                          <button
                            type="button"
                            className={styles.markButton}
                            onClick={() => handleMarkAsRead(reserva.id)}
                            disabled={markingId === reserva.id || markingSelected}
                          >
                            <Check size={14} strokeWidth={2} />
                            {markingId === reserva.id ? 'Marcando...' : 'Marcar como leída'}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>

            <div className={styles.panelFooter}>
              <span>{isAuthenticated ? 'Se actualiza cada 5 min' : 'Sesión no iniciada'}</span>
              {lastFetch && <span>Actualizado {lastFetch}</span>}
            </div>
          </div>
        )}
      </div>

      {role === 'admin_sys' ? (
        <Link href="/atrevida-gestion/configuracion/usuarios" className={styles.userButton} aria-label="Gestionar usuarios">
        <span className={styles.avatar}>{initials}</span>
        <span className={styles.userCopy}>
          <span className={styles.userName}>{userName}</span>
          <span className={styles.userRole}>{role ? (ROLE_LABELS[role] ?? role) : 'Usuario'}</span>
        </span>
        <UserRound size={16} strokeWidth={1.7} />
        </Link>
      ) : (
        <div className={`${styles.userButton} ${styles.userStatic}`} aria-label="Usuario actual">
        <span className={styles.avatar}>{initials}</span>
        <span className={styles.userCopy}>
          <span className={styles.userName}>{userName}</span>
          <span className={styles.userRole}>{role ? (ROLE_LABELS[role] ?? role) : 'Usuario'}</span>
        </span>
        <UserRound size={16} strokeWidth={1.7} />
        </div>
      )}
    </div>
  );
}
