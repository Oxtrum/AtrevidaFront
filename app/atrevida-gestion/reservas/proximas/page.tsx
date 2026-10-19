'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import gsap from 'gsap';
import {
  AlertCircle,
  ArrowLeft,
  CalendarCheck,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';

import Header from '@/components/AdminHeader/Header';
import { AdminButton, AdminPanel, CursorPagination, PageHeader, StatCard, StatGrid, StatusBadge } from '@/components/AdminConfig';
import { ReservaContacto, ReservaRow, ReservaStockHint, formatDuracion, formatFalta } from '@/components/AdminReservas';
import { getReservasDB } from '@/lib/api/reservas';
import { buildReminderWhatsappHref } from '@/lib/utils/whatsapp';
import type { ReservaBD, EstadoReserva } from '@/types/reserva';
import styles from './page.module.css';
import { PAGE_LIMIT } from '@/lib/api/pagination';
import { useCursorPagination } from '@/lib/hooks/useCursorPagination';

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

const getCurrentTimeHHMM = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};

const getReservaDateTimeMs = (reserva: ReservaBD, time: string) => {
  const timestamp = new Date(`${reserva.fecha}T${normalizeTimeForDate(time)}`).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const getReservaStartMs = (reserva: ReservaBD) => getReservaDateTimeMs(reserva, reserva.hora_desde);

const formatDate = (fecha: string) => {
  const [year, month, day] = fecha.split('-').map(Number);
  if (!year || !month || !day) return fecha;

  return new Date(year, month - 1, day).toLocaleDateString('es-BO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
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
	const [totalRegistros, setTotalRegistros] = useState<number | null>(null);
	const [proximaReservaGlobal, setProximaReservaGlobal] = useState<ReservaBD | null>(null);

  const todayISO = useMemo(() => getDateISOWithOffset(0), []);
  const tomorrowISO = useMemo(() => getDateISOWithOffset(1), []);
	const vigenteHora = useMemo(() => getCurrentTimeHHMM(), []);
	const pagination = useCursorPagination(`${todayISO}|${tomorrowISO}|${vigenteHora}|AGENDADO|cronologico`);
	const { cursor: paginationCursor, requestRevision, shouldIncludeTotal, setMetadata: setPaginationMetadata } = pagination;
	const requestRef = useRef(0);
	const requestControllerRef = useRef<AbortController | null>(null);

  const fetchReservas = useCallback(async (isRefresh = false) => {
    void requestRevision;
	requestControllerRef.current?.abort();
	const controller = new AbortController();
	requestControllerRef.current = controller;
	const requestId = ++requestRef.current;
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
		vigente_fecha: todayISO,
		vigente_hora: vigenteHora,
		orden: 'cronologico',
		limit: PAGE_LIMIT,
		cursor: paginationCursor,
		include_total: shouldIncludeTotal(),
      }, controller.signal);
	  if (requestId !== requestRef.current) return;
      setReservas(response.data?.reservas ?? []);
	  if (!paginationCursor) {
		setProximaReservaGlobal(response.data?.reservas?.[0] ?? null);
	  }
	  setPaginationMetadata(response.data?.paginacion);
	  if (response.data?.paginacion?.total_registros !== undefined) {
		setTotalRegistros(response.data.paginacion.total_registros);
	  }
    } catch (fetchError) {
	  if (controller.signal.aborted) return;
	  if (requestId !== requestRef.current) return;
      setError(fetchError instanceof Error ? fetchError.message : 'No se pudieron cargar las citas próximas.');
      if (!isRefresh) setReservas([]);
    } finally {
	  if (requestId === requestRef.current) {
		setLoading(false);
		setRefreshing(false);
	  }
    }
  }, [todayISO, tomorrowISO, vigenteHora, paginationCursor, requestRevision, shouldIncludeTotal, setPaginationMetadata]);

	useEffect(() => () => {
		requestRef.current += 1;
		requestControllerRef.current?.abort();
	}, []);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/atrevida-gestion/login');
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
        && reserva.fecha === todayISO,
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

  const totalVisible = reservasHoy.length + reservasManana.length;
	const total = totalRegistros ?? totalVisible;
  const nextReserva = proximaReservaGlobal ?? reservasHoy[0] ?? reservasManana[0];

  const renderColumn = (title: string, fecha: string, relativeDay: RelativeDay, items: ReservaBD[]) => (
    <section className={styles.dayColumn} aria-labelledby={`day-${relativeDay}`}>
      <div className={styles.dayHeader}>
        <div>
          <span>{formatDate(fecha)}</span>
          <h2 id={`day-${relativeDay}`}>{title}</h2>
        </div>
        <StatusBadge>{items.length}</StatusBadge>
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
            const reminderHref = buildReminderWhatsappHref(reserva);
            const finalService = reserva.servicio_confirmado || reserva.servicio_solicitado || reserva.servicio || 'Tratamiento confirmado';

            return (
              <ReservaRow
                key={`${relativeDay}-${reserva.id}`}
                className="reminderCard"
                variant="compact"
                tone="agendado"
                time={reserva.hora_desde}
                timeSub={formatDuracion(reserva.hora_desde, reserva.hora_hasta) || reserva.hora_hasta}
                title={reserva.cliente || 'Cliente sin nombre'}
                service={finalService}
                titleHint={
                  <>
                    {relativeDay === 'HOY' && formatFalta(reserva.hora_desde) && <span className={styles.falta}>{formatFalta(reserva.hora_desde)}</span>}
                    {reserva.alerta_inventario && <ReservaStockHint />}
                  </>
                }
                meta={<ReservaContacto local={reserva.local} telefono={reserva.numero_telefono} />}
                actions={
                  <AdminButton
                    size="sm"
                    icon={<MessageCircle size={14} strokeWidth={2} />}
                    href={reminderHref ?? undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    disabled={!reminderHref}
                  >
                    {reminderHref ? 'Recordar' : 'Sin teléfono'}
                  </AdminButton>
                }
              />
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
        <div className="admin-mesh" />

        <div className={styles.container}>
          <div ref={headerRef}>
            <PageHeader
              kicker="Recordatorios operativos"
              kickerIcon={<ShieldCheck size={14} strokeWidth={2} />}
              title="Citas Próximas"
              accentWord="Próximas"
              subtitle="Vista limpia para contactar a las clientas de hoy y mañana."
              actions={
                <div className={styles.headerActions}>
                  <AdminButton variant="secondary" href="/atrevida-gestion/reservas/aprobacion" icon={<ArrowLeft size={16} strokeWidth={1.8} />}>
                    Aprobaciones
                  </AdminButton>
                  <AdminButton
                    variant="secondary"
                    icon={<RefreshCw size={16} strokeWidth={1.8} className={refreshing ? styles.spinIcon : ''} />}
                    onClick={() => void fetchReservas(true)}
                    disabled={loading || refreshing}
                  >
                    {refreshing ? 'Actualizando' : 'Actualizar'}
                  </AdminButton>
                </div>
              }
            />
          </div>

          <AdminPanel ref={boardRef} >
            <StatGrid>
              <StatCard value={loading ? '—' : total} label="Total" sublabel="Por recordar" loading={loading} />
              <StatCard value={loading ? '—' : reservasHoy.length} label="Hoy" accentColor="var(--admin-accent-primary)" loading={loading} />
              <StatCard value={loading ? '—' : reservasManana.length} label="Mañana" accentColor="var(--admin-accent-tertiary)" loading={loading} />
              <StatCard value={loading ? '—' : (nextReserva?.hora_desde ?? 'Sin citas')} label="Próxima cita" loading={loading} />
            </StatGrid>

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
			  <>
			  <div className={styles.columnsGrid}>
                {renderColumn('Reservas de hoy', todayISO, 'HOY', reservasHoy)}
                {renderColumn('Reservas de mañana', tomorrowISO, 'MANANA', reservasManana)}
              </div>
			  <CursorPagination page={pagination.page} totalPages={pagination.totalPages} hasNext={pagination.hasNext} loading={loading || refreshing} onPrevious={pagination.previous} onNext={pagination.next} />
			  </>
            )}
          </AdminPanel>
        </div>
      </main>
    </div>
  );
}
