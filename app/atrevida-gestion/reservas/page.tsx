'use client';

import { useRef, useEffect, useState, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import gsap from 'gsap';
import { CalendarRange } from 'lucide-react';
import { DiaSemana, EstadoReserva, ReservaBD, ReservaDetalle, generarSemanas, getFechasDeSemana } from '@/types/reserva';
import { SLOTS_POR_HORA, calcularHoraFin } from '@/lib/constants/reservationForm';
import { CalendarAdmin } from '@/components/Calendar';
import { useLocales } from '@/lib/hooks/useLocales';
import { useReservasFiltradas } from '@/lib/hooks/useReservasFiltradas';
import type { ReservaTipoBackend } from '@/lib/api/reservas';
import { useAdminLocalScopeState } from '@/lib/auth/useAdminLocalScope';
import { PageHeader, AdminPanel, ConfirmDialog, CursorPagination } from '@/components/AdminConfig';
import { CustomSelect } from '@/components/Custom/CustomSelectAdmin';
import { Input } from '@/components/Shared';
import Header from '@/components/AdminHeader/Header';
import { eliminarReservaDB } from '@/lib/api/reservas';
import { toast } from '@/components/Shared/Toast';
import { ReservaDetailModal, ReservasLista, ReservasToolbar } from '@/components/AdminReservas';
import styles from './page.module.css';
import { PAGE_LIMIT } from '@/lib/api/pagination';
import { useCursorPagination } from '@/lib/hooks/useCursorPagination';

const DEFAULT_LOCAL = 'SAN MARTIN';
const LOCAL_SCOPE_PENDING = '__LOCAL_SCOPE_PENDING__';

/**
 * AdminReservasPage - Página de gestión de reservas para administrador
 */
export default function AdminReservasPage() {
  const router = useRouter();
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const [sucursalActiva, setSucursalActiva] = useState(DEFAULT_LOCAL);
  const [semanaActiva, setSemanaActiva] = useState('0');

  // Estado para filtros de lista de reservas
  const [vistaActiva, setVistaActiva] = useState<'calendario' | 'lista'>('calendario');
  const [filtroLocal, setFiltroLocal] = useState(DEFAULT_LOCAL);
  const [filtroTipo, setFiltroTipo] = useState<ReservaTipoBackend | ''>('');
  const [filtroEstado, setFiltroEstado] = useState<EstadoReserva | ''>('');
  const [busqueda, setBusqueda] = useState('');
  const [busquedaDebounced, setBusquedaDebounced] = useState('');

  const { locales } = useLocales();
  const { reservas, loading, error, pagination: serverPagination, fetch: fetchReservas } = useReservasFiltradas();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [selectedReserva, setSelectedReserva] = useState<ReservaBD | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ReservaBD | null>(null);
  const adminLocalScope = useAdminLocalScopeState();
  const scopedLocalName = adminLocalScope.workplace?.nombre_local ?? '';
  const effectiveSucursalActiva = scopedLocalName || (adminLocalScope.ready ? sucursalActiva : '');
  const effectiveFiltroLocal = scopedLocalName || (adminLocalScope.ready ? filtroLocal : '');

  // Inicializar fechas por defecto
  const getInitialFechaDesde = () => {
    const hoy = new Date();
    return hoy.toISOString().split('T')[0];
  };
  const getInitialFechaHasta = () => {
    const hoy = new Date();
    const proximoSabado = new Date(hoy);
    proximoSabado.setDate(hoy.getDate() + (13 - hoy.getDay()));
    return proximoSabado.toISOString().split('T')[0];
  };

  const [filtroFechaDesde, setFiltroFechaDesde] = useState(getInitialFechaDesde);
  const [filtroFechaHasta, setFiltroFechaHasta] = useState(getInitialFechaHasta);
	const pagination = useCursorPagination(`${effectiveFiltroLocal}|${filtroFechaDesde}|${filtroFechaHasta}|${filtroTipo}|${filtroEstado}|${busquedaDebounced}`);
	const { cursor: paginationCursor, requestRevision, shouldIncludeTotal, setMetadata: setPaginationMetadata } = pagination;

	useEffect(() => setPaginationMetadata(serverPagination), [setPaginationMetadata, serverPagination]);

  useEffect(() => {
    const timer = window.setTimeout(() => setBusquedaDebounced(busqueda.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [busqueda]);

  // Fechas de la semana que muestra el calendario. Se derivan igual que en
  // CalendarAdmin (generarSemanas() + getFechasDeSemana), y `semanaActiva` se
  // mantiene sincronizada vía onSemanaChange. Sirven para recortar la hora de
  // fin al cierre del local al prellenar el formulario de creación.
  const fechasCalendario = useMemo(() => {
    const semanas = generarSemanas();
    const idx = Number(semanaActiva);
    const semana = semanas[Number.isFinite(idx) ? idx : 0] ?? semanas[0];
    return semana ? getFechasDeSemana(semana.fechaInicio) : null;
  }, [semanaActiva]);

  // Fetch reservas filtradas cuando cambian los filtros
  useEffect(() => {
    if (effectiveFiltroLocal && filtroFechaDesde && filtroFechaHasta) {
      fetchReservas({
        local: effectiveFiltroLocal,
        fecha_desde: filtroFechaDesde,
        fecha_hasta: filtroFechaHasta,
        tipo: (filtroTipo as 'mesa' | 'bicicleta' | '') || undefined,
        estado: filtroEstado || undefined,
		busqueda: busquedaDebounced || undefined,
		limit: PAGE_LIMIT,
		cursor: paginationCursor,
		include_total: shouldIncludeTotal(),
      });
    }
  }, [effectiveFiltroLocal, filtroFechaDesde, filtroFechaHasta, filtroTipo, filtroEstado, busquedaDebounced, fetchReservas, paginationCursor, requestRevision, shouldIncludeTotal]);

  // Verificar autenticación admin
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/atrevida-gestion/login');
    }
  }, [router]);

  // Animaciones GSAP
  useEffect(() => {
    const ctx = gsap.context(() => {
      const targets = [headerRef.current, calendarRef.current].filter(Boolean);
      if (targets.length === 0) return;

      gsap.fromTo(
        targets,
        { y: 24, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, stagger: 0.12, ease: 'power3.out' },
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleSlotClick = (hora: string, dia: DiaSemana, slots: unknown) => {
    // La etiqueta de la fila es "16:00 a 16:30": su fin es el fin del *slot* de
    // la rejilla (30 min), no la duración por defecto de una reserva (60 min).
    // Usarla como hora_hasta prellenaría el formulario con media hora.
    const inicio = (hora.includes(' a ') ? hora.split(' a ')[0] : hora).trim();
    const hora_desde = inicio.includes(':') ? inicio : `${inicio}:00`;

    const fechaDia = fechasCalendario?.get(dia)?.fecha ?? new Date();
    const hora_hasta = calcularHoraFin(hora_desde, SLOTS_POR_HORA, effectiveSucursalActiva, fechaDia);

    const params = new URLSearchParams({
      local: effectiveSucursalActiva,
      semana: semanaActiva,
      dia: dia,
      hora_desde,
      hora_hasta,
    });

    router.push(`/atrevida-gestion/reservas/crear?${params.toString()}`);
  };

  const handleSucursalChange = (sucursal: string) => {
    if (scopedLocalName) {
      setSucursalActiva(scopedLocalName);
      return;
    }

    setSucursalActiva(sucursal);
  };

  // Abre el diálogo de confirmación (reemplaza window.confirm).
  const requestDeleteReserva = (reserva: ReservaBD) => setConfirmDelete(reserva);

  const performDeleteReserva = async (reserva: ReservaBD) => {
    setDeletingId(reserva.id);
    try {
      await eliminarReservaDB(reserva.id);
      toast.success('Reserva eliminada');
      pagination.resetAfterMutation();
    } catch (err) {
      if (err instanceof Error) console.error('eliminarReservaDB', err);
      toast.error('No se pudo eliminar la reserva');
    } finally {
      setDeletingId(null);
    }
  };

  // Reserva ocupada del calendario → ReservaBD para abrir el detalle.
  const abrirDetalleDesdeCalendario = (r: ReservaDetalle) => {
    if (r.id == null) return;
    setSelectedReserva({
      id: r.id,
      local: r.local ?? '',
      tipo: r.tipo ?? '',
      fecha: r.fecha ?? '',
      hora_desde: (r.reserva_hora_desde ?? r.hora_desde ?? '').slice(0, 5),
      hora_hasta: (r.reserva_hora_hasta ?? r.hora_hasta ?? '').slice(0, 5),
      cliente: r.cliente ?? '',
      servicio: r.servicio ?? '',
      estado: r.estado,
      plan_id: r.plan_id,
      costo_variable: r.costo_variable,
    });
  };

  const handleSemanaChange = (semana: string) => {
    setSemanaActiva(semana);
  };

  const localesOptions = useMemo(
    () => !adminLocalScope.ready
      ? [{ value: LOCAL_SCOPE_PENDING, label: 'Cargando local...' }]
      : scopedLocalName
      ? [{ value: scopedLocalName, label: scopedLocalName }]
      : locales.map(l => ({ value: l.nombre, label: l.nombre })),
    [adminLocalScope.ready, locales, scopedLocalName]
  );

  const semanaOptions = useMemo(
    () => generarSemanas().map((semana, idx) => {
      const sabado = new Date(semana.fechaInicio);
      sabado.setDate(sabado.getDate() + 5);
      return { value: String(idx), label: `${semana.titulo} DE ${sabado.getFullYear()}` };
    }),
    []
  );

  // Calendario de fechas: resalta el lunes de la semana activa y salta de semana al elegir.
  const semanaFechaISO = useMemo(() => {
    const semana = generarSemanas()[Number(semanaActiva)];
    return semana ? semana.fechaInicio.toLocaleDateString('en-CA') : '';
  }, [semanaActiva]);

  const rangoFechas = useMemo(() => {
    const semanas = generarSemanas();
    const primera = semanas[0]?.fechaInicio;
    const ultima = semanas[semanas.length - 1]?.fechaInicio;
    if (!primera || !ultima) return { min: '', max: '' };
    const fin = new Date(ultima);
    fin.setDate(fin.getDate() + 5);
    return { min: primera.toLocaleDateString('en-CA'), max: fin.toLocaleDateString('en-CA') };
  }, []);

  const handleFechaSelect = (iso: string) => {
    const d = new Date(`${iso}T00:00:00`);
    if (d.getDay() === 0) return; // domingos sin atención
    const idx = generarSemanas().findIndex(s => {
      const ini = new Date(s.fechaInicio);
      ini.setHours(0, 0, 0, 0);
      const fin = new Date(ini);
      fin.setDate(fin.getDate() + 5);
      return d >= ini && d <= fin;
    });
    if (idx < 0) return;
    setSemanaActiva(String(idx));
    // En la lista, la fecha elegida acota el rango a ese día.
    if (vistaActiva === 'lista') {
      setFiltroFechaDesde(iso);
      setFiltroFechaHasta(iso);
    }
  };

  const tipoOptions: Array<{ value: ReservaTipoBackend | ''; label: string }> = [
    { value: '', label: 'Todos' },
    { value: 'mesa', label: 'Mesa' },
    { value: 'bicicleta', label: 'Bicicleta' },
  ];

  const estadoOptions: Array<{ value: EstadoReserva | ''; label: string }> = [
    { value: '', label: 'Todos' },
    { value: 'PENDIENTE', label: 'Pendiente' },
    { value: 'AGENDADO', label: 'Agendado' },
    { value: 'RECHAZADO', label: 'Rechazado' },
    { value: 'COMPLETADO', label: 'Completado' },
  ];

  const handleTipoFiltroChange = (value: string) => {
    setFiltroTipo(value === 'mesa' || value === 'bicicleta' ? value : '');
  };

  return (
    <div ref={containerRef} className={styles.pageContainer}>
      <div className="admin-mesh" />
      <Header />
      <main className={styles.main}>
        <div className={styles.container}>
          <div ref={headerRef}>
            <PageHeader
              kicker="Operación diaria"
              kickerIcon={<CalendarRange size={14} strokeWidth={2} />}
              title="Gestión de Reservas"
              accentWord="Reservas"
              subtitle="Vista detallada de reservas. Filtra por local, fecha, estado y tipo."
              actions={
                <button
                  className={styles.createButton}
                  onClick={() => {
                    const params = new URLSearchParams({
                      local: effectiveSucursalActiva,
                      semana: semanaActiva,
                    });
                    router.push(`/atrevida-gestion/reservas/crear?${params.toString()}`);
                  }}
                >
                  <span>+</span>
                  <span>Nueva Reserva</span>
                </button>
              }
            />
          </div>

          <ReservasToolbar
            vista={vistaActiva}
            onVistaChange={setVistaActiva}
            localValue={effectiveSucursalActiva}
            localOptions={localesOptions}
            onLocalChange={(value) => {
              handleSucursalChange(value);
              setFiltroLocal(scopedLocalName || value);
            }}
            localLocked={!!scopedLocalName}
            semanaIndex={Number(semanaActiva)}
            semanaOptions={semanaOptions}
            onSemanaChange={handleSemanaChange}
            fechaISO={semanaFechaISO}
            minISO={rangoFechas.min}
            maxISO={rangoFechas.max}
            onFechaSelect={handleFechaSelect}
            filtros={
              <>
                <div className={styles.filtroGroup}>
                  <label>Buscar</label>
                  <Input
                    type="search"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Cliente, servicio, teléfono..."
                  />
                </div>
                <div className={styles.filtroGroup}>
                  <label>Fecha desde</label>
                  <Input
                    type="date"
                    value={filtroFechaDesde}
                    onChange={(e) => setFiltroFechaDesde(e.target.value)}
                  />
                </div>
                <div className={styles.filtroGroup}>
                  <label>Fecha hasta</label>
                  <Input
                    type="date"
                    value={filtroFechaHasta}
                    onChange={(e) => setFiltroFechaHasta(e.target.value)}
                  />
                </div>
                <div className={styles.filtroGroup}>
                  <label>Tipo</label>
                  <CustomSelect
                    value={filtroTipo}
                    onChange={handleTipoFiltroChange}
                    options={tipoOptions}
                  />
                </div>
                <div className={styles.filtroGroup}>
                  <label>Estado</label>
                  <CustomSelect
                    value={filtroEstado}
                    onChange={(v) => setFiltroEstado(v as EstadoReserva | '')}
                    options={estadoOptions}
                  />
                </div>
              </>
            }
          />

          {vistaActiva === 'lista' && (
            <AdminPanel>
              <ReservasLista
                reservas={reservas as unknown as ReservaBD[]}
                loading={loading}
                error={error}
                deletingId={deletingId}
                onSelect={setSelectedReserva}
                onEdit={(r) => router.push(`/atrevida-gestion/reservas/editar/${r.id}`)}
                onDelete={requestDeleteReserva}
              />
			  <CursorPagination page={pagination.page} totalPages={pagination.totalPages} hasNext={pagination.hasNext} loading={loading} onPrevious={pagination.previous} onNext={pagination.next} />
            </AdminPanel>
          )}

          {selectedReserva && (
            <ReservaDetailModal
              reserva={selectedReserva}
              onClose={() => setSelectedReserva(null)}
              onEdit={(r) => {
                setSelectedReserva(null);
                router.push(`/atrevida-gestion/reservas/editar/${r.id}`);
              }}
              onDelete={(r) => {
                setSelectedReserva(null);
                requestDeleteReserva(r);
              }}
              deleting={deletingId === selectedReserva.id}
            />
          )}

          <ConfirmDialog
            isOpen={confirmDelete !== null}
            title="Eliminar reserva"
            message={`¿Eliminar la reserva de ${confirmDelete?.cliente || `#${confirmDelete?.id}`}? Si usa un paquete, la sesión se devuelve. Si ya se había descontado stock de insumos, también se devuelve.`}
            confirmLabel="Eliminar"
            danger
            loading={deletingId != null}
            onConfirm={() => {
              const r = confirmDelete;
              setConfirmDelete(null);
              if (r) performDeleteReserva(r);
            }}
            onClose={() => setConfirmDelete(null)}
          />

          {vistaActiva === 'calendario' && (

            <CalendarAdmin
              key={pathname}
              hideControls
              sucursal={effectiveSucursalActiva}
              semanaIndex={Number(semanaActiva)}
              onSlotClick={handleSlotClick}
              onReservaClick={abrirDetalleDesdeCalendario}
              onSucursalChange={handleSucursalChange}
              onSemanaChange={handleSemanaChange}
            />
          )}
        </div>
      </main>
    </div>
  );
}
