'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import gsap from 'gsap';
import {
  AlertCircle,
  ClipboardCheck,
  CalendarCheck,
  Check,
  RefreshCw,
} from 'lucide-react';

import { AprobacionReservasTable } from '@/components/AdminReservas';
import { ReservaAcciones } from './ReservaAcciones';
import { WhatsappIcon } from '@/components/icons/WhatsappIcon';
import { toast } from '@/components/Shared/Toast';
import { AdminButton, AdminPanel, CursorPagination, FilterBar, RangoFechasFiltro } from '@/components/AdminConfig';
import { CustomSelect } from '@/components/Custom/CustomSelectAdmin';
import { actualizarReservaNotificadoDB, getReservasDB } from '@/lib/api/reservas';
import { getLocalesDB, type LocalRow } from '@/lib/api/servicios';
import { useAdminLocalScopeState } from '@/lib/auth/useAdminLocalScope';
import { buildConfirmacionWhatsappHref } from '@/lib/utils/whatsapp';
import {
  type EstadoReserva,
  type ReservaBD,
} from '@/types/reserva';
import styles from './BandejaReservas.module.css';
import { PAGE_LIMIT } from '@/lib/api/pagination';
import { useCursorPagination } from '@/lib/hooks/useCursorPagination';
import { AtencionFormModal } from '@/components/AdminAtenciones/AtencionFormModal';

type EstadoGestion = Extract<EstadoReserva, 'PENDIENTE' | 'AGENDADO' | 'RECHAZADO'>;
type EstadoNormalizado = EstadoGestion | 'COMPLETADO';
type Cuando = 'PROXIMAS' | 'PASADAS' | 'TODAS' | 'RANGO';
type Atajo = Exclude<Cuando, 'RANGO'>;
type EstadoFiltro = EstadoGestion | 'TODOS' | 'COMPLETADO';
const ESTADO_OPTIONS: Array<{ value: EstadoFiltro; label: string }> = [
  { value: 'TODOS', label: 'Todas' },
  { value: 'PENDIENTE', label: 'Pendientes' },
  { value: 'AGENDADO', label: 'Agendadas' },
  { value: 'COMPLETADO', label: 'Completadas' },
  { value: 'RECHAZADO', label: 'Rechazadas' },
];
const CUANDO_ATAJOS: Array<{ value: Atajo; label: string }> = [
  { value: 'PROXIMAS', label: 'Próximas' },
  { value: 'PASADAS', label: 'Pasadas' },
  { value: 'TODAS', label: 'Todas' },
];
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

const getDateISOWithOffset = (daysOffset: number) => {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toLocaleDateString('en-CA');
};

const getCurrentTimeHHMM = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};


/**
 * Lista de reservas con las acciones del día a día: aprobar, rechazar, confirmar por WhatsApp y atender.
 * Por defecto muestra las proximas (de hoy en adelante, la mas cercana primero); Pasadas y Todas se piden a mano.
 * Los filtros son independientes: cambiar uno no mueve los demas.
 */
