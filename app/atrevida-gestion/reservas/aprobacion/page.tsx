'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import gsap from 'gsap';
import {
  AlertCircle,
  Calendar,
  CalendarCheck,
  Check,
  Clock,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  XCircle,
} from 'lucide-react';

import Header from '@/components/AdminHeader/Header';
import { PageHeader, StatGrid, StatCard, AdminPanel } from '@/components/AdminConfig';
import { CATEGORIAS_ORDEN } from '@/components/AdminReservationForm/constants';
import { CustomSelect } from '@/components/Custom/CustomSelectAdmin';
import { actualizarEstadoReservaDB, actualizarReservaDB, actualizarReservaNotificadoDB, eliminarReservaDB, getReservasDB } from '@/lib/api/reservas';
import {
  SERVICIOS_ADMIN_DISPONIBLES,
  getServiciosAdminPorCategoria,
  getServiciosAdminPorSucursal,
  getTipoBackendFromServicio,
  type EstadoReserva,
  type ReservaBD,
} from '@/types/reserva';
import styles from './page.module.css';

type EstadoGestion = Extract<EstadoReserva, 'PENDIENTE' | 'AGENDADO' | 'RECHAZADO'>;
type EstadoNormalizado = EstadoGestion | 'COMPLETADO';
type EstadoFiltro = EstadoGestion | 'TODOS';
type ApprovalDraft = {
  fecha: string;
  horaDesde: string;
  horaHasta: string;
  telefono: string;
  notas: string;
  servicioConfirmado: string;
};
type CompletionReasonMode = 'DONE' | 'OTHER';
type CompletionDraft = {
  reserva: ReservaBD;
  reasonMode: CompletionReasonMode;
  otherReason: string;
};

const ESTADO_OPTIONS: Array<{ value: EstadoFiltro; label: string }> = [
  { value: 'PENDIENTE', label: 'Pendientes' },
  { value: 'AGENDADO', label: 'Agendadas' },
  { value: 'RECHAZADO', label: 'Rechazadas' },
  { value: 'TODOS', label: 'Todas' },
];
const COMPLETION_REASON_DONE = 'Ya se brindo el servicio';

const TIPO_LABELS: Record<string, string> = {
  M: 'Tratamiento',
  B: 'Bicicleta',
};

const normalizeEstado = (estado?: EstadoReserva | string): EstadoNormalizado => {
  if (estado === 'AGENDADO') return 'AGENDADO';
  if (estado === 'COMPLETADO') return 'COMPLETADO';
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

  const phone = phoneDigits.startsWith('591') ? phoneDigits : '591' + phoneDigits;
  const message = 'Hola 👋 Acabamos de recibir tu reserva ✨ ¿Qué tratamiento deseas realizar? 💆‍♀️';

  return `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
};

const getMealLabelByTime = (horaDesde: string) => {
  const [hourRaw = '0'] = horaDesde.split(':');
  const hour = Number(hourRaw);
  return Number.isFinite(hour) && hour < 12 ? 'desayuno' : 'almuerzo';
};

const getConfirmationWhatsappHref = (reserva: ReservaBD) => {
  const phoneDigits = reserva.numero_telefono?.replace(/\D/g, '') ?? '';
  if (!phoneDigits) return null;

  const phone = phoneDigits.startsWith('591') ? phoneDigits : '591' + phoneDigits;
  const tratamiento = reserva.servicio_confirmado || reserva.servicio_solicitado || reserva.servicio || 'Tratamiento confirmado';
  const comidaPrevia = getMealLabelByTime(reserva.hora_desde);
  const message = [
    '*Su cita ha sido confirmada y reservada con éxito 🎉 en Atrevida Fit - Tecnología y Salud 🌟*',
    '',
    `*📅 Fecha:* ${formatDate(reserva.fecha)} (${reserva.fecha})`,
    `*⏰ Horario:* ${reserva.hora_desde} - ${reserva.hora_hasta}`,
    `*✨ Tratamiento:* ${tratamiento}`,
    `*📍 Sucursal:* ${reserva.local}`,
    '',
    `*Vienes con el estómago lleno (${comidaPrevia}) y 1 litro de agua* ✨🥰`,
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

const getReservaServiceSummary = (reserva: ReservaBD) => {
  const seen = new Set<string>();
  const services = [
    reserva.servicio_confirmado,
    reserva.servicio_solicitado,
    reserva.servicio,
  ]
    .flatMap((value) => (value ?? '').split(/\s*(?:\n|,|;|\s\+\s)\s*/))
    .map((value) => value.trim())
    .filter((value) => {
      if (!value) return false;
      const key = normalizeSearchText(value);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  const normalizedServices = services.length > 0 ? services : ['Servicio por definir'];

  return {
    visible: normalizedServices.slice(0, 3),
    remaining: Math.max(normalizedServices.length - 3, 0),
  };
};

const normalizeSearchText = (value?: string | number | null) =>
  String(value ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const normalizeTimeForDate = (time?: string) => {
  const [hours = '0', minutes = '0'] = (time || '0:00').split(':');
  return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:00`;
};

