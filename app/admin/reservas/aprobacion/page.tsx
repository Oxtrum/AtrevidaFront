'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import gsap from 'gsap';
import {
  AlertCircle,
  Calendar,
  CalendarCheck,
  Check,
  Clock,
  Filter,
  MapPin,
  Phone,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from 'lucide-react';

import Header from '@/components/AdminHeader/Header';
import { actualizarEstadoReservaDB, getReservasDB } from '@/lib/api/reservas';
import type { EstadoReserva, ReservaBD } from '@/types/reserva';
import styles from './page.module.css';

type EstadoGestion = Extract<EstadoReserva, 'PENDIENTE' | 'AGENDADO' | 'RECHAZADO'>;
type EstadoFiltro = EstadoGestion | 'TODOS';

const ESTADO_OPTIONS: Array<{ value: EstadoFiltro; label: string }> = [
  { value: 'PENDIENTE', label: 'Pendientes' },
  { value: 'AGENDADO', label: 'Agendadas' },
  { value: 'RECHAZADO', label: 'Rechazadas' },
  { value: 'TODOS', label: 'Todas' },
];

const normalizeEstado = (estado?: EstadoReserva | string): EstadoGestion => {
  if (estado === 'AGENDADO' || estado === 'APROBADO') return 'AGENDADO';
  if (estado === 'RECHAZADO') return 'RECHAZADO';
  return 'PENDIENTE';
};

const formatDate = (fecha: string) => {
  const [year, month, day] = fecha.split('-').map(Number);
  if (!year || !month || !day) return fecha;

  return new Date(year, month - 1, day).toLocaleDateString('es-BO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
};

export default function AdminReservasAprobacionPage() {
  const router = useRouter();
  const pageRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const cardsGridRef = useRef<HTMLDivElement>(null);
  const hasLoadedRef = useRef(false);

  const [reservas, setReservas] = useState<ReservaBD[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectCauses, setRejectCauses] = useState<Record<number, string>>({});
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>('PENDIENTE');

  const fetchReservas = useCallback(async (estado: EstadoFiltro) => {
    const isInitialRequest = !hasLoadedRef.current;
    if (isInitialRequest) {
      setInitialLoading(true);
    } else {
      setIsFetching(true);
    }
    setError(null);

    try {
      const response = await getReservasDB({
        estado: estado === 'TODOS' ? undefined : estado,
      });
      setReservas(response.data?.reservas ?? []);
      setEstadoFiltro(estado);
      hasLoadedRef.current = true;
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'No se pudieron cargar las reservas');
      if (isInitialRequest) setReservas([]);
    } finally {
      setInitialLoading(false);
      setIsFetching(false);
    }
  }, []);

  const reservasVisibles = useMemo(
    () => estadoFiltro === 'TODOS'
      ? reservas
      : reservas.filter((reserva) => normalizeEstado(reserva.estado) === estadoFiltro),
    [estadoFiltro, reservas],
  );

  const reservasPendientes = useMemo(
    () => reservas.filter((reserva) => normalizeEstado(reserva.estado) === 'PENDIENTE'),
    [reservas],
  );

  const reservasAgendadas = useMemo(
    () => reservas.filter((reserva) => normalizeEstado(reserva.estado) === 'AGENDADO'),
    [reservas],
  );

  const reservasRechazadas = useMemo(
    () => reservas.filter((reserva) => normalizeEstado(reserva.estado) === 'RECHAZADO'),
    [reservas],
  );

  const updateReservaEstado = async (reserva: ReservaBD, estado: EstadoGestion) => {
    const causa = rejectCauses[reserva.id]?.trim() ?? '';

    if (estado === 'RECHAZADO' && !causa) {
      setRejectingId(reserva.id);
      setStatusMessage({ type: 'error', text: 'Agrega una causa para rechazar la reserva.' });
      return;
    }

    setActionId(reserva.id);
    setStatusMessage(null);

    try {
      await actualizarEstadoReservaDB({
        id: reserva.id,
        estado,
        causa: estado === 'RECHAZADO' ? causa : '',
      });

      setReservas((current) =>
        current.map((item) => item.id === reserva.id ? { ...item, estado } : item),
      );
      setRejectingId(null);
      setRejectCauses((current) => ({ ...current, [reserva.id]: '' }));
      setStatusMessage({
        type: 'success',
        text: estado === 'AGENDADO' ? 'Reserva agendada correctamente.' : 'Reserva rechazada correctamente.',
      });
      window.setTimeout(() => setStatusMessage(null), 3600);
    } catch (updateError) {
      setStatusMessage({
        type: 'error',
        text: updateError instanceof Error ? updateError.message : 'No se pudo actualizar el estado.',
      });
    } finally {
      setActionId(null);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/admin/login');
      return;
    }

    void fetchReservas('PENDIENTE');
  }, [fetchReservas, router]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      tl.fromTo(headerRef.current, { y: -24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.58 })
        .fromTo(boardRef.current, { y: 26, opacity: 0, scale: 0.985 }, { y: 0, opacity: 1, scale: 1, duration: 0.56 }, '-=0.24');
    }, pageRef);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (initialLoading || !cardsGridRef.current) return;

    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray<HTMLElement>('.approval-card', cardsGridRef.current);
      if (cards.length > 0) {
        gsap.fromTo(
          cards,
          { y: 8, opacity: 0.72 },
          { y: 0, opacity: 1, duration: 0.18, stagger: 0.025, ease: 'power2.out', clearProps: 'transform,opacity' },
        );
      }
    }, cardsGridRef);

    return () => ctx.revert();
  }, [estadoFiltro, initialLoading, reservasVisibles.length]);

  return (
    <div ref={pageRef} className={styles.pageContainer}>
      <Header />

      <main className={styles.main}>
        <div className={styles.bgMesh} />

        <div className={styles.container}>
          <div ref={headerRef} className={styles.pageHeader}>
            <div>
              <span className={styles.kicker}>
                <ShieldCheck size={15} strokeWidth={1.8} />
                Gestión de reservas
              </span>
              <h1 className={styles.title}>Aprobación de reservas</h1>
              <p className={styles.subtitle}>
                Administra las solicitudes que llegan desde la web. Agenda una cita cuando esté validada o recházala con una causa para mantener trazabilidad.
              </p>
            </div>

            <button
              type="button"
              className={styles.refreshButton}
              onClick={() => fetchReservas(estadoFiltro)}
              disabled={initialLoading || isFetching}
            >
              <RefreshCw size={16} strokeWidth={1.8} className={isFetching ? styles.spinIcon : ''} />
              {isFetching ? 'Actualizando' : 'Actualizar'}
            </button>
          </div>

          <div ref={boardRef} className={styles.board}>
            <div className={styles.summaryGrid}>
              <div className={styles.summaryCard}>
                <span>{reservasPendientes.length}</span>
                <strong>Pendientes</strong>
                <small>Necesitan revisión</small>
              </div>
              <div className={styles.summaryCard}>
                <span>{reservasAgendadas.length}</span>
                <strong>Agendadas</strong>
                <small>Ya confirmadas</small>
              </div>
              <div className={styles.summaryCard}>
                <span>{reservasRechazadas.length}</span>
                <strong>Rechazadas</strong>
                <small>Con causa registrada</small>
              </div>
            </div>

            <div className={styles.boardHeader}>
              <div>
                <span className={styles.boardLabel}>
                  <Filter size={14} strokeWidth={1.8} />
                  Filtro por estado
                </span>
                <h2>{estadoFiltro === 'TODOS' ? 'Todas las solicitudes' : `Reservas ${ESTADO_OPTIONS.find((option) => option.value === estadoFiltro)?.label.toLowerCase()}`}</h2>
              </div>
              <span className={styles.countPill}>{reservasVisibles.length} resultado{reservasVisibles.length === 1 ? '' : 's'}</span>
            </div>

            <div className={styles.filterBar} aria-label="Filtrar reservas por estado">
              {ESTADO_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`${styles.filterButton} ${estadoFiltro === option.value ? styles.filterButtonActive : ''}`}
                  onClick={() => fetchReservas(option.value)}
                  disabled={initialLoading || isFetching || estadoFiltro === option.value}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {isFetching && !initialLoading && (
              <div className={styles.updatingPill}>
                <RefreshCw size={13} strokeWidth={1.8} className={styles.spinIcon} />
                Actualizando solicitudes...
              </div>
            )}

            {initialLoading && (
              <div className={styles.loadingGrid}>
                <span />
                <span />
                <span />
              </div>
            )}

            {!initialLoading && error && reservasVisibles.length === 0 && (
              <div className={styles.emptyState}>
                <AlertCircle size={30} strokeWidth={1.5} />
                <strong>No se pudieron cargar las reservas</strong>
                <span>{error}</span>
              </div>
            )}

            {!initialLoading && !error && reservasVisibles.length === 0 && (
              <div className={styles.emptyState}>
                <CalendarCheck size={32} strokeWidth={1.5} />
                <strong>No hay reservas para este estado</strong>
                <span>Cambia el filtro o actualiza la bandeja para revisar nuevas solicitudes.</span>
              </div>
            )}

            {!initialLoading && reservasVisibles.length > 0 && (
              <div ref={cardsGridRef} className={styles.pendingGrid}>
                {reservasVisibles.map((reserva) => {
                  const estadoNormalizado = normalizeEstado(reserva.estado);

                  return (
                  <article key={reserva.id} className={`approval-card ${styles.pendingCard}`}>
                    <div className={styles.pendingTop}>
                      <span className={`${styles.pendingState} ${styles[`state${estadoNormalizado}`]}`}>
                        {estadoNormalizado}
                      </span>
                      <span className={styles.pendingId}>#{reserva.id}</span>
                    </div>

                    <h3>{reserva.cliente || 'Cliente sin nombre'}</h3>
                    <p className={styles.pendingService}>{reserva.servicio || 'Servicio por definir'}</p>

                    <div className={styles.pendingMeta}>
                      <span>
                        <Calendar size={14} strokeWidth={1.6} />
                        {formatDate(reserva.fecha)}
                      </span>
                      <span>
                        <Clock size={14} strokeWidth={1.6} />
                        {reserva.hora_desde} - {reserva.hora_hasta}
                      </span>
                      <span>
                        <MapPin size={14} strokeWidth={1.6} />
                        {reserva.local}
                      </span>
                      {reserva.numero_telefono && (
                        <span>
                          <Phone size={14} strokeWidth={1.6} />
                          +591 {reserva.numero_telefono}
                        </span>
                      )}
                    </div>

                    {reserva.notas && (
                      <p className={styles.pendingNotes}>{reserva.notas}</p>
                    )}

                    {estadoNormalizado === 'PENDIENTE' && rejectingId === reserva.id && (
                      <label className={styles.rejectField}>
                        Causa del rechazo
                        <textarea
                          value={rejectCauses[reserva.id] ?? ''}
                          onChange={(event) => setRejectCauses((current) => ({
                            ...current,
                            [reserva.id]: event.target.value,
                          }))}
                          placeholder="Ej: horario no disponible, datos incompletos..."
                        />
                      </label>
                    )}

                    {estadoNormalizado === 'PENDIENTE' && (
                      <div className={styles.pendingActions}>
                        <button
                          type="button"
                          className={styles.approveButton}
                          onClick={() => updateReservaEstado(reserva, 'AGENDADO')}
                          disabled={actionId === reserva.id}
                        >
                          <Check size={15} strokeWidth={1.8} />
                          Agendar
                        </button>
                        <button
                          type="button"
                          className={styles.rejectButton}
                          onClick={() => rejectingId === reserva.id ? updateReservaEstado(reserva, 'RECHAZADO') : setRejectingId(reserva.id)}
                          disabled={actionId === reserva.id}
                        >
                          <XCircle size={15} strokeWidth={1.8} />
                          {rejectingId === reserva.id ? 'Confirmar rechazo' : 'Rechazar'}
                        </button>
                      </div>
                    )}
                  </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {statusMessage && (
        <div
          className={`${styles.toastMessage} ${statusMessage.type === 'success' ? styles.statusSuccess : styles.statusError}`}
          role="status"
          aria-live="polite"
        >
          {statusMessage.type === 'success' ? <Check size={16} strokeWidth={1.8} /> : <AlertCircle size={16} strokeWidth={1.8} />}
          {statusMessage.text}
        </div>
      )}
    </div>
  );
}
