'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import gsap from 'gsap';
import {
  AlertCircle,
  Banknote,
  Calendar,
  CalendarCheck,
  Check,
  CheckCircle2,
  Clock,
  Pencil,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  XCircle,
} from 'lucide-react';

import Header from '@/components/AdminHeader/Header';
import { AprobacionReservasTable } from '@/components/AdminReservas';
import { WhatsappIcon } from '@/components/icons/WhatsappIcon';
import { toast } from '@/components/Shared/Toast';
import { AdminButton, AdminPanel, ConfirmDialog, CursorPagination, FormField, FormGrid, FormModal, FormSubmitError, PageHeader, ReasonDialog, RowActionsMenu, StatusBadge, Tabs } from '@/components/AdminConfig';
import { CATEGORIAS_ORDEN } from '@/components/AdminReservationForm/constants';
import { CustomSelect } from '@/components/Custom/CustomSelectAdmin';
import { actualizarEstadoReservaDB, actualizarReservaDB, actualizarReservaNotificadoDB, eliminarReservaDB, getReservasDB } from '@/lib/api/reservas';
import { getLocalesDB, getServiciosDB, type LocalRow, type ServicioRow } from '@/lib/api/servicios';
import { formatCostoServicio } from '@/lib/utils/serviceCost';
import { useAdminLocalScopeState } from '@/lib/auth/useAdminLocalScope';
import { buildClientWhatsappUrl } from '@/lib/utils/whatsapp';
import { phoneValueFrom } from '@/lib/utils/phone';
import { PhoneInput } from '@/components/PhoneInput';
import {
  type EstadoReserva,
  type ReservaBD,
} from '@/types/reserva';
import styles from './page.module.css';
import { PAGE_LIMIT } from '@/lib/api/pagination';
import { useCursorPagination } from '@/lib/hooks/useCursorPagination';

type EstadoGestion = Extract<EstadoReserva, 'PENDIENTE' | 'AGENDADO' | 'RECHAZADO'>;
type EstadoNormalizado = EstadoGestion | 'COMPLETADO';
type EstadoFiltro = EstadoGestion | 'TODOS' | 'POR_COBRAR';
type ApprovalDraft = {
  fecha: string;
  horaDesde: string;
  horaHasta: string;
  telefono: string;
  telefonoE164?: string;
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
  { value: 'TODOS', label: 'Todas' },
  { value: 'PENDIENTE', label: 'Pendientes' },
  { value: 'AGENDADO', label: 'Agendadas' },
  { value: 'RECHAZADO', label: 'Rechazadas' },
  { value: 'POR_COBRAR', label: 'Por cobrar' },
];
const COMPLETION_REASON_DONE = 'Ya se brindo el servicio';
const ALL_LOCALS_FILTER = 'TODOS';
const LOCAL_SCOPE_PENDING = '__LOCAL_SCOPE_PENDING__';

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

const getWhatsappHref = (telefono?: string, telefonoE164?: string) => {
  const message = 'Hola 🌸 Recibimos tu reserva. ¿Qué tratamiento deseas realizar?';
  return buildClientWhatsappUrl(telefonoE164, telefono, message);
};

const getMealLabelByTime = (horaDesde: string) => {
  const [hourRaw = '0'] = horaDesde.split(':');
  const hour = Number(hourRaw);
  return Number.isFinite(hour) && hour < 12 ? 'desayuno' : 'almuerzo';
};

const getConfirmationWhatsappHref = (reserva: ReservaBD) => {
  const tratamiento = reserva.servicio_confirmado || reserva.servicio_solicitado || reserva.servicio || 'Tratamiento confirmado';
  const comidaPrevia = getMealLabelByTime(reserva.hora_desde);
  const message = [
    '*Tu cita ha sido confirmada en Atrevida Fit* 🌸',
    '',
    `*Fecha:* ${formatDate(reserva.fecha)} (${reserva.fecha})`,
    `*Horario:* ${reserva.hora_desde} - ${reserva.hora_hasta}`,
    `*Tratamiento:* ${tratamiento}`,
    `*Sucursal:* ${reserva.local}`,
    '',
    `Ven con el estómago lleno (${comidaPrevia}) y 1 litro de agua.`,
    '',
    'Te esperamos.',
  ].join('\n');

  return buildClientWhatsappUrl(reserva.telefono_e164, reserva.numero_telefono, message);
};

