'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Bell,
  CalendarClock,
  Check,
  Clock3,
  MapPin,
  Phone,
  RefreshCw,
  Square,
  SquareCheckBig,
  UserRound,
  X,
} from 'lucide-react';
import {
  getReservasNotificaciones,
  marcarReservaNotificacionLeida,
  marcarReservasNotificacionesLeidas,
  type ReservaNotificacion,
} from '@/lib/api/notificaciones';
import styles from './NotificationBell.module.css';

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

export function NotificationBell() {
  const [open, setOpen] = useState(false);
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
        const response = await getReservasNotificaciones(20);
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
  const displayTotal = total > 99 ? '99+' : String(total);

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
          {total > 0 && <span className={styles.badge}>{displayTotal}</span>}
        </button>

        {open && (
          <div ref={panelRef} className={styles.panel} role="dialog" aria-label="Notificaciones de reservas">
            <div className={styles.panelHeader}>
              <div>
                <h2 className={styles.panelTitle}>Notificaciones</h2>
                <span className={styles.panelMeta}>
                  {total === 1 ? '1 reserva agendada pendiente' : `${total} reservas agendadas pendientes`}
                </span>
              </div>
              <div className={styles.headerTools}>
                <button
                  type="button"
                  className={styles.markAllButton}
                  onClick={handleMarkSelectedAsRead}
                  disabled={loading || markingSelected || selectedCount === 0}
                >
                  <Check size={14} strokeWidth={2} />
                  {markingSelected ? 'Marcando...' : selectedCount > 0 ? `Marcar ${selectedCount}` : 'Marcar'}
                </button>
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

            <div className={styles.content}>
              {error && <p className={styles.notice}>{error}</p>}

              {loading ? (
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
                        className={`${styles.item} ${selectedIds.has(reserva.id) ? styles.itemSelected : ''}`}
                      >
                        <button
                          type="button"
                          className={styles.selectButton}
                          onClick={() => toggleSelected(reserva.id)}
                          disabled={markingSelected}
                          aria-label={selectedIds.has(reserva.id) ? 'Quitar selección' : 'Seleccionar notificación'}
                        >
                          {selectedIds.has(reserva.id) ? (
                            <SquareCheckBig size={18} strokeWidth={1.9} />
                          ) : (
                            <Square size={18} strokeWidth={1.9} />
                          )}
                        </button>
                        <span className={styles.itemIcon}>
                          <CalendarClock size={18} strokeWidth={1.8} />
                        </span>
                        <div className={styles.itemBody}>
                          <div className={styles.itemTop}>
                            <div className={styles.itemTitle}>
                              <span className={styles.client}>{reserva.cliente}</span>
                              <span className={styles.service}>{getService(reserva)}</span>
                              {createdLabel && <span className={styles.createdAt}>{createdLabel}</span>}
                            </div>
                            <span className={styles.dot} aria-hidden="true" />
                          </div>
                          <div className={styles.itemMeta}>
                            <span className={styles.metaLine}>
                              <MapPin size={14} strokeWidth={1.8} />
                              <span>{reserva.local}</span>
                            </span>
                            <span className={styles.metaLine}>
                              <Clock3 size={14} strokeWidth={1.8} />
                              <span>{formatDate(reserva.fecha)} · {reserva.hora_desde} - {reserva.hora_hasta}</span>
                            </span>
                            <span className={styles.metaLine}>
                              <Phone size={14} strokeWidth={1.8} />
                              <span>{reserva.numero_telefono || 'Sin teléfono registrado'}</span>
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
              <span>{isAuthenticated ? 'Polling activo cada 5 min' : 'Sesión no iniciada'}</span>
              {lastFetch && <span>Actualizado {lastFetch}</span>}
            </div>
          </div>
        )}
      </div>

      <Link href="/atrevida-gestion/configuracion/usuarios" className={styles.userButton} aria-label="Ver usuario">
        <span className={styles.avatar}>{initials}</span>
        <span className={styles.userCopy}>
          <span className={styles.userName}>{userName}</span>
          <span className={styles.userRole}>Administrador</span>
        </span>
        <UserRound size={16} strokeWidth={1.7} />
      </Link>
    </div>
  );
}
