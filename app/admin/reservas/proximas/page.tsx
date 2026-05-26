'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import gsap from 'gsap';
import {
  AlertCircle,
  ArrowLeft,
  CalendarCheck,
  Clock,
  MapPin,
  MessageCircle,
  Phone,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';

import Header from '@/components/AdminHeader/Header';
import { getReservasDB } from '@/lib/api/reservas';
import type { ReservaBD, EstadoReserva } from '@/types/reserva';
import styles from './page.module.css';

type RelativeDay = 'HOY' | 'MANANA';

const normalizeEstado = (estado?: EstadoReserva | string) => {
  if (estado === 'AGENDADO' || estado === 'COMPLETADO') return 'AGENDADO';
  if (estado === 'RECHAZADO') return 'RECHAZADO';
  return 'PENDIENTE';
};

const normalizeTimeForDate = (time?: string) => {
  const [hours = '0', minutes = '0'] = (time || '0:00').split(':');
  return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:00`;
};

const getDateISOWithOffset = (daysOffset: number) => {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toLocaleDateString('en-CA');
};

const getReservaDateTimeMs = (reserva: ReservaBD, time: string) => {
  const timestamp = new Date(`${reserva.fecha}T${normalizeTimeForDate(time)}`).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const getReservaStartMs = (reserva: ReservaBD) => getReservaDateTimeMs(reserva, reserva.hora_desde);

const getReservaEndMs = (reserva: ReservaBD) =>
  getReservaDateTimeMs(reserva, reserva.hora_hasta || reserva.hora_desde);

const formatDate = (fecha: string) => {
  const [year, month, day] = fecha.split('-').map(Number);
  if (!year || !month || !day) return fecha;

  return new Date(year, month - 1, day).toLocaleDateString('es-BO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
};

const getClientInitials = (name?: string) => {
  const parts = (name || 'Cliente')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  return parts.map((part) => part[0]?.toUpperCase()).join('') || 'CL';
};

const getReminderWhatsappHref = (reserva: ReservaBD, relativeDay: RelativeDay) => {
  const phoneDigits = reserva.numero_telefono?.replace(/\D/g, '') ?? '';
  if (!phoneDigits) return null;

  const phone = phoneDigits.startsWith('591') ? phoneDigits : `591${phoneDigits}`;
  const dayLabel = relativeDay === 'HOY' ? 'Hoy' : 'Mañana';
  const message = [
    'Hola buenas tardes🌙',
    `${dayLabel} la esperamos para su cita a las ${reserva.hora_desde} 🌹`,
    `📍Sucursal ${reserva.local}`,
  ].join('\n');

  return `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
};

export default function AdminReservasProximasPage() {
  const router = useRouter();
  const pageRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const [reservas, setReservas] = useState<ReservaBD[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const todayISO = useMemo(() => getDateISOWithOffset(0), []);
  const tomorrowISO = useMemo(() => getDateISOWithOffset(1), []);

  const fetchReservas = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await getReservasDB({
        fecha_desde: todayISO,
        fecha_hasta: tomorrowISO,
        estado: 'AGENDADO',
      });
      setReservas(response.data?.reservas ?? []);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'No se pudieron cargar las citas próximas.');
      if (!isRefresh) setReservas([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [todayISO, tomorrowISO]);

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
      tl.fromTo(headerRef.current, { y: -22, opacity: 0 }, { y: 0, opacity: 1, duration: 0.52 })
        .fromTo(boardRef.current, { y: 24, opacity: 0, scale: 0.99 }, { y: 0, opacity: 1, scale: 1, duration: 0.5 }, '-=0.2')
        .fromTo('.reminderCard', { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.32, stagger: 0.045 }, '-=0.16');
    }, pageRef);

    return () => ctx.revert();
  }, [reservas.length]);

  const reservasHoy = useMemo(
    () => reservas
      .filter((reserva) =>
        normalizeEstado(reserva.estado) === 'AGENDADO'
        && reserva.fecha === todayISO
        && getReservaEndMs(reserva) >= Date.now(),
      )
      .sort((a, b) => getReservaStartMs(a) - getReservaStartMs(b)),
    [reservas, todayISO],
  );

  const reservasManana = useMemo(
    () => reservas
      .filter((reserva) => normalizeEstado(reserva.estado) === 'AGENDADO' && reserva.fecha === tomorrowISO)
      .sort((a, b) => getReservaStartMs(a) - getReservaStartMs(b)),
    [reservas, tomorrowISO],
  );

  const total = reservasHoy.length + reservasManana.length;
  const nextReserva = reservasHoy[0] ?? reservasManana[0];

  const renderColumn = (title: string, fecha: string, relativeDay: RelativeDay, items: ReservaBD[]) => (
    <section className={styles.dayColumn} aria-labelledby={`day-${relativeDay}`}>
      <div className={styles.dayHeader}>
        <div>
          <span>{formatDate(fecha)}</span>
          <h2 id={`day-${relativeDay}`}>{title}</h2>
        </div>
        <strong>{items.length}</strong>
      </div>

      {items.length === 0 ? (
        <div className={styles.emptyDay}>
          <CalendarCheck size={30} strokeWidth={1.5} />
          <strong>Sin recordatorios pendientes</strong>
          <span>No hay citas agendadas para este bloque.</span>
        </div>
      ) : (
        <div className={styles.cardList}>
          {items.map((reserva) => {
            const reminderHref = getReminderWhatsappHref(reserva, relativeDay);
            const finalService = reserva.servicio_confirmado || reserva.servicio_solicitado || reserva.servicio || 'Tratamiento confirmado';

            return (
              <article key={`${relativeDay}-${reserva.id}`} className={`${styles.reminderCard} reminderCard`}>
                <div className={styles.timeBlock}>
                  <Clock size={18} strokeWidth={1.8} />
                  <strong>{reserva.hora_desde}</strong>
                  <span>{reserva.hora_hasta}</span>
                </div>

                <div className={styles.cardBody}>
                  <div className={styles.clientRow}>
                    <span className={styles.clientAvatar}>{getClientInitials(reserva.cliente)}</span>
                    <div>
                      <h3>{reserva.cliente || 'Cliente sin nombre'}</h3>
                      <p>{finalService}</p>
                    </div>
                  </div>

                  <div className={styles.metaGrid}>
                    <span>
                      <MapPin size={14} strokeWidth={1.7} />
                      {reserva.local}
                    </span>
                    {reserva.numero_telefono && (
                      <span>
                        <Phone size={14} strokeWidth={1.7} />
                        {reserva.numero_telefono}
                      </span>
                    )}
                  </div>
                </div>

                <div className={styles.cardActions}>
                  {reminderHref ? (
                    <a href={reminderHref} target="_blank" rel="noopener noreferrer" className={styles.whatsappButton}>
                      <MessageCircle size={16} strokeWidth={1.8} />
                      Mandar recordatorio
                    </a>
                  ) : (
                    <button type="button" className={styles.whatsappButton} disabled>
                      <MessageCircle size={16} strokeWidth={1.8} />
                      Sin teléfono
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );

  return (
    <div ref={pageRef} className={styles.pageContainer}>
      <Header />

      <main className={styles.main}>
        <div className={styles.bgMesh} />

        <div className={styles.container}>
          <header ref={headerRef} className={styles.pageHeader}>
            <div>
              <span className={styles.kicker}>
                <ShieldCheck size={15} strokeWidth={1.8} />
                Recordatorios operativos
              </span>
              <h1>Citas próximas</h1>
              <p>
                Una vista limpia para contactar a las clientas de hoy y mañana sin tener que bajar hasta el final de aprobaciones.
              </p>
            </div>

            <div className={styles.headerActions}>
              <Link href="/admin/reservas/aprobacion" className={styles.backButton}>
                <ArrowLeft size={16} strokeWidth={1.8} />
                Aprobaciones
              </Link>
              <button type="button" className={styles.refreshButton} onClick={() => void fetchReservas(true)} disabled={loading || refreshing}>
                <RefreshCw size={16} strokeWidth={1.8} className={refreshing ? styles.spinIcon : ''} />
                {refreshing ? 'Actualizando' : 'Actualizar'}
              </button>
            </div>
          </header>

          <section ref={boardRef} className={styles.board}>
            <div className={styles.summaryStrip}>
              <div>
                <span>Total por recordar</span>
                <strong>{loading ? '—' : total}</strong>
              </div>
              <div>
                <span>Hoy</span>
                <strong>{loading ? '—' : reservasHoy.length}</strong>
              </div>
              <div>
                <span>Mañana</span>
                <strong>{loading ? '—' : reservasManana.length}</strong>
              </div>
              <div>
                <span>Próxima cita</span>
                <strong>{loading ? '—' : nextReserva?.hora_desde ?? 'Sin citas'}</strong>
              </div>
            </div>

            {loading && (
              <div className={styles.loadingGrid}>
                <span />
                <span />
                <span />
              </div>
            )}

            {!loading && error && (
              <div className={styles.errorState}>
                <AlertCircle size={30} strokeWidth={1.5} />
                <strong>No se pudieron cargar las citas</strong>
                <span>{error}</span>
              </div>
            )}

            {!loading && !error && (
              <div className={styles.columnsGrid}>
                {renderColumn('Reservas de hoy', todayISO, 'HOY', reservasHoy)}
                {renderColumn('Reservas de mañana', tomorrowISO, 'MANANA', reservasManana)}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