export function BandejaReservas() {
  const router = useRouter();
  const pageRef = useRef<HTMLDivElement>(null);
  const cardsGridRef = useRef<HTMLDivElement>(null);
  const hasLoadedRef = useRef(false);
  const hasRenderedListRef = useRef(false);
  const preservedScrollYRef = useRef<number | null>(null);

  const [reservas, setReservas] = useState<ReservaBD[]>([]);
  const [reservaAtencion, setReservaAtencion] = useState<ReservaBD | null>(null);
  const [renderedReservas, setRenderedReservas] = useState<ReservaBD[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>('TODOS');
  const [searchQuery, setSearchQuery] = useState('');
	const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
	const [localesDisponibles, setLocalesDisponibles] = useState<LocalRow[]>([]);
  const [localFiltro, setLocalFiltro] = useState(ALL_LOCALS_FILTER);
  const [tipoFiltro, setTipoFiltro] = useState('TODOS');
  const [cuando, setCuando] = useState<Cuando>('PROXIMAS');
  const [rangoDesde, setRangoDesde] = useState('');
  const [rangoHasta, setRangoHasta] = useState('');
  const adminLocalScope = useAdminLocalScopeState();
  const scopedLocalName = adminLocalScope.workplace?.nombre_local ?? '';
  const effectiveLocalFiltro = scopedLocalName || (adminLocalScope.ready ? localFiltro : LOCAL_SCOPE_PENDING);
	const vigenteFecha = useMemo(() => getDateISOWithOffset(0), []);
	const vigenteHora = useMemo(() => getCurrentTimeHHMM(), []);
	const aplicaVigenciaPendientes = estadoFiltro === 'PENDIENTE' || estadoFiltro === 'TODOS';
	const pagination = useCursorPagination(`${effectiveLocalFiltro}|${estadoFiltro}|${tipoFiltro}|${cuando}|${rangoDesde}|${rangoHasta}|${debouncedSearchQuery}|${aplicaVigenciaPendientes ? `${vigenteFecha}|${vigenteHora}` : ''}`);
	const { cursor: paginationCursor, requestRevision, shouldIncludeTotal, setMetadata: setPaginationMetadata } = pagination;
  const paginationRequestRef = useRef(0);
  const paginationControllerRef = useRef<AbortController | null>(null);

	// Aprobaciones del menu llega con ?vista=pendientes: se abre ya filtrada por pendientes.
	// Al volver a Reservas (sin el parametro) se quita ese filtro.
	const vistaParam = useSearchParams().get('vista');
	const vistaPrevRef = useRef<string | null>(null);
	useEffect(() => {
		if (vistaParam === 'pendientes') setEstadoFiltro('PENDIENTE');
		else if (vistaPrevRef.current === 'pendientes') setEstadoFiltro('TODOS');
		vistaPrevRef.current = vistaParam;
	}, [vistaParam]);

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
        fecha_desde: cuando === 'PROXIMAS' ? vigenteFecha : cuando === 'RANGO' ? rangoDesde : undefined,
        fecha_hasta: cuando === 'PASADAS' ? getDateISOWithOffset(-1) : cuando === 'RANGO' ? rangoHasta : undefined,
        ordenar_por: 'fecha',
        sentido: cuando === 'PASADAS' ? 'desc' : 'asc',
		local: effectiveLocalFiltro !== ALL_LOCALS_FILTER && effectiveLocalFiltro !== LOCAL_SCOPE_PENDING ? effectiveLocalFiltro : undefined,
		estado: estadoFiltro !== 'TODOS' ? estadoFiltro : undefined,
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
  }, [adminLocalScope.ready, aplicaVigenciaPendientes, debouncedSearchQuery, effectiveLocalFiltro, estadoFiltro, cuando, rangoDesde, rangoHasta, tipoFiltro, vigenteFecha, vigenteHora, paginationCursor, requestRevision, shouldIncludeTotal, setPaginationMetadata]);

	useEffect(() => () => {
		paginationRequestRef.current += 1;
		paginationControllerRef.current?.abort();
	}, []);

  const markConfirmationSent = useCallback(async (reservaId: number) => {
    setReservas((current) =>
      current.map((item) => item.id === reservaId ? { ...item, notificado: true } : item),
    );

    try {
      await actualizarReservaNotificadoDB({ id: reservaId, notificado: true });
    } catch (updateError) {
      setReservas((current) =>
        current.map((item) => item.id === reservaId ? { ...item, notificado: false } : item),
      );
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

  const estadoOptions = ESTADO_OPTIONS;

  const tipoFilterOptions = useMemo(() => [
    { value: 'TODOS', label: 'Todos' },
    { value: 'mesa', label: TIPO_LABELS.M },
    { value: 'bicicleta', label: TIPO_LABELS.B },
  ], []);

  const reservasVisibles = reservas;
  const reservasVisiblesSignature = useMemo(
    () => reservasVisibles.map((reserva) => `${reserva.id}:${reserva.estado}:${reserva.servicio_confirmado ?? ''}:${reserva.notificado ? '1' : '0'}`).join('|'),
    [reservasVisibles],
  );

  // Al volver a la pestaña del navegador se actualiza: pueden haber llegado solicitudes nuevas.
  useEffect(() => {
    const alVolver = () => { void fetchReservas(); };
    window.addEventListener('focus', alVolver);
    return () => window.removeEventListener('focus', alVolver);
  }, [fetchReservas]);

  // Aprobar es editar con el mismo formulario de Nueva reserva: se corrigen los datos y se agenda.
  const openApprovalModal = (reserva: ReservaBD) => router.push(`/atrevida-gestion/reservas/editar/${reserva.id}?aprobar=1`);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/atrevida-gestion/login');
      return;
    }

    void fetchReservas();
  }, [fetchReservas, router]);

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
  }, [effectiveLocalFiltro, estadoFiltro, cuando, rangoDesde, rangoHasta, reservas.length, reservasVisibles.length, searchQuery, tipoFiltro]);

  const renderReservaActions = (reserva: ReservaBD) => {
    const estado = normalizeEstado(reserva.estado);
    const confirmationSent = Boolean(reserva.notificado);
    const confirmationWhatsappHref = buildConfirmacionWhatsappHref(reserva);
    const busy = false;

    return (
      <>
        {estado === 'PENDIENTE' && (
          <AdminButton size="xs" icon={<Check size={13} strokeWidth={2} />} onClick={() => openApprovalModal(reserva)} disabled={busy}>
            Aprobar
          </AdminButton>
        )}
        {estado === 'AGENDADO' && (
          <AdminButton size="xs" icon={<ClipboardCheck size={13} strokeWidth={2} />} onClick={() => setReservaAtencion(reserva)} disabled={busy}>
            Atender
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
        <ReservaAcciones reserva={reserva} onCambio={pagination.resetAfterMutation} />
      </>
    );
  };

  return (
    <div ref={pageRef} className="admin-stack">


          <FilterBar>
            <FilterBar.Item label="Buscar" grow>
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => preserveScrollPosition(() => setSearchQuery(event.target.value))}
                placeholder="Cliente, teléfono, servicio o #ID"
                aria-label="Buscar reserva"
              />
            </FilterBar.Item>
            <FilterBar.Item label="Estado">
              <CustomSelect
                value={estadoFiltro}
                onChange={(value) => preserveScrollPosition(() => setEstadoFiltro(value as EstadoFiltro))}
                options={estadoOptions}
                searchable={false}
              />
            </FilterBar.Item>
            <FilterBar.Item label="Sucursal">
              <CustomSelect
                value={effectiveLocalFiltro}
                onChange={(value) => preserveScrollPosition(() => setLocalFiltro(scopedLocalName || value))}
                options={localFilterOptions}
                searchable={false}
              />
            </FilterBar.Item>
            <FilterBar.Item label="Tipo">
              <CustomSelect
                value={tipoFiltro}
                onChange={(value) => preserveScrollPosition(() => setTipoFiltro(value))}
                options={tipoFilterOptions}
                searchable={false}
              />
            </FilterBar.Item>
            <FilterBar.Item label="Fechas">
              <RangoFechasFiltro
                atajos={CUANDO_ATAJOS}
                valor={cuando}
                onAtajo={(valor) => preserveScrollPosition(() => setCuando(valor))}
                desde={rangoDesde}
                hasta={rangoHasta}
                onRango={(desde, hasta) => preserveScrollPosition(() => {
                  setRangoDesde(desde);
                  setRangoHasta(hasta);
                  setCuando('RANGO');
                })}
              />
            </FilterBar.Item>
          </FilterBar>

          <AdminPanel>
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
                  <span>{cuando === 'PROXIMAS' ? 'Solo se muestran las próximas. Para buscar una reserva pasada, elige Pasadas o Todas en Fechas.' : 'Cambia la búsqueda o los filtros.'}</span>
                  {cuando === 'PROXIMAS' && (
                    <AdminButton variant="secondary" size="sm" onClick={() => setCuando('TODAS')}>Ver todas las fechas</AdminButton>
                  )}
                </div>
              )}

              {!initialLoading && renderedReservas.length > 0 && (
                <div ref={cardsGridRef}>
                  <AprobacionReservasTable
                    reservas={renderedReservas}
                    showLocal={effectiveLocalFiltro === ALL_LOCALS_FILTER}
                    renderActions={renderReservaActions}
                    onVinculado={() => void fetchReservas()}
                  />
                </div>
              )}
			  {!initialLoading && !error && (
				<CursorPagination page={pagination.page} totalPages={pagination.totalPages} hasNext={pagination.hasNext} loading={isFetching} onPrevious={pagination.previous} onNext={pagination.next} />
			  )}
            </div>
          </AdminPanel>
      <AtencionFormModal reserva={reservaAtencion} onClose={() => setReservaAtencion(null)} onSaved={() => pagination.resetAfterMutation()} />
    </div>
  );
}