const getDefaultConfirmedService = (reserva: ReservaBD) => {
  return reserva.servicio_confirmado || reserva.servicio_solicitado || reserva.servicio || '';
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

const getReservaAuditMs = (reserva: ReservaBD) => {
  const timestamp = new Date(reserva.actualizado_en || reserva.creado_en || '').getTime();
  return Number.isFinite(timestamp) ? timestamp : getReservaStartMs(reserva);
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


/** Datos de la reserva que se confirman en los diálogos de completar y eliminar. */
function ReservaResumen({ reserva, servicios }: { reserva: ReservaBD; servicios: { visible: string[]; remaining: number } }) {
  return (
    <div className={styles.resumen}>
      <dl className={styles.resumenGrid}>
        <div><dt>Cliente</dt><dd>{reserva.cliente || 'Cliente sin nombre'}</dd></div>
        <div><dt>Fecha</dt><dd>{formatDate(reserva.fecha)}</dd></div>
        <div><dt>Horario</dt><dd>{reserva.hora_desde} - {reserva.hora_hasta}</dd></div>
        <div><dt>Local</dt><dd>{reserva.local}</dd></div>
      </dl>
      <div className={styles.resumenServicios}>
        <span>Servicios</span>
        <ul>
          {servicios.visible.map((service) => <li key={service}>{service}</li>)}
          {servicios.remaining > 0 && <li>+{servicios.remaining}</li>}
        </ul>
      </div>
    </div>
  );
}

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
	const [totalRegistros, setTotalRegistros] = useState<number | null>(null);
  const [conteosEstado, setConteosEstado] = useState<Partial<Record<'PENDIENTE' | 'AGENDADO' | 'RECHAZADO' | 'POR_COBRAR', number>>>({});
  const [cobroSugerido, setCobroSugerido] = useState<ReservaBD | null>(null);
  const [actionId, setActionId] = useState<number | null>(null);
  const [rejectTarget, setRejectTarget] = useState<ReservaBD | null>(null);
  const [approvalReserva, setApprovalReserva] = useState<ReservaBD | null>(null);
  const [approvalDraft, setApprovalDraft] = useState<ApprovalDraft | null>(null);
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const [approvalCatalog, setApprovalCatalog] = useState<{ local: string; servicios: ServicioRow[]; error?: string } | null>(null);
  const [completionDraft, setCompletionDraft] = useState<CompletionDraft | null>(null);
  const [completionError, setCompletionError] = useState<string | null>(null);
  const [deleteReserva, setDeleteReserva] = useState<ReservaBD | null>(null);
  const [notificationReserva, setNotificationReserva] = useState<ReservaBD | null>(null);
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>('PENDIENTE');
  const [searchQuery, setSearchQuery] = useState('');
	const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
	const [localesDisponibles, setLocalesDisponibles] = useState<LocalRow[]>([]);
  const [localFiltro, setLocalFiltro] = useState(ALL_LOCALS_FILTER);
  const [tipoFiltro, setTipoFiltro] = useState('TODOS');
  const [fechaFiltro, setFechaFiltro] = useState('');
  const adminLocalScope = useAdminLocalScopeState();
  const scopedLocalName = adminLocalScope.workplace?.nombre_local ?? '';
  const defaultLocalFiltro = scopedLocalName || ALL_LOCALS_FILTER;
  const effectiveLocalFiltro = scopedLocalName || (adminLocalScope.ready ? localFiltro : LOCAL_SCOPE_PENDING);
	const vigenteFecha = useMemo(() => getDateISOWithOffset(0), []);
	const vigenteHora = useMemo(() => getCurrentTimeHHMM(), []);
	const aplicaVigenciaPendientes = estadoFiltro === 'PENDIENTE' || estadoFiltro === 'TODOS';
	const pagination = useCursorPagination(`${effectiveLocalFiltro}|${estadoFiltro}|${tipoFiltro}|${fechaFiltro}|${debouncedSearchQuery}|${aplicaVigenciaPendientes ? `${vigenteFecha}|${vigenteHora}` : ''}`);
	const { cursor: paginationCursor, requestRevision, shouldIncludeTotal, setMetadata: setPaginationMetadata } = pagination;
  const paginationRequestRef = useRef(0);
  const paginationControllerRef = useRef<AbortController | null>(null);

	useEffect(() => {
		const timer = window.setTimeout(() => setDebouncedSearchQuery(searchQuery.trim()), 300);
		return () => window.clearTimeout(timer);
	}, [searchQuery]);

	useEffect(() => {
		if (!adminLocalScope.ready) return;
		let cancelled = false;
		void getLocalesDB()
			.then((response) => {
				if (!cancelled) setLocalesDisponibles((response.data?.locales ?? []).filter((local) => local.activo !== false));
			})
			.catch(() => {
				if (!cancelled) setLocalesDisponibles([]);
			});
		return () => { cancelled = true; };
	}, [adminLocalScope.ready]);

  const fetchReservas = useCallback(async () => {
    void requestRevision;
	if (!adminLocalScope.ready) return;
	paginationControllerRef.current?.abort();
	const controller = new AbortController();
	paginationControllerRef.current = controller;
	const requestId = ++paginationRequestRef.current;
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
		local: effectiveLocalFiltro !== ALL_LOCALS_FILTER && effectiveLocalFiltro !== LOCAL_SCOPE_PENDING ? effectiveLocalFiltro : undefined,
		estado: estadoFiltro === 'POR_COBRAR' ? 'COMPLETADO' : estadoFiltro !== 'TODOS' ? estadoFiltro : undefined,
		estado_cobro: estadoFiltro === 'POR_COBRAR' ? 'POR_COBRAR' : undefined,
		fecha: fechaFiltro || undefined,
		tipo: tipoFiltro !== 'TODOS' ? tipoFiltro.toLowerCase() as 'mesa' | 'bicicleta' : undefined,
		busqueda: debouncedSearchQuery || undefined,
		vigente_fecha: aplicaVigenciaPendientes ? vigenteFecha : undefined,
		vigente_hora: aplicaVigenciaPendientes ? vigenteHora : undefined,
		vigencia_solo_pendientes: estadoFiltro === 'TODOS' ? true : undefined,
		limit: PAGE_LIMIT,
		cursor: paginationCursor,
		include_total: shouldIncludeTotal(),
      }, controller.signal);
	  if (requestId !== paginationRequestRef.current) return;
      const nextReservas = response.data?.reservas ?? [];
	  setPaginationMetadata(response.data?.paginacion);
	  if (response.data?.paginacion?.total_registros !== undefined) {
		setTotalRegistros(response.data.paginacion.total_registros);
	  }
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
	  if (controller.signal.aborted) return;
	  if (requestId !== paginationRequestRef.current) return;
      setError(fetchError instanceof Error ? fetchError.message : 'No se pudieron cargar las reservas');
      if (isInitialRequest) setReservas([]);
    } finally {
	  if (requestId === paginationRequestRef.current) {
		setInitialLoading(false);
		setIsFetching(false);
	  }
    }
  }, [adminLocalScope.ready, aplicaVigenciaPendientes, debouncedSearchQuery, effectiveLocalFiltro, estadoFiltro, fechaFiltro, tipoFiltro, vigenteFecha, vigenteHora, paginationCursor, requestRevision, shouldIncludeTotal, setPaginationMetadata]);

	useEffect(() => () => {
		paginationRequestRef.current += 1;
		paginationControllerRef.current?.abort();
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
      toast.error(updateError instanceof Error ? updateError.message : 'No se pudo marcar la reserva como notificada.');
    }
  }, []);

  const preserveScrollPosition = useCallback((callback: () => void) => {
    preservedScrollYRef.current = window.scrollY;
    callback();
  }, []);

  const localFilterOptions = useMemo(
    () => !adminLocalScope.ready
      ? [{ value: LOCAL_SCOPE_PENDING, label: 'Cargando local...' }]
      : scopedLocalName
      ? [{ value: scopedLocalName, label: scopedLocalName }]
      : [
          { value: ALL_LOCALS_FILTER, label: 'Todas' },
          ...localesDisponibles.map((local) => ({ value: local.nombre, label: local.nombre })),
        ],
    [adminLocalScope.ready, localesDisponibles, scopedLocalName],
  );

  const tipoFilterOptions = useMemo(() => [
    { value: 'TODOS', label: 'Todos' },
    { value: 'mesa', label: TIPO_LABELS.M },
    { value: 'bicicleta', label: TIPO_LABELS.B },
  ], []);

  const reservasVisibles = useMemo(() => {
    if (estadoFiltro !== 'AGENDADO') {
      return reservas;
    }

    return [...reservas].sort((a, b) => {
      const stampA = sortStampByReservaIdRef.current.get(a.id) ?? getReservaAuditMs(a);
      const stampB = sortStampByReservaIdRef.current.get(b.id) ?? getReservaAuditMs(b);
      return stampB - stampA;
    });
  }, [estadoFiltro, reservas]);

  const hasAdvancedFilters = Boolean(
    searchQuery.trim()
    || (adminLocalScope.ready && effectiveLocalFiltro !== defaultLocalFiltro)
    || tipoFiltro !== 'TODOS'
    || fechaFiltro,
  );
  const reservasVisiblesSignature = useMemo(
    () => reservasVisibles.map((reserva) => `${reserva.id}:${reserva.estado}:${reserva.servicio_confirmado ?? ''}:${reserva.notificado ? '1' : '0'}`).join('|'),
    [reservasVisibles],
  );

  const resetFilters = () => preserveScrollPosition(() => {
    setSearchQuery('');
    setLocalFiltro(defaultLocalFiltro);
    setTipoFiltro('TODOS');
    setFechaFiltro('');
  });

  // Conteo de cada pestaña: independiente de la pestaña activa, con los mismos filtros de la lista.
  useEffect(() => {
    void requestRevision;
    if (!adminLocalScope.ready) return;
    const controller = new AbortController();
    const base = {
      fecha_desde: getDateISOWithOffset(-14),
      local: effectiveLocalFiltro !== ALL_LOCALS_FILTER && effectiveLocalFiltro !== LOCAL_SCOPE_PENDING ? effectiveLocalFiltro : undefined,
      fecha: fechaFiltro || undefined,
      tipo: tipoFiltro !== 'TODOS' ? tipoFiltro.toLowerCase() as 'mesa' | 'bicicleta' : undefined,
      busqueda: debouncedSearchQuery || undefined,
      limit: 1,
      include_total: true,
    };
    (['PENDIENTE', 'AGENDADO', 'RECHAZADO', 'POR_COBRAR'] as const).forEach((estado) => {
      getReservasDB({
        ...base,
        ...(estado === 'POR_COBRAR' ? { estado: 'COMPLETADO' as const, estado_cobro: 'POR_COBRAR' as const } : { estado }),
        ...(estado === 'PENDIENTE' && { vigente_fecha: vigenteFecha, vigente_hora: vigenteHora }),
      }, controller.signal)
        .then((response) => {
          const total = response.data?.paginacion?.total_registros;
          if (!controller.signal.aborted && total !== undefined) {
            setConteosEstado((current) => ({ ...current, [estado]: total }));
          }
        })
        .catch(() => { /* el contador es informativo: si falla se conserva el último valor */ });
    });
    return () => controller.abort();
  }, [adminLocalScope.ready, debouncedSearchQuery, effectiveLocalFiltro, fechaFiltro, requestRevision, tipoFiltro, vigenteFecha, vigenteHora]);

  const approvalServiceGroups = useMemo(() => {
    if (!approvalReserva || approvalCatalog?.local !== approvalReserva.local) return [];
    const categorias = new Map<string, ServicioRow[]>();
    for (const servicio of approvalCatalog.servicios) {
      const categoria = servicio.categoria || 'Otros';
      if (!categorias.has(categoria)) categorias.set(categoria, []);
      categorias.get(categoria)!.push(servicio);
    }
    const orden = [...CATEGORIAS_ORDEN, ...Array.from(categorias.keys()).filter(c => !(CATEGORIAS_ORDEN as readonly string[]).includes(c))];
    return orden.filter(c => categorias.has(c)).map(c => ({
      label: c,
      options: categorias.get(c)!.map(servicio => ({
        value: servicio.nombre,
        label: `${servicio.nombre} — ${String(servicio.tiempo || '')} — ${formatCostoServicio(servicio)}`,
      })),
    }));
  }, [approvalReserva, approvalCatalog]);

  const approvalLocal = approvalReserva?.local;
  const approvalId = approvalReserva?.id;
  useEffect(() => {
    if (!approvalLocal) return;
    let active = true;
    void getServiciosDB({ local: approvalLocal })
      .then(response => {
        if (active) setApprovalCatalog({ local: approvalLocal, servicios: (response.data?.servicios ?? []).filter(s => s.activo !== false) });
      })
      .catch(() => {
        if (active) setApprovalCatalog({ local: approvalLocal, servicios: [], error: 'No se pudo cargar el catálogo de servicios. Cierra el formulario y vuelve a abrirlo.' });
      });
    return () => { active = false; };
  }, [approvalLocal, approvalId]);

  const completionServiceSummary = useMemo(
    () => completionDraft ? getReservaServiceSummary(completionDraft.reserva) : { visible: [], remaining: 0 },
    [completionDraft],
  );
  const deleteServiceSummary = useMemo(
    () => deleteReserva ? getReservaServiceSummary(deleteReserva) : { visible: [], remaining: 0 },
    [deleteReserva],
  );

  const openApprovalModal = (reserva: ReservaBD) => {
    setApprovalCatalog(null);
    const phone = phoneValueFrom(reserva.telefono_e164 || reserva.numero_telefono);
    setApprovalReserva(reserva);
    setApprovalDraft({
      fecha: reserva.fecha,
      horaDesde: reserva.hora_desde,
      horaHasta: reserva.hora_hasta,
      telefono: phone.nationalNumber,
      telefonoE164: phone.e164,
      notas: reserva.notas ?? '',
      servicioConfirmado: getDefaultConfirmedService(reserva),
    });
    setApprovalError(null);
  };

  const closeApprovalModal = useCallback(() => {
    if (actionId) return;
    setApprovalReserva(null);
    setApprovalDraft(null);
    setApprovalError(null);
  }, [actionId]);

  const openCompletionModal = (reserva: ReservaBD) => {
    setCompletionDraft({
      reserva,
      reasonMode: 'DONE',
      otherReason: '',
    });
    setCompletionError(null);
  };

  const closeCompletionModal = useCallback(() => {
    if (actionId) return;
    setCompletionDraft(null);
    setCompletionError(null);
  }, [actionId]);

  const openDeleteModal = (reserva: ReservaBD) => {
    setDeleteReserva(reserva);
  };

  const closeDeleteModal = useCallback(() => {
    if (actionId) return;
    setDeleteReserva(null);
  }, [actionId]);

  const deleteReservaFromModal = async () => {
    if (!deleteReserva) return;

    const reservaId = deleteReserva.id;
    setActionId(reservaId);

    try {
      await eliminarReservaDB(reservaId);
      sortStampByReservaIdRef.current.delete(reservaId);
      setReservas((current) => current.filter((item) => item.id !== reservaId));
      setNotificationReserva((current) => current?.id === reservaId ? null : current);
      setDeleteReserva(null);
      toast.success(`Reserva #${reservaId} eliminada.`);
      pagination.resetAfterMutation();
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : 'No se pudo eliminar la reserva.');
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
      toast.success(`Reserva #${reservaId} marcada como completada.`);
      // Si la paga un paquete no hay nada que cobrar; si no, se sugiere cobrarla (sin obligar).
      if (!completionDraft.reserva.plan_id) setCobroSugerido({ ...completionDraft.reserva, estado: 'COMPLETADO', estado_cobro: 'POR_COBRAR' });
      pagination.resetAfterMutation();
    } catch (updateError) {
      toast.error(updateError instanceof Error ? updateError.message : 'No se pudo completar la reserva.');
    } finally {
      setActionId(null);
    }
  };

  /** Rechaza con la causa pedida en el diálogo; si falla, el error vuelve al diálogo para que no se cierre. */
  const rejectReserva = async (reserva: ReservaBD, causa: string) => {
    setActionId(reserva.id);

    try {
      await actualizarEstadoReservaDB({ id: reserva.id, estado: 'RECHAZADO', causa });

      setReservas((current) =>
        current.map((item) => item.id === reserva.id ? { ...item, estado: 'RECHAZADO' } : item),
      );
      toast.success('Reserva rechazada correctamente.');
      pagination.resetAfterMutation();
    } finally {
      setActionId(null);
    }
  };

  const approveReservaFromModal = async () => {
    if (!approvalReserva || !approvalDraft) return;

    const confirmedService = approvalCatalog?.local === approvalReserva.local
      ? approvalCatalog.servicios.find(servicio => servicio.nombre === approvalDraft.servicioConfirmado)
      : undefined;

    if (!confirmedService) {
      setApprovalError('Selecciona el servicio confirmado para agendar la reserva.');
      return;
    }

    const rawDigits = approvalDraft.telefono.replace(/\D/g, '');
    const cleanPhone = rawDigits;
    const originalPhone = phoneValueFrom(approvalReserva.telefono_e164 || approvalReserva.numero_telefono);
    const phoneChanged = cleanPhone !== originalPhone.nationalNumber.replace(/\D/g, '')
      || approvalDraft.telefonoE164 !== originalPhone.e164;
    if (phoneChanged && cleanPhone && !approvalDraft.telefonoE164) {
      setApprovalError('El número no es válido para el país seleccionado.');
      return;
    }
    const mismoServicio = approvalReserva.servicio_confirmado === confirmedService.nombre || (!approvalReserva.servicio_confirmado && approvalReserva.servicio === confirmedService.nombre);
    const precio = mismoServicio && approvalReserva.precio != null
      ? approvalReserva.precio
      : confirmedService.costo_variable === true ? undefined : Number(confirmedService.costo) || 0;
    const updateData = {
      id: approvalReserva.id,
      local: approvalReserva.local,
      ...(approvalDraft.fecha !== approvalReserva.fecha && { nueva_fecha: approvalDraft.fecha }),
      ...(approvalDraft.horaDesde !== approvalReserva.hora_desde && { nueva_hora_desde: approvalDraft.horaDesde }),
      ...(approvalDraft.horaHasta !== approvalReserva.hora_hasta && { nueva_hora_hasta: approvalDraft.horaHasta }),
      ...(phoneChanged && cleanPhone && {
        nuevo_numero_telefono: cleanPhone,
        nuevo_telefono_e164: approvalDraft.telefonoE164,
      }),
      ...(approvalDraft.notas !== (approvalReserva.notas ?? '') && { nuevas_notas: approvalDraft.notas }),
      nuevo_estado: 'AGENDADO' as const,
      nuevo_servicio_confirmado: approvalDraft.servicioConfirmado,
      ...(precio !== undefined ? { nuevo_precio: precio } : {}),
      nuevo_tipo: confirmedService.tipoEspacio === 'B' ? 'B' as const : 'M' as const,
    };

    setActionId(approvalReserva.id);
    setApprovalError(null);

    try {
      // El backend aplica el horario final, servicio, precio, tipo y estado
      // AGENDADO en una sola transacción, incluida la comprobación de cupo.
      await actualizarReservaDB(updateData);

      const updatedReserva: ReservaBD = {
        ...approvalReserva,
        estado: 'AGENDADO',
        fecha: approvalDraft.fecha,
        hora_desde: approvalDraft.horaDesde,
        hora_hasta: approvalDraft.horaHasta,
        numero_telefono: cleanPhone,
        telefono_e164: approvalDraft.telefonoE164,
        notas: approvalDraft.notas,
        servicio_confirmado: confirmedService.nombre,
        precio,
        costo_variable: mismoServicio && approvalReserva.costo_variable != null ? approvalReserva.costo_variable : confirmedService.costo_variable === true,
        tipo: confirmedService.tipoEspacio === 'B' ? 'B' : 'M',
        notificado: false,
      };
      sortStampByReservaIdRef.current.set(updatedReserva.id, Date.now());

      setReservas((current) =>
        current.map((item) => item.id === approvalReserva.id ? updatedReserva : item),
      );

      setApprovalReserva(null);
      setApprovalDraft(null);
      setNotificationReserva(updatedReserva);
      toast.success(`Reserva #${approvalReserva.id} agendada correctamente.`);
      pagination.resetAfterMutation();
    } catch (updateError) {
      const message = updateError instanceof Error ? updateError.message : 'No se pudo agendar la reserva.';
      setApprovalError(message.replace(/^capacidad de reserva no disponible:\s*/i, ''));
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
  }, [effectiveLocalFiltro, estadoFiltro, fechaFiltro, reservas.length, reservasVisibles.length, searchQuery, tipoFiltro]);

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

  const renderReservaActions = (reserva: ReservaBD) => {
    const estado = normalizeEstado(reserva.estado);
    const isCompleted = estado === 'COMPLETADO';
    const porCobrar = isCompleted && reserva.estado_cobro === 'POR_COBRAR';
    const confirmationSent = Boolean(reserva.notificado);
    const whatsappHref = getWhatsappHref(reserva.numero_telefono, reserva.telefono_e164);
    const confirmationWhatsappHref = getConfirmationWhatsappHref(reserva);
    const canMarkCompleted = estado === 'AGENDADO' && confirmationSent;
    const busy = actionId === reserva.id;

    return (
      <>
        {estado === 'PENDIENTE' && (
          <AdminButton size="xs" icon={<Check size={13} strokeWidth={2} />} onClick={() => openApprovalModal(reserva)} disabled={busy}>
            Aprobar
          </AdminButton>
        )}
        {estado === 'AGENDADO' && (
          <AdminButton
            size="xs"
            variant={confirmationSent ? 'secondary' : 'primary'}
            icon={<WhatsappIcon size={13} />}
            href={confirmationWhatsappHref ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => { void markConfirmationSent(reserva.id); }}
            disabled={!confirmationWhatsappHref}
          >
            {!confirmationWhatsappHref ? 'Sin teléfono' : confirmationSent ? 'Reenviar' : 'Confirmar'}
          </AdminButton>
        )}
        <RowActionsMenu
          ariaLabel={`Acciones de reserva ${reserva.id}`}
          disabled={busy}
          actions={[
            ...(porCobrar ? [{
              label: 'Cobrar',
              icon: <Banknote size={14} strokeWidth={1.8} />,
              onClick: () => router.push(`/atrevida-gestion/caja?reserva=${reserva.id}`),
            }] : []),
            ...(estado === 'PENDIENTE' && whatsappHref ? [{
              label: 'Contactar por WhatsApp',
              icon: <WhatsappIcon size={14} />,
              onClick: () => { window.open(whatsappHref, '_blank', 'noopener,noreferrer'); },
            }] : []),
            ...(canMarkCompleted ? [{
              label: 'Marcar como completada',
              icon: <CheckCircle2 size={14} strokeWidth={1.8} />,
              onClick: () => openCompletionModal(reserva),
            }] : []),
            ...(!isCompleted ? [{
              label: 'Editar o reprogramar',
              icon: <Pencil size={14} strokeWidth={1.8} />,
              onClick: () => router.push(`/atrevida-gestion/reservas/editar/${reserva.id}`),
            }] : []),
            ...(estado === 'PENDIENTE' ? [{
              label: 'Rechazar',
              icon: <XCircle size={14} strokeWidth={1.8} />,
              variant: 'danger' as const,
              onClick: () => setRejectTarget(reserva),
            }] : []),
            {
              label: 'Eliminar reserva',
              icon: <Trash2 size={14} strokeWidth={1.8} />,
              variant: 'danger' as const,
              onClick: () => openDeleteModal(reserva),
            },
          ]}
        />
      </>
    );
  };

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
                  <AdminButton variant="secondary" href="/atrevida-gestion/reservas/proximas" icon={<Clock size={16} strokeWidth={1.8} />}>
                    Citas próximas
                  </AdminButton>
                  <AdminButton
                    variant="secondary"
                    icon={<RefreshCw size={16} strokeWidth={1.8} className={isFetching ? styles.spinIcon : ''} />}
                    onClick={() => preserveScrollPosition(() => { void fetchReservas(); })}
                    disabled={initialLoading || isFetching}
                  >
                    {isFetching ? 'Actualizando' : 'Actualizar'}
                  </AdminButton>
                </div>
              }
            />
          </div>

          <AdminPanel>
            <div className={styles.boardHeader}>
              <div>
                <h2>{estadoFiltro === 'TODOS' ? 'Todas las solicitudes' : `Reservas ${ESTADO_OPTIONS.find((option) => option.value === estadoFiltro)?.label.toLowerCase()}`}</h2>
              </div>
              <StatusBadge>{totalRegistros ?? reservasVisibles.length} resultado{(totalRegistros ?? reservasVisibles.length) === 1 ? '' : 's'}</StatusBadge>
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
                  value={effectiveLocalFiltro}
                  onChange={(value) => preserveScrollPosition(() => setLocalFiltro(scopedLocalName || value))}
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

              <AdminButton
                variant="secondary"
                icon={<SlidersHorizontal size={15} strokeWidth={1.8} />}
                onClick={resetFilters}
                disabled={!hasAdvancedFilters}
              >
                Limpiar
              </AdminButton>
            </div>

            <Tabs
              ariaLabel="Filtrar reservas por estado"
              active={estadoFiltro}
              onChange={(value) => preserveScrollPosition(() => setEstadoFiltro(value))}
              tabs={ESTADO_OPTIONS.map((option) => ({
                key: option.value,
                label: option.label,
                count: option.value === 'TODOS' ? undefined : conteosEstado[option.value],
              }))}
            />

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
                <div ref={cardsGridRef}>
                  <AprobacionReservasTable
                    reservas={renderedReservas}
                    showLocal={effectiveLocalFiltro === ALL_LOCALS_FILTER}
                    renderActions={renderReservaActions}
                  />
                </div>
              )}
			  {!initialLoading && !error && (
				<CursorPagination page={pagination.page} totalPages={pagination.totalPages} hasNext={pagination.hasNext} loading={isFetching} onPrevious={pagination.previous} onNext={pagination.next} />
			  )}
            </div>
          </AdminPanel>

        </div>
      </main>

      <ReasonDialog
        isOpen={rejectTarget !== null}
        title="Rechazar reserva"
        message={`La causa queda registrada en la reserva de ${rejectTarget?.cliente || `#${rejectTarget?.id}`}.`}
        confirmLabel="Rechazar"
        onConfirm={(causa) => (rejectTarget ? rejectReserva(rejectTarget, causa) : Promise.resolve())}
        onClose={() => setRejectTarget(null)}
      />

      {approvalReserva && approvalDraft && (
        <FormModal
          isOpen
          size="lg"
          title={`Aprobar reserva #${approvalReserva.id}`}
          onClose={closeApprovalModal}
          onSubmit={approveReservaFromModal}
          loading={actionId === approvalReserva.id}
          submitDisabled={approvalCatalog?.local !== approvalReserva.local || !!approvalCatalog.error || approvalCatalog.servicios.length === 0}
          submitLabel={approvalError ? 'Reintentar aprobación' : 'Aprobar y agendar'}
        >
          <p className={styles.dialogLead}>
            Confirma los datos de la solicitud y el servicio definitivo antes de pasarla a agenda.
            {' '}Solicitado: <strong>{approvalReserva.servicio_solicitado || approvalReserva.servicio || 'Por definir'}</strong>
            {approvalReserva.servicio_confirmado && <> · Confirmado previo: <strong>{approvalReserva.servicio_confirmado}</strong></>}
          </p>

          <FormGrid>
            <FormField label="Cliente" htmlFor="approval-cliente">
              <input id="approval-cliente" value={approvalReserva.cliente || 'Cliente sin nombre'} disabled />
            </FormField>
            <FormField label="Local" htmlFor="approval-local">
              <input id="approval-local" value={approvalReserva.local} disabled />
            </FormField>
            <FormField label="Teléfono">
              <PhoneInput
                value={approvalDraft.telefono}
                e164={approvalDraft.telefonoE164}
                onChange={(phone) => {
                  setApprovalError(null);
                  setApprovalDraft((current) => current ? {
                    ...current,
                    telefono: phone.nationalNumber,
                    telefonoE164: phone.e164,
                  } : current);
                }}
                placeholder="77777777"
              />
            </FormField>
            <FormField label="Fecha" htmlFor="approval-fecha">
              <input
                id="approval-fecha"
                type="date"
                value={approvalDraft.fecha}
                onChange={(event) => {
                  setApprovalError(null);
                  setApprovalDraft((current) => current ? { ...current, fecha: event.target.value } : current);
                }}
              />
            </FormField>
            <FormField label="Hora inicio" htmlFor="approval-hora-desde">
              <input
                id="approval-hora-desde"
                type="time"
                value={approvalDraft.horaDesde}
                onChange={(event) => {
                  setApprovalError(null);
                  setApprovalDraft((current) => current ? { ...current, horaDesde: event.target.value } : current);
                }}
              />
            </FormField>
            <FormField label="Hora fin" htmlFor="approval-hora-hasta">
              <input
                id="approval-hora-hasta"
                type="time"
                value={approvalDraft.horaHasta}
                onChange={(event) => {
                  setApprovalError(null);
                  setApprovalDraft((current) => current ? { ...current, horaHasta: event.target.value } : current);
                }}
              />
            </FormField>
            <FormField label="Servicio definitivo" labelId="approval-servicio-lbl" wide error={approvalCatalog?.error || undefined}>
              <CustomSelect
                value={approvalDraft.servicioConfirmado}
                onChange={(value) => {
                  setApprovalError(null);
                  setApprovalDraft((current) => current ? { ...current, servicioConfirmado: value } : current);
                }}
                groups={approvalServiceGroups}
                placeholder={approvalCatalog?.local === approvalReserva.local ? 'Seleccionar servicio' : 'Cargando servicios...'}
                hasError={false}
              />
            </FormField>
            <FormField label="Notas" htmlFor="approval-notas" wide>
              <textarea
                id="approval-notas"
                value={approvalDraft.notas}
                onChange={(event) => {
                  setApprovalError(null);
                  setApprovalDraft((current) => current ? { ...current, notas: event.target.value } : current);
                }}
                placeholder="Añade una observación para el equipo si hace falta."
              />
            </FormField>
          </FormGrid>

          <FormSubmitError message={approvalError ?? undefined} />
        </FormModal>
      )}

      {completionDraft && (
        <FormModal
          isOpen
          title="¿Esta reserva ya cumplió su propósito?"
          onClose={closeCompletionModal}
          onSubmit={markReservaCompleted}
          loading={actionId === completionDraft.reserva.id}
          submitLabel="Marcar como completada"
        >
          <ReservaResumen reserva={completionDraft.reserva} servicios={completionServiceSummary} />

          <fieldset className={styles.reasonGroup}>
            <legend>Causa del cierre</legend>
            {([['DONE', COMPLETION_REASON_DONE], ['OTHER', 'Otro']] as const).map(([mode, label]) => (
              <label
                key={mode}
                className={`${styles.reasonOption} ${completionDraft.reasonMode === mode ? styles.reasonOptionActive : ''}`}
              >
                <input
                  type="radio"
                  name="completion-reason"
                  checked={completionDraft.reasonMode === mode}
                  onChange={() => {
                    setCompletionDraft((current) => current ? { ...current, reasonMode: mode } : current);
                    setCompletionError(null);
                  }}
                />
                <span>{label}</span>
              </label>
            ))}
          </fieldset>

          {completionDraft.reasonMode === 'OTHER' && (
            <FormField label="Detalle" htmlFor="completion-detalle" required error={completionError ?? undefined}>
              <textarea
                id="completion-detalle"
                value={completionDraft.otherReason}
                onChange={(event) => {
                  setCompletionDraft((current) => current ? { ...current, otherReason: event.target.value } : current);
                  if (completionError) setCompletionError(null);
                }}
                placeholder="Describe el motivo de cierre..."
                autoFocus
              />
            </FormField>
          )}
        </FormModal>
      )}

      <ConfirmDialog
        isOpen={cobroSugerido !== null}
        title="Reserva completada: ¿cobrarla ahora?"
        message={cobroSugerido && (
          <>
            <p style={{ margin: '0 0 0.6rem' }}>
              La reserva #{cobroSugerido.id} de <strong>{cobroSugerido.cliente || 'cliente sin nombre'}</strong> ya se brindó pero todavía no tiene cobro registrado.
            </p>
            <p style={{ margin: 0 }}>
              Si lo dejas para después, aparecerá en la pestaña <strong>Por cobrar</strong> para que no se olvide.
            </p>
          </>
        )}
        confirmLabel="Cobrar ahora"
        cancelLabel="Después"
        onConfirm={() => {
          const id = cobroSugerido?.id;
          setCobroSugerido(null);
          if (id) router.push(`/atrevida-gestion/caja?reserva=${id}`);
        }}
        onClose={() => setCobroSugerido(null)}
      />

      <ConfirmDialog
        isOpen={!!deleteReserva}
        title="¿Seguro que quieres eliminar la reserva?"
        message={deleteReserva && <ReservaResumen reserva={deleteReserva} servicios={deleteServiceSummary} />}
        confirmLabel="Eliminar reserva"
        danger
        loading={actionId === deleteReserva?.id}
        onConfirm={deleteReservaFromModal}
        onClose={closeDeleteModal}
      />

      {notificationReserva && (
        <div className={styles.confirmationPrompt} role="status" aria-live="polite">
          <div className={styles.promptText}>
            <span>Reserva agendada</span>
            <strong>Envía la confirmación por WhatsApp al cliente.</strong>
          </div>
          <AdminButton
            icon={<WhatsappIcon size={16} />}
            href={getConfirmationWhatsappHref(notificationReserva) ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => { void markConfirmationSent(notificationReserva.id); }}
            disabled={!getConfirmationWhatsappHref(notificationReserva)}
          >
            {getConfirmationWhatsappHref(notificationReserva) ? 'Enviar WhatsApp' : 'Sin teléfono'}
          </AdminButton>
          <AdminButton
            variant="secondary"
            icon={<XCircle size={18} strokeWidth={1.8} />}
            onClick={() => setNotificationReserva(null)}
            aria-label="Ocultar aviso de confirmación"
          />
        </div>
      )}
    </div>
  );
}
