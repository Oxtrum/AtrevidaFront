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
  MessageCircle,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  XCircle,
} from 'lucide-react';

import Header from '@/components/AdminHeader/Header';
import { CATEGORIAS_ORDEN } from '@/components/AdminReservationForm/constants';
import { CustomSelect } from '@/components/Custom/CustomSelectAdmin';
import { actualizarEstadoReservaDB, actualizarReservaDB, getReservasDB } from '@/lib/api/reservas';
import {
  SERVICIOS_ADMIN_DISPONIBLES,
  getServiciosAdminPorCategoria,
  getServiciosAdminPorSucursal,
  getTipoFromServicio,
  type EstadoReserva,
  type ReservaBD,
} from '@/types/reserva';
import styles from './page.module.css';

type EstadoGestion = Extract<EstadoReserva, 'PENDIENTE' | 'AGENDADO' | 'RECHAZADO'>;
type EstadoFiltro = EstadoGestion | 'TODOS';
type ApprovalDraft = {
  fecha: string;
  horaDesde: string;
  horaHasta: string;
  telefono: string;
  notas: string;
  servicioConfirmado: string;
};

const ESTADO_OPTIONS: Array<{ value: EstadoFiltro; label: string }> = [
  { value: 'PENDIENTE', label: 'Pendientes' },
  { value: 'AGENDADO', label: 'Agendadas' },
  { value: 'RECHAZADO', label: 'Rechazadas' },
  { value: 'TODOS', label: 'Todas' },
];

const TIPO_LABELS: Record<string, string> = {
  M: 'Tratamiento',
  B: 'Bicicleta',
};

