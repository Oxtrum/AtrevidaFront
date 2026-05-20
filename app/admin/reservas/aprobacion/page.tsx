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

  const [reservas, setReservas] = useState<ReservaBD[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectCauses, setRejectCauses] = useState<Record<number, string>>({});
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchReservas = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await getReservasDB({});
      setReservas(response.data?.reservas ?? []);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'No se pudieron cargar las reservas');
      setReservas([]);
    } finally {
      setLoading(false);
    }
  }, []);

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

    void fetchReservas();
  }, [fetchReservas, router]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      tl.fromTo(headerRef.current, { y: -24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.58 })
        .fromTo(boardRef.current, { y: 26, opacity: 0, scale: 0.985 }, { y: 0, opacity: 1, scale: 1, duration: 0.56 }, '-=0.24')
        .fromTo('.approval-card', { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.38, stagger: 0.05 }, '-=0.18');
    }, pageRef);

    return () => ctx.revert();
  }, [loading, reservasPendientes.length]);

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
              onClick={fetchReservas}
              disabled={loading}
            >
              <RefreshCw size={16} strokeWidth={1.8} className={loading ? styles.spinIcon : ''} />
              Actualizar
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
                  Bandeja pendiente
                </span>
                <h2>Solicitudes esperando aprobación</h2>
              </div>
              <span className={styles.countPill}>{reservasPendientes.length} en cola</span>
            </div>

            {statusMessage && (
              <div className={`${styles.statusMessage} ${statusMessage.type === 'success' ? styles.statusSuccess : styles.statusError}`}>
                {statusMessage.type === 'success' ? <Check size={16} strokeWidth={1.8} /> : <AlertCircle size={16} strokeWidth={1.8} />}
                {statusMessage.text}
              </div>
            )}

            {loading && (
              <div className={styles.loadingGrid}>
                <span />
                <span />
                <span />
              </div>
            )}

            {!loading && error && (
              <div className={styles.emptyState}>
                <AlertCircle size={30} strokeWidth={1.5} />
                <strong>No se pudieron cargar las reservas</strong>
                <span>{error}</span>
              </div>
            )}

            {!loading && !error && reservasPendientes.length === 0 && (
              <div className={styles.emptyState}>
                <CalendarCheck size={32} strokeWidth={1.5} />
                <strong>No hay reservas pendientes</strong>
                <span>Cuando un cliente solicite una nueva cita, aparecerá aquí para aprobación.</span>
              </div>
            )}

            {!loading && !error && reservasPendientes.length > 0 && (
              <div className={styles.pendingGrid}>
                {reservasPendientes.map((reserva) => (
                  <article key={reserva.id} className={`approval-card ${styles.pendingCard}`}>
                    <div className={styles.pendingTop}>
                      <span className={styles.pendingState}>Pendiente</span>
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

                    {rejectingId === reserva.id && (
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
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