const getReservaDateTimeMs = (reserva: ReservaBD, time: string) => {
  const timestamp = new Date(`${reserva.fecha}T${normalizeTimeForDate(time)}`).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const getReservaStartMs = (reserva: ReservaBD) => getReservaDateTimeMs(reserva, reserva.hora_desde);

const getReservaEndMs = (reserva: ReservaBD) =>
  getReservaDateTimeMs(reserva, reserva.hora_hasta || reserva.hora_desde);

const getReservaAuditMs = (reserva: ReservaBD) => {
  const timestamp = new Date(reserva.actualizado_en || reserva.creado_en || '').getTime();
  return Number.isFinite(timestamp) ? timestamp : getReservaStartMs(reserva);
};

const getDateISOWithOffset = (daysOffset: number) => {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toLocaleDateString('en-CA');
};

const isReservaPendienteVigente = (reserva: ReservaBD) =>
  normalizeEstado(reserva.estado) === 'PENDIENTE' && getReservaEndMs(reserva) >= Date.now();

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
  const sortStampByReservaIdRef = useRef<Map<number, number>>(new Map());

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
  const [openActionMenuId, setOpenActionMenuId] = useState<number | null>(null);
  const [completionDraft, setCompletionDraft] = useState<CompletionDraft | null>(null);
  const [completionError, setCompletionError] = useState<string | null>(null);
  const [deleteReserva, setDeleteReserva] = useState<ReservaBD | null>(null);
  const [notificationReserva, setNotificationReserva] = useState<ReservaBD | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>('PENDIENTE');
  const [searchQuery, setSearchQuery] = useState('');
  const [localFiltro, setLocalFiltro] = useState('TODOS');
  const [tipoFiltro, setTipoFiltro] = useState('TODOS');
  const [fechaFiltro, setFechaFiltro] = useState('');

  const fetchReservas = useCallback(async () => {
    const isInitialRequest = !hasLoadedRef.current;
    if (isInitialRequest) {
      setInitialLoading(true);
    } else {
      setIsFetching(true);
    }
    setError(null);

    try {
      const response = await getReservasDB({
        fecha_desde: getDateISOWithOffset(-14),
      });
      const nextReservas = response.data?.reservas ?? [];
      const nextIds = new Set(nextReservas.map((reserva) => reserva.id));
      sortStampByReservaIdRef.current.forEach((_, reservaId) => {
        if (!nextIds.has(reservaId)) sortStampByReservaIdRef.current.delete(reservaId);
      });
      nextReservas.forEach((reserva) => {
        if (!sortStampByReservaIdRef.current.has(reserva.id)) {
          sortStampByReservaIdRef.current.set(reserva.id, getReservaAuditMs(reserva));
        }
      });
      setReservas(nextReservas);
      hasLoadedRef.current = true;
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'No se pudieron cargar las reservas');
      if (isInitialRequest) setReservas([]);
    } finally {
      setInitialLoading(false);
      setIsFetching(false);
    }
  }, []);

  const markConfirmationSent = useCallback(async (reservaId: number) => {
    setReservas((current) =>
      current.map((item) => item.id === reservaId ? { ...item, notificado: true } : item),
    );
    setNotificationReserva((current) => current?.id === reservaId ? { ...current, notificado: true } : current);

    try {
      await actualizarReservaNotificadoDB({ id: reservaId, notificado: true });
    } catch (updateError) {
      setReservas((current) =>
        current.map((item) => item.id === reservaId ? { ...item, notificado: false } : item),
      );
      setNotificationReserva((current) => current?.id === reservaId ? { ...current, notificado: false } : current);
      setStatusMessage({
        type: 'error',
        text: updateError instanceof Error ? updateError.message : 'No se pudo marcar la reserva como notificada.',
      });
      window.setTimeout(() => setStatusMessage(null), 3600);
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

    const filteredReservas = reservas.filter((reserva) => {
      const estadoNormalizado = normalizeEstado(reserva.estado);
      if (estadoNormalizado === 'COMPLETADO') return false;
      const isVisibleByStateWindow = estadoNormalizado !== 'PENDIENTE' || isReservaPendienteVigente(reserva);
      const matchesEstado = estadoFiltro === 'TODOS' || estadoNormalizado === estadoFiltro;
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

      return isVisibleByStateWindow && matchesEstado && matchesLocal && matchesTipo && matchesFecha && (!term || searchable.includes(term));
    });

    if (estadoFiltro !== 'AGENDADO') {
      return filteredReservas;
    }

    return filteredReservas.sort((a, b) => {
      const stampA = sortStampByReservaIdRef.current.get(a.id) ?? getReservaAuditMs(a);
      const stampB = sortStampByReservaIdRef.current.get(b.id) ?? getReservaAuditMs(b);
      return stampB - stampA;
    });
  }, [estadoFiltro, fechaFiltro, localFiltro, reservas, searchQuery, tipoFiltro]);

  const hasAdvancedFilters = Boolean(searchQuery.trim() || localFiltro !== 'TODOS' || tipoFiltro !== 'TODOS' || fechaFiltro);
  const reservasVisiblesSignature = useMemo(
    () => reservasVisibles.map((reserva) => `${reserva.id}:${reserva.estado}:${reserva.servicio_confirmado ?? ''}:${reserva.notificado ? '1' : '0'}`).join('|'),
    [reservasVisibles],
  );

  const resetFilters = () => preserveScrollPosition(() => {
    setSearchQuery('');
    setLocalFiltro('TODOS');
    setTipoFiltro('TODOS');
    setFechaFiltro('');
  });

  const reservasPendientes = useMemo(
    () => reservas.filter(isReservaPendienteVigente),
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

  const completionServiceSummary = useMemo(
    () => completionDraft ? getReservaServiceSummary(completionDraft.reserva) : { visible: [], remaining: 0 },
    [completionDraft],
  );
  const deleteServiceSummary = useMemo(
    () => deleteReserva ? getReservaServiceSummary(deleteReserva) : { visible: [], remaining: 0 },
    [deleteReserva],
  );

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

  const openCompletionModal = (reserva: ReservaBD) => {
    setOpenActionMenuId(null);
    setCompletionDraft({
      reserva,
      reasonMode: 'DONE',
      otherReason: '',
    });
    setCompletionError(null);
    setStatusMessage(null);
  };

  const closeCompletionModal = useCallback(() => {
    if (actionId) return;
    setCompletionDraft(null);
    setCompletionError(null);
  }, [actionId]);

  const openDeleteModal = (reserva: ReservaBD) => {
    setOpenActionMenuId(null);
    setDeleteReserva(reserva);
    setStatusMessage(null);
  };

  const closeDeleteModal = useCallback(() => {
    if (actionId) return;
    setDeleteReserva(null);
  }, [actionId]);

  const deleteReservaFromModal = async () => {
    if (!deleteReserva) return;

    const reservaId = deleteReserva.id;
    setActionId(reservaId);
    setStatusMessage(null);

    try {
      await eliminarReservaDB(reservaId);
      sortStampByReservaIdRef.current.delete(reservaId);
      setReservas((current) => current.filter((item) => item.id !== reservaId));
      setNotificationReserva((current) => current?.id === reservaId ? null : current);
      setDeleteReserva(null);
      setStatusMessage({ type: 'success', text: `Reserva #${reservaId} eliminada.` });
      window.setTimeout(() => setStatusMessage(null), 3600);
    } catch (deleteError) {
      setStatusMessage({
        type: 'error',
        text: deleteError instanceof Error ? deleteError.message : 'No se pudo eliminar la reserva.',
      });
    } finally {
      setActionId(null);
    }
  };

  const markReservaCompleted = async () => {
    if (!completionDraft) return;

    const causa = completionDraft.reasonMode === 'OTHER'
      ? completionDraft.otherReason.trim()
      : COMPLETION_REASON_DONE;

    if (!causa) {
      setCompletionError('Ingresa el motivo para completar la reserva.');
      return;
    }

    const reservaId = completionDraft.reserva.id;
    setActionId(reservaId);
    setCompletionError(null);
    setStatusMessage(null);

    try {
      await actualizarEstadoReservaDB({
        id: reservaId,
        estado: 'COMPLETADO',
        causa,
      });

      setReservas((current) =>
        current.map((item) => item.id === reservaId ? {
          ...item,
          estado: 'COMPLETADO',
        } : item),
      );
      setNotificationReserva((current) => current?.id === reservaId ? null : current);
      setCompletionDraft(null);
      setStatusMessage({ type: 'success', text: `Reserva #${reservaId} marcada como completada.` });
      window.setTimeout(() => setStatusMessage(null), 3600);
    } catch (updateError) {
      setStatusMessage({
        type: 'error',
        text: updateError instanceof Error ? updateError.message : 'No se pudo completar la reserva.',
      });
    } finally {
      setActionId(null);
    }
  };

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

    const rawDigits = approvalDraft.telefono.replace(/\D/g, '');
    const cleanPhone = rawDigits;
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

      const tipoBackend = getTipoBackendFromServicio(confirmedService.value);

      await actualizarEstadoReservaDB({
        id: approvalReserva.id,
        estado: 'AGENDADO',
        causa: '',
        servicio_confirmado: confirmedService.label,
        precio: confirmedService.precio,
        tipo: tipoBackend,
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
        tipo: tipoBackend,
        notificado: false,
      };
      sortStampByReservaIdRef.current.set(updatedReserva.id, Date.now());

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
      router.push('/atrevida-gestion/login');
      return;
    }

    void fetchReservas();
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
        <div className="admin-mesh" />

        <div className={styles.container}>
          <div ref={headerRef}>
            <PageHeader
              kicker="Gestión de reservas"
              kickerIcon={<ShieldCheck size={14} strokeWidth={2} />}
              title="Aprobación de Reservas"
              accentWord="Aprobación"
              subtitle="Administra las solicitudes que llegan desde la web. Agenda una cita cuando esté validada o recházala con una causa para mantener trazabilidad."
              actions={
                <div className={styles.headerActions}>
                  <Link href="/atrevida-gestion/reservas/proximas" className={styles.secondaryNavButton}>
                    <Clock size={16} strokeWidth={1.8} />
                    Citas próximas
                  </Link>
                  <button
                    type="button"
                    className={styles.refreshButton}
                    onClick={() => preserveScrollPosition(() => { void fetchReservas(); })}
                    disabled={initialLoading || isFetching}
                  >
                    <RefreshCw size={16} strokeWidth={1.8} className={isFetching ? styles.spinIcon : ''} />
                    {isFetching ? 'Actualizando' : 'Actualizar'}
                  </button>
                </div>
              }
            />
          </div>

          <AdminPanel>
            <StatGrid>
              <StatCard
                value={reservasPendientes.length}
                label="Pendientes"
                sublabel="Necesitan revisión"
                accentColor="var(--admin-accent-yellow)"
                loading={initialLoading}
              />
              <StatCard
                value={reservasAgendadas.length}
                label="Agendadas"
                sublabel="Ya confirmadas"
                accentColor="var(--admin-accent-tertiary)"
                loading={initialLoading}
              />
              <StatCard
                value={reservasRechazadas.length}
                label="Rechazadas"
                sublabel="Con causa registrada"
                accentColor="var(--admin-accent-danger)"
                loading={initialLoading}
              />
            </StatGrid>

            <div className={styles.boardHeader}>
              <div>
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
                  onClick={() => preserveScrollPosition(() => setEstadoFiltro(option.value))}
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
                  const confirmationSent = Boolean(reserva.notificado);
                  const isCompleted = reserva.estado === 'COMPLETADO';
                  const canShowCardMenu = estadoNormalizado === 'PENDIENTE' || estadoNormalizado === 'RECHAZADO' || (estadoNormalizado === 'AGENDADO' && !isCompleted);
                  const canMarkCompleted = estadoNormalizado === 'AGENDADO' && !isCompleted && confirmationSent;
                  const cardActionMenu = canShowCardMenu ? (
                    <div className={styles.cardMenuWrapper}>
                      <button
                        type="button"
                        className={styles.cardMenuButton}
                        onClick={() => setOpenActionMenuId((current) => current === reserva.id ? null : reserva.id)}
                        disabled={actionId === reserva.id}
                        aria-label={`Acciones de reserva ${reserva.id}`}
                        aria-haspopup="menu"
                        aria-expanded={openActionMenuId === reserva.id}
                      >
                        <MoreHorizontal size={18} strokeWidth={2} />
                      </button>
                      {openActionMenuId === reserva.id && (
                        <div className={styles.cardMenu} role="menu">
                          {canMarkCompleted && (
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => openCompletionModal(reserva)}
                              disabled={actionId === reserva.id}
                            >
                              Marcar como completada
                            </button>
                          )}
                          <button
                            type="button"
                            role="menuitem"
                            className={styles.cardMenuDanger}
                            onClick={() => openDeleteModal(reserva)}
                            disabled={actionId === reserva.id}
                          >
                            <Trash2 size={14} strokeWidth={1.8} />
                            Eliminar reserva
                          </button>
                        </div>
                      )}
                    </div>
                  ) : null;

                  return (
                  <article key={reserva.id} className={`approval-card ${styles.pendingCard} ${styles[`card${estadoNormalizado}`]}`}>
                    <div className={styles.pendingContent}>
                      <div className={styles.pendingTop}>
                        <span className={`${styles.pendingState} ${styles[`state${isCompleted ? 'COMPLETADO' : estadoNormalizado}`]}`}>
                          {isCompleted ? 'COMPLETADO' : estadoNormalizado}
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

                      {estadoNormalizado === 'AGENDADO' && (
                        <p className={`${styles.confirmationStatus} ${isCompleted ? styles.confirmationCompleted : confirmationSent ? styles.confirmationSent : styles.confirmationPending}`}>
                          {isCompleted ? 'Servicio completado' : confirmationSent ? 'Confirmación enviada' : 'Confirmación pendiente'}
                        </p>
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
                            {reserva.numero_telefono}
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
                        {cardActionMenu}
                      </div>
                    )}
                    {estadoNormalizado === 'AGENDADO' && !isCompleted && (
                      <div className={`${styles.pendingActions} ${styles.notifyActions}`}>
                        {confirmationWhatsappHref ? (
                          <a
                            href={confirmationWhatsappHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`${styles.notifyButton} ${confirmationSent ? styles.notifyButtonSent : ''}`}
                            onClick={() => { void markConfirmationSent(reserva.id); }}
                          >
                            <MessageCircle size={15} strokeWidth={1.8} />
                            {confirmationSent ? 'Reenviar confirmación' : 'Enviar confirmación'}
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
                        {cardActionMenu}
                      </div>
                    )}
                    {estadoNormalizado === 'RECHAZADO' && (
                      <div className={`${styles.pendingActions} ${styles.notifyActions}`}>
                        {cardActionMenu}
                      </div>
                    )}
                  </article>
                  );
                  })}
                </div>
              )}
            </div>
          </AdminPanel>

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

      {completionDraft && (
        <div
          className={styles.approvalModalOverlay}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeCompletionModal();
          }}
        >
          <section
            className={`${styles.approvalModal} ${styles.completionModal}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="completion-modal-title"
          >
            <div className={styles.modalTop}>
              <div>
                <h2 id="completion-modal-title">¿Esta reserva ya cumplió su proposito?</h2>
                <p>
                  Registra la causa de cierre de esta reserva para darla por completada.
                </p>
              </div>
              <button
                type="button"
                className={styles.modalClose}
                onClick={closeCompletionModal}
                disabled={actionId === completionDraft.reserva.id}
                aria-label="Cerrar modal de completado"
              >
                <XCircle size={20} strokeWidth={1.8} />
              </button>
            </div>

            <div className={styles.modalSummary}>
              <span>
                Cliente: <strong>{completionDraft.reserva.cliente || 'Cliente sin nombre'}</strong>
              </span>
              <span>
                Fecha: <strong>{formatDate(completionDraft.reserva.fecha)}</strong>
              </span>
              <span>
                Horario: <strong>{completionDraft.reserva.hora_desde} - {completionDraft.reserva.hora_hasta}</strong>
              </span>
              <span>
                Local: <strong>{completionDraft.reserva.local}</strong>
              </span>
            </div>

            <div className={styles.completionBody}>
              <div className={styles.completionServicesBlock}>
                <span className={styles.completionSectionLabel}>Servicios</span>
                <div className={styles.completionServicesList}>
                  {completionServiceSummary.visible.map((service) => (
                    <span key={service} className={styles.completionServicePill}>{service}</span>
                  ))}
                  {completionServiceSummary.remaining > 0 && (
                    <span className={styles.serviceOverflowPill}>+{completionServiceSummary.remaining}</span>
                  )}
                </div>
              </div>

              <span className={styles.completionSectionLabel}>Causa/Motivo:</span>
              <div className={styles.reasonOptions} role="radiogroup" aria-label="Causa de completado">
                <label className={`${styles.reasonOption} ${completionDraft.reasonMode === 'DONE' ? styles.reasonOptionActive : ''}`}>
                  <input
                    type="radio"
                    name="completion-reason"
                    checked={completionDraft.reasonMode === 'DONE'}
                    onChange={() => {
                      setCompletionDraft((current) => current ? { ...current, reasonMode: 'DONE' } : current);
                      setCompletionError(null);
                    }}
                  />
                  <span>{COMPLETION_REASON_DONE}</span>
                </label>
                <label className={`${styles.reasonOption} ${completionDraft.reasonMode === 'OTHER' ? styles.reasonOptionActive : ''}`}>
                  <input
                    type="radio"
                    name="completion-reason"
                    checked={completionDraft.reasonMode === 'OTHER'}
                    onChange={() => setCompletionDraft((current) => current ? { ...current, reasonMode: 'OTHER' } : current)}
                  />
                  <span>Otro</span>
                </label>
              </div>

              {completionDraft.reasonMode === 'OTHER' && (
                <label className={`${styles.modalField} ${styles.completionOtherField}`}>
                  Detalle
                  <textarea
                    value={completionDraft.otherReason}
                    onChange={(event) => {
                      setCompletionDraft((current) => current ? { ...current, otherReason: event.target.value } : current);
                      if (completionError) setCompletionError(null);
                    }}
                    placeholder="Describe el motivo de cierre..."
                    autoFocus
                  />
                </label>
              )}

              {completionError && <p className={styles.completionError}>{completionError}</p>}
            </div>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.modalGhost}
                onClick={closeCompletionModal}
                disabled={actionId === completionDraft.reserva.id}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={styles.modalPrimary}
                onClick={markReservaCompleted}
                disabled={actionId === completionDraft.reserva.id}
              >
                <Check size={16} strokeWidth={1.8} />
                {actionId === completionDraft.reserva.id ? 'Marcando...' : 'Marcar como completado'}
              </button>
            </div>
          </section>
        </div>
      )}

      {deleteReserva && (
        <div
          className={styles.approvalModalOverlay}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDeleteModal();
          }}
        >
          <section
            className={`${styles.approvalModal} ${styles.completionModal}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-modal-title"
          >
            <div className={styles.modalTop}>
              <div>
                <h2 id="delete-modal-title">¿Estas segura de eliminar la reserva?</h2>
              </div>
              <button
                type="button"
                className={styles.modalClose}
                onClick={closeDeleteModal}
                disabled={actionId === deleteReserva.id}
                aria-label="Cerrar modal de eliminación"
              >
                <XCircle size={20} strokeWidth={1.8} />
              </button>
            </div>

            <div className={styles.modalSummary}>
              <span>
                Cliente: <strong>{deleteReserva.cliente || 'Cliente sin nombre'}</strong>
              </span>
              <span>
                Fecha: <strong>{formatDate(deleteReserva.fecha)}</strong>
              </span>
              <span>
                Horario: <strong>{deleteReserva.hora_desde} - {deleteReserva.hora_hasta}</strong>
              </span>
              <span>
                Local: <strong>{deleteReserva.local}</strong>
              </span>
            </div>

            <div className={styles.completionBody}>
              <div className={styles.completionServicesBlock}>
                <span className={styles.completionSectionLabel}>Servicios</span>
                <div className={styles.completionServicesList}>
                  {deleteServiceSummary.visible.map((service) => (
                    <span key={service} className={styles.completionServicePill}>{service}</span>
                  ))}
                  {deleteServiceSummary.remaining > 0 && (
                    <span className={styles.serviceOverflowPill}>+{deleteServiceSummary.remaining}</span>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.modalGhost}
                onClick={closeDeleteModal}
                disabled={actionId === deleteReserva.id}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={styles.modalDanger}
                onClick={deleteReservaFromModal}
                disabled={actionId === deleteReserva.id}
              >
                <Trash2 size={16} strokeWidth={1.8} />
                {actionId === deleteReserva.id ? 'Borrando...' : 'Borrar'}
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
              onClick={() => { void markConfirmationSent(notificationReserva.id); }}
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