const normalizeEstado = (estado?: EstadoReserva | string): EstadoGestion => {
  if (estado === 'AGENDADO' || estado === 'COMPLETADO') return 'AGENDADO';
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

const getWhatsappHref = (telefono?: string) => {
  const phoneDigits = telefono?.replace(/\D/g, '') ?? '';
  if (!phoneDigits) return null;

  const phone = phoneDigits.startsWith('591') ? phoneDigits : `591${phoneDigits}`;
  const message = 'Hola 👋 Acabamos de recibir tu reserva ✨ ¿Qué tratamiento deseas realizar? 💆‍♀️';

  return `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
};

const getConfirmationWhatsappHref = (reserva: ReservaBD) => {
  const phoneDigits = reserva.numero_telefono?.replace(/\D/g, '') ?? '';
  if (!phoneDigits) return null;

  const phone = phoneDigits.startsWith('591') ? phoneDigits : `591${phoneDigits}`;
  const tratamiento = reserva.servicio_confirmado || reserva.servicio_solicitado || reserva.servicio || 'Tratamiento confirmado';
  const message = [
    '*Su cita ha sido confirmada y reservada con éxito 🎉 en Atrevida Fit - Tecnología y Salud 🌟*',
    '',
    `*📅 Fecha:* ${formatDate(reserva.fecha)} (${reserva.fecha})`,
    `*⏰ Horario:* ${reserva.hora_desde} - ${reserva.hora_hasta}`,
    `*✨ Tratamiento:* ${tratamiento}`,
    `*📍 Sucursal:* ${reserva.local}`,
    '',
    '*Vienes con el estómago lleno (desayuno) y 1 litro de agua* ✨🥰',
    '',
    'Será un placer atenderte! 🤗',
  ].join('\n');

  return `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
};

const getDefaultConfirmedService = (reserva: ReservaBD) => {
  const requested = reserva.servicio_solicitado || reserva.servicio_confirmado || reserva.servicio;
  const match = SERVICIOS_ADMIN_DISPONIBLES.find((servicio) => servicio.label === requested);
  return match?.value || '';
};

const normalizeSearchText = (value?: string | number | null) =>
  String(value ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const getClientInitials = (name?: string) => {
  const parts = (name || 'Cliente')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  return parts.map((part) => part[0]?.toUpperCase()).join('') || 'CL';
};

export default function AdminReservasAprobacionPage() {
  const router = useRouter();
  const pageRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const cardsGridRef = useRef<HTMLDivElement>(null);
  const hasLoadedRef = useRef(false);
  const hasRenderedListRef = useRef(false);
  const preservedScrollYRef = useRef<number | null>(null);

  const [reservas, setReservas] = useState<ReservaBD[]>([]);
  const [renderedReservas, setRenderedReservas] = useState<ReservaBD[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectCauses, setRejectCauses] = useState<Record<number, string>>({});
  const [approvalReserva, setApprovalReserva] = useState<ReservaBD | null>(null);
  const [approvalDraft, setApprovalDraft] = useState<ApprovalDraft | null>(null);
  const [notificationReserva, setNotificationReserva] = useState<ReservaBD | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>('PENDIENTE');
  const [searchQuery, setSearchQuery] = useState('');
  const [localFiltro, setLocalFiltro] = useState('TODOS');
  const [tipoFiltro, setTipoFiltro] = useState('TODOS');
  const [fechaFiltro, setFechaFiltro] = useState('');

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

  const preserveScrollPosition = useCallback((callback: () => void) => {
    preservedScrollYRef.current = window.scrollY;
    callback();
  }, []);

  const localOptions = useMemo(
    () => Array.from(new Set(reservas.map((reserva) => reserva.local).filter(Boolean))).sort(),
    [reservas],
  );

  const tipoOptions = useMemo(
    () => Array.from(new Set(reservas.map((reserva) => reserva.tipo).filter(Boolean))).sort(),
    [reservas],
  );

  const localFilterOptions = useMemo(
    () => [
      { value: 'TODOS', label: 'Todas' },
      ...localOptions.map((local) => ({ value: local, label: local })),
    ],
    [localOptions],
  );

  const tipoFilterOptions = useMemo(
    () => [
      { value: 'TODOS', label: 'Todos' },
      ...tipoOptions.map((tipo) => ({ value: tipo, label: TIPO_LABELS[tipo] ?? tipo })),
    ],
    [tipoOptions],
  );

  const reservasVisibles = useMemo(() => {
    const term = normalizeSearchText(searchQuery.trim());

    return reservas.filter((reserva) => {
      const matchesEstado = estadoFiltro === 'TODOS' || normalizeEstado(reserva.estado) === estadoFiltro;
      const matchesLocal = localFiltro === 'TODOS' || reserva.local === localFiltro;
      const matchesTipo = tipoFiltro === 'TODOS' || reserva.tipo === tipoFiltro;
      const matchesFecha = !fechaFiltro || reserva.fecha === fechaFiltro;
      const searchable = normalizeSearchText([
        reserva.id,
        reserva.cliente,
        reserva.numero_telefono,
        reserva.servicio,
        reserva.servicio_solicitado,
        reserva.servicio_confirmado,
        reserva.local,
        reserva.fecha,
      ].join(' '));

      return matchesEstado && matchesLocal && matchesTipo && matchesFecha && (!term || searchable.includes(term));
    });
  }, [estadoFiltro, fechaFiltro, localFiltro, reservas, searchQuery, tipoFiltro]);

  const hasAdvancedFilters = Boolean(searchQuery.trim() || localFiltro !== 'TODOS' || tipoFiltro !== 'TODOS' || fechaFiltro);
  const reservasVisiblesSignature = useMemo(
    () => reservasVisibles.map((reserva) => `${reserva.id}:${reserva.estado}:${reserva.servicio_confirmado ?? ''}`).join('|'),
    [reservasVisibles],
  );

  const resetFilters = () => preserveScrollPosition(() => {
    setSearchQuery('');
    setLocalFiltro('TODOS');
    setTipoFiltro('TODOS');
    setFechaFiltro('');
  });

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

  const approvalServiceGroups = useMemo(() => {
    if (!approvalReserva) return [];

    const servicios = getServiciosAdminPorSucursal(approvalReserva.local);
    const serviciosPorCategoria = getServiciosAdminPorCategoria(servicios);

    return CATEGORIAS_ORDEN
      .filter((categoria) => serviciosPorCategoria[categoria]?.length > 0)
      .map((categoria) => ({
        label: categoria,
        options: serviciosPorCategoria[categoria].map((servicio) => ({
          value: servicio.value,
          label: `${servicio.label} — ${servicio.duracion} — ${servicio.costo}`,
        })),
      }));
  }, [approvalReserva]);

  const openApprovalModal = (reserva: ReservaBD) => {
    setApprovalReserva(reserva);
    setApprovalDraft({
      fecha: reserva.fecha,
      horaDesde: reserva.hora_desde,
      horaHasta: reserva.hora_hasta,
      telefono: reserva.numero_telefono ?? '',
      notas: reserva.notas ?? '',
      servicioConfirmado: getDefaultConfirmedService(reserva),
    });
    setStatusMessage(null);
  };

  const closeApprovalModal = useCallback(() => {
    if (actionId) return;
    setApprovalReserva(null);
    setApprovalDraft(null);
  }, [actionId]);

  const updateReservaEstado = async (reserva: ReservaBD, estado: EstadoGestion) => {
    const causa = rejectCauses[reserva.id]?.trim() ?? '';

    if (estado === 'RECHAZADO' && !causa) {
      setRejectingId(reserva.id);
      setStatusMessage({ type: 'error', text: 'Agrega una causa para rechazar la reserva.' });
      return;
    }

    if (estado === 'AGENDADO') {
      openApprovalModal(reserva);
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
        current.map((item) => item.id === reserva.id ? {
          ...item,
          estado,
        } : item),
      );
      setRejectingId(null);
      setRejectCauses((current) => ({ ...current, [reserva.id]: '' }));
      setStatusMessage({
        type: 'success',
        text: 'Reserva rechazada correctamente.',
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

  const approveReservaFromModal = async () => {
    if (!approvalReserva || !approvalDraft) return;

    const confirmedService = SERVICIOS_ADMIN_DISPONIBLES.find(
      (servicio) => servicio.value === approvalDraft.servicioConfirmado,
    );

    if (!confirmedService) {
      setStatusMessage({ type: 'error', text: 'Selecciona el servicio confirmado para agendar la reserva.' });
      return;
    }

    const cleanPhone = approvalDraft.telefono.replace(/\D/g, '');
    const updateData = {
      id: approvalReserva.id,
      local: approvalReserva.local,
      ...(approvalDraft.fecha !== approvalReserva.fecha && { nueva_fecha: approvalDraft.fecha }),
      ...(approvalDraft.horaDesde !== approvalReserva.hora_desde && { nueva_hora_desde: approvalDraft.horaDesde }),
      ...(approvalDraft.horaHasta !== approvalReserva.hora_hasta && { nueva_hora_hasta: approvalDraft.horaHasta }),
      ...(cleanPhone !== (approvalReserva.numero_telefono ?? '') && { nuevo_numero_telefono: cleanPhone }),
      ...(approvalDraft.notas !== (approvalReserva.notas ?? '') && { nuevas_notas: approvalDraft.notas }),
    };

    setActionId(approvalReserva.id);
    setStatusMessage(null);

    try {
      if (Object.keys(updateData).length > 2) {
        await actualizarReservaDB(updateData);
      }

      const tipo = getTipoFromServicio(confirmedService.value) === 'B' ? 'bicicleta' : 'mesa';

      await actualizarEstadoReservaDB({
        id: approvalReserva.id,
        estado: 'AGENDADO',
        causa: '',
        servicio_confirmado: confirmedService.label,
        precio: confirmedService.precio,
        tipo,
      });

      const updatedReserva: ReservaBD = {
        ...approvalReserva,
        estado: 'AGENDADO',
        fecha: approvalDraft.fecha,
        hora_desde: approvalDraft.horaDesde,
        hora_hasta: approvalDraft.horaHasta,
        numero_telefono: cleanPhone,
        notas: approvalDraft.notas,
        servicio_confirmado: confirmedService.label,
        precio: confirmedService.precio,
        tipo,
      };

      setReservas((current) =>
        current.map((item) => item.id === approvalReserva.id ? updatedReserva : item),
      );

      setApprovalReserva(null);
      setApprovalDraft(null);
      setNotificationReserva(updatedReserva);
      setStatusMessage({ type: 'success', text: `Reserva #${approvalReserva.id} agendada correctamente.` });
      window.setTimeout(() => setStatusMessage(null), 3600);
    } catch (updateError) {
      setStatusMessage({
        type: 'error',
        text: updateError instanceof Error ? updateError.message : 'No se pudo agendar la reserva.',
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
    if (initialLoading) return undefined;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const grid = cardsGridRef.current;

    if (!grid || !hasRenderedListRef.current || prefersReducedMotion) {
      setRenderedReservas(reservasVisibles);
      hasRenderedListRef.current = true;
      return undefined;
    }

    const ctx = gsap.context(() => {
      gsap.killTweensOf(grid);
      gsap.to(grid, {
        autoAlpha: 0,
        y: 5,
        duration: 0.1,
        ease: 'power2.out',
        onComplete: () => {
          setRenderedReservas(reservasVisibles);
          window.requestAnimationFrame(() => {
            gsap.fromTo(
              grid,
              { autoAlpha: 0, y: 5 },
              { autoAlpha: 1, y: 0, duration: 0.18, ease: 'power2.out', clearProps: 'transform,opacity,visibility' },
            );
          });
        },
      });
    }, cardsGridRef);

    return () => ctx.revert();
  }, [initialLoading, reservasVisibles, reservasVisiblesSignature]);

  useEffect(() => {
    if (preservedScrollYRef.current === null) return undefined;

    const targetY = preservedScrollYRef.current;
    const raf = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        window.scrollTo(0, Math.min(targetY, maxY));
        preservedScrollYRef.current = null;
      });
    });

    return () => window.cancelAnimationFrame(raf);
  }, [estadoFiltro, fechaFiltro, localFiltro, reservas.length, reservasVisibles.length, searchQuery, tipoFiltro]);

  useEffect(() => {
    if (!approvalReserva) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeApprovalModal();
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [approvalReserva, closeApprovalModal]);

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
              onClick={() => preserveScrollPosition(() => { void fetchReservas(estadoFiltro); })}
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
                  Búsqueda y filtros
                </span>
                <h2>{estadoFiltro === 'TODOS' ? 'Todas las solicitudes' : `Reservas ${ESTADO_OPTIONS.find((option) => option.value === estadoFiltro)?.label.toLowerCase()}`}</h2>
              </div>
              <span className={styles.countPill}>{reservasVisibles.length} resultado{reservasVisibles.length === 1 ? '' : 's'}</span>
            </div>

            <div className={styles.controlsPanel}>
              <label className={`${styles.controlField} ${styles.searchField}`}>
                <span>Buscar reserva</span>
                <div className={styles.searchInputWrap}>
                  <Search size={16} strokeWidth={1.8} />
                  <input
                    value={searchQuery}
                    onChange={(event) => preserveScrollPosition(() => setSearchQuery(event.target.value))}
                    placeholder="Cliente, teléfono, servicio o #ID"
                  />
                </div>
              </label>

              <label className={styles.controlField}>
                <span>Sucursal</span>
                <CustomSelect
                  value={localFiltro}
                  onChange={(value) => preserveScrollPosition(() => setLocalFiltro(value))}
                  options={localFilterOptions}
                />
              </label>

              <label className={styles.controlField}>
                <span>Tipo</span>
                <CustomSelect
                  value={tipoFiltro}
                  onChange={(value) => preserveScrollPosition(() => setTipoFiltro(value))}
                  options={tipoFilterOptions}
                />
              </label>

              <label className={styles.controlField}>
                <span>Fecha</span>
                <div className={styles.dateInputWrap}>
                  <Calendar size={16} strokeWidth={1.8} />
                  <input
                    type="date"
                    value={fechaFiltro}
                    onChange={(event) => preserveScrollPosition(() => setFechaFiltro(event.target.value))}
                  />
                </div>
              </label>

              <button
                type="button"
                className={styles.clearFiltersButton}
                onClick={resetFilters}
                disabled={!hasAdvancedFilters}
              >
                <SlidersHorizontal size={15} strokeWidth={1.8} />
                Limpiar
              </button>
            </div>

            <div className={styles.filterBar} aria-label="Filtrar reservas por estado">
              {ESTADO_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`${styles.filterButton} ${estadoFiltro === option.value ? styles.filterButtonActive : ''}`}
                  onClick={() => preserveScrollPosition(() => { void fetchReservas(option.value); })}
                  disabled={initialLoading || isFetching || estadoFiltro === option.value}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className={styles.resultsSurface}>
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

              {!initialLoading && error && renderedReservas.length === 0 && (
                <div className={styles.emptyState}>
                  <AlertCircle size={30} strokeWidth={1.5} />
                  <strong>No se pudieron cargar las reservas</strong>
                  <span>{error}</span>
                </div>
              )}

              {!initialLoading && !error && renderedReservas.length === 0 && (
                <div className={styles.emptyState}>
                  <CalendarCheck size={32} strokeWidth={1.5} />
                  <strong>No hay reservas con estos filtros</strong>
                  <span>Ajusta la búsqueda, limpia filtros o actualiza la bandeja para revisar nuevas solicitudes.</span>
                </div>
              )}

              {!initialLoading && renderedReservas.length > 0 && (
                <div ref={cardsGridRef} className={styles.pendingGrid}>
                  {renderedReservas.map((reserva) => {
                  const estadoNormalizado = normalizeEstado(reserva.estado);
                  const whatsappHref = getWhatsappHref(reserva.numero_telefono);
                  const confirmationWhatsappHref = getConfirmationWhatsappHref(reserva);

                  return (
                  <article key={reserva.id} className={`approval-card ${styles.pendingCard} ${styles[`card${estadoNormalizado}`]}`}>
                    <div className={styles.pendingContent}>
                      <div className={styles.pendingTop}>
                        <span className={`${styles.pendingState} ${styles[`state${estadoNormalizado}`]}`}>
                          {estadoNormalizado}
                        </span>
                        <span className={styles.pendingId}>#{reserva.id}</span>
                      </div>

                      <div className={styles.clientHeader}>
                        <span className={styles.clientAvatar} aria-hidden="true">
                          {getClientInitials(reserva.cliente)}
                        </span>
                        <div className={styles.clientInfo}>
                          <h3>{reserva.cliente || 'Cliente sin nombre'}</h3>
                          <p className={styles.pendingService}>{reserva.servicio || 'Servicio por definir'}</p>
                        </div>
                      </div>
                      {(reserva.servicio_solicitado || reserva.servicio_confirmado) && (
                        <div className={styles.serviceTrace}>
                          {reserva.servicio_solicitado && (
                            <span>Solicitado: <strong>{reserva.servicio_solicitado}</strong></span>
                          )}
                          {reserva.servicio_confirmado && (
                            <span>Confirmado: <strong>{reserva.servicio_confirmado}</strong></span>
                          )}
                        </div>
                      )}

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
                    </div>

                    {estadoNormalizado === 'PENDIENTE' && (
                      <div className={styles.pendingActions}>
                        <button
                          type="button"
                          className={styles.approveButton}
                          onClick={() => updateReservaEstado(reserva, 'AGENDADO')}
                          disabled={actionId === reserva.id}
                        >
                          <Check size={15} strokeWidth={1.8} />
                          Aprobar
                        </button>
                        {whatsappHref ? (
                          <a
                            href={whatsappHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.contactButton}
                          >
                            <MessageCircle size={15} strokeWidth={1.8} />
                            Contactar
                          </a>
                        ) : (
                          <button
                            type="button"
                            className={styles.contactButton}
                            disabled
                          >
                            <MessageCircle size={15} strokeWidth={1.8} />
                            Contactar
                          </button>
                        )}
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
                    {estadoNormalizado === 'AGENDADO' && (
                      <div className={`${styles.pendingActions} ${styles.notifyActions}`}>
                        {confirmationWhatsappHref ? (
                          <a
                            href={confirmationWhatsappHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.notifyButton}
                          >
                            <MessageCircle size={15} strokeWidth={1.8} />
                            Enviar confirmación
                          </a>
                        ) : (
                          <button
                            type="button"
                            className={styles.notifyButton}
                            disabled
                          >
                            <MessageCircle size={15} strokeWidth={1.8} />
                            Sin teléfono
                          </button>
                        )}
                      </div>
                    )}
                  </article>
                  );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {approvalReserva && approvalDraft && (
        <div
          className={styles.approvalModalOverlay}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeApprovalModal();
          }}
        >
          <section
            className={styles.approvalModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="approval-modal-title"
          >
            <div className={styles.modalTop}>
              <div>
                <span className={styles.modalEyebrow}>Revisión final</span>
                <h2 id="approval-modal-title">Aprobar reserva #{approvalReserva.id}</h2>
                <p>
                  Confirma los datos de la solicitud y el servicio definitivo antes de pasarla a agenda.
                </p>
              </div>
              <button
                type="button"
                className={styles.modalClose}
                onClick={closeApprovalModal}
                disabled={actionId === approvalReserva.id}
                aria-label="Cerrar modal de aprobación"
              >
                <XCircle size={20} strokeWidth={1.8} />
              </button>
            </div>

            <div className={styles.modalSummary}>
              <span>
                Solicitado: <strong>{approvalReserva.servicio_solicitado || approvalReserva.servicio || 'Por definir'}</strong>
              </span>
              {approvalReserva.servicio_confirmado && (
                <span>
                  Confirmado previo: <strong>{approvalReserva.servicio_confirmado}</strong>
                </span>
              )}
            </div>

            <div className={styles.modalGrid}>
              <label className={styles.modalField}>
                Cliente
                <input value={approvalReserva.cliente || 'Cliente sin nombre'} disabled />
              </label>
              <label className={styles.modalField}>
                Local
                <input value={approvalReserva.local} disabled />
              </label>
              <label className={styles.modalField}>
                Teléfono
                <input
                  value={approvalDraft.telefono}
                  onChange={(event) => setApprovalDraft((current) => current ? {
                    ...current,
                    telefono: event.target.value,
                  } : current)}
                  inputMode="numeric"
                  placeholder="77777777"
                />
              </label>
              <label className={styles.modalField}>
                Fecha
                <input
                  type="date"
                  value={approvalDraft.fecha}
                  onChange={(event) => setApprovalDraft((current) => current ? {
                    ...current,
                    fecha: event.target.value,
                  } : current)}
                />
              </label>
              <label className={styles.modalField}>
                Hora inicio
                <input
                  type="time"
                  value={approvalDraft.horaDesde}
                  onChange={(event) => setApprovalDraft((current) => current ? {
                    ...current,
                    horaDesde: event.target.value,
                  } : current)}
                />
              </label>
              <label className={styles.modalField}>
                Hora fin
                <input
                  type="time"
                  value={approvalDraft.horaHasta}
                  onChange={(event) => setApprovalDraft((current) => current ? {
                    ...current,
                    horaHasta: event.target.value,
                  } : current)}
                />
              </label>
              <label className={`${styles.modalField} ${styles.modalFieldWide}`}>
                Servicio definitivo
                <CustomSelect
                  value={approvalDraft.servicioConfirmado}
                  onChange={(value) => setApprovalDraft((current) => current ? {
                    ...current,
                    servicioConfirmado: value,
                  } : current)}
                  groups={approvalServiceGroups}
                  placeholder="Seleccionar servicio"
                  hasError={false}
                />
              </label>
              <label className={`${styles.modalField} ${styles.modalFieldWide}`}>
                Notas
                <textarea
                  value={approvalDraft.notas}
                  onChange={(event) => setApprovalDraft((current) => current ? {
                    ...current,
                    notas: event.target.value,
                  } : current)}
                  placeholder="Añade una observación para el equipo si hace falta."
                />
              </label>
            </div>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.modalGhost}
                onClick={closeApprovalModal}
                disabled={actionId === approvalReserva.id}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={styles.modalPrimary}
                onClick={approveReservaFromModal}
                disabled={actionId === approvalReserva.id}
              >
                <Check size={16} strokeWidth={1.8} />
                {actionId === approvalReserva.id ? 'Agendando...' : 'Aprobar y agendar'}
              </button>
            </div>
          </section>
        </div>
      )}

      {notificationReserva && (
        <div className={styles.confirmationPrompt} role="status" aria-live="polite">
          <div className={styles.promptText}>
            <span>Reserva agendada</span>
            <strong>Envía la confirmación por WhatsApp al cliente.</strong>
          </div>
          {getConfirmationWhatsappHref(notificationReserva) ? (
            <a
              href={getConfirmationWhatsappHref(notificationReserva) ?? undefined}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.promptAction}
            >
              <MessageCircle size={16} strokeWidth={1.8} />
              Enviar WhatsApp
            </a>
          ) : (
            <button type="button" className={styles.promptAction} disabled>
              <MessageCircle size={16} strokeWidth={1.8} />
              Sin teléfono
            </button>
          )}
          <button
            type="button"
            className={styles.promptClose}
            onClick={() => setNotificationReserva(null)}
            aria-label="Ocultar aviso de confirmación"
          >
            <XCircle size={18} strokeWidth={1.8} />
          </button>
        </div>
      )}

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
