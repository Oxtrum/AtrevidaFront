'use client';

import { useRef, useEffect, useState, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import gsap from 'gsap';
import { CalendarRange, Pencil, Trash2 } from 'lucide-react';
import { DiaSemana, EstadoReserva, ReservaBD, ReservaDetalle, generarSemanas, getFechasDeSemana } from '@/types/reserva';
import { SLOTS_POR_HORA, calcularHoraFin } from '@/lib/constants/reservationForm';
import { CalendarAdmin } from '@/components/Calendar';
import { useLocales } from '@/lib/hooks/useLocales';
import { useReservasFiltradas } from '@/lib/hooks/useReservasFiltradas';
import type { ReservaTipoBackend } from '@/lib/api/reservas';
import { useAdminLocalScopeState } from '@/lib/auth/useAdminLocalScope';
import { DataTable, Column, RowActionsMenu, PageHeader, AdminPanel, ConfirmDialog } from '@/components/AdminConfig';
import { CustomSelect } from '@/components/Custom/CustomSelectAdmin';
import { Input } from '@/components/Shared';
import Header from '@/components/AdminHeader/Header';
import { eliminarReservaDB } from '@/lib/api/reservas';
import { toast } from '@/components/Shared/Toast';
import { ReservaDetailModal } from '@/components/AdminReservas';
import styles from './page.module.css';

interface ReservaRow extends Record<string, unknown> {
  id: number;
  local: string;
  tipo: string;
  fecha: string;
  hora_desde: string;
  hora_hasta: string;
  cliente: string;
  numero_telefono?: string;
  servicio: string;
  servicio_solicitado?: string | null;
  servicio_confirmado?: string | null;
  precio?: number;
  notas?: string;
  estado?: EstadoReserva;
}

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

  const { locales } = useLocales();
  const { reservas, loading, error, fetch: fetchReservas } = useReservasFiltradas();
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

  // Fechas de la semana que muestra el calendario. Se derivan igual que en
  // CalendarAdmin (generarSemanas(6) + getFechasDeSemana), y `semanaActiva` se
  // mantiene sincronizada vía onSemanaChange. Sirven para recortar la hora de
  // fin al cierre del local al prellenar el formulario de creación.
  const fechasCalendario = useMemo(() => {
    const semanas = generarSemanas(6);
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
      });
    }
  }, [effectiveFiltroLocal, filtroFechaDesde, filtroFechaHasta, filtroTipo, filtroEstado, fetchReservas]);

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
      await fetchReservas({
        local: effectiveFiltroLocal,
        fecha_desde: filtroFechaDesde,
        fecha_hasta: filtroFechaHasta,
        tipo: (filtroTipo as 'mesa' | 'bicicleta' | '') || undefined,
        estado: filtroEstado || undefined,
      });
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
      hora_desde: (r.hora_desde ?? '').slice(0, 5),
      hora_hasta: (r.reserva_hora_hasta ?? r.hora_hasta ?? '').slice(0, 5),
      cliente: r.cliente ?? '',
      servicio: r.servicio ?? '',
      estado: r.estado,
      plan_id: r.plan_id,
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

  const ESTADO_COLORS: Record<string, { bg: string; color: string }> = {
    AGENDADO: { bg: 'rgba(20,174,239,0.12)', color: '#14AEEF' },
    COMPLETADO: { bg: 'rgba(34,197,94,0.12)', color: '#22C55E' },
    RECHAZADO: { bg: 'rgba(239,68,68,0.12)', color: '#EF4444' },
    PENDIENTE: { bg: 'rgba(250,204,21,0.12)', color: '#FACC15' },
  };

  const TIPO_COLORS: Record<string, { bg: string; color: string }> = {
    mesa: { bg: 'rgba(236,0,140,0.12)', color: '#EC008C' },
    bicicleta: { bg: 'rgba(146,39,143,0.12)', color: '#92278F' },
  };

  const columns: Column<ReservaRow>[] = [
    {
      key: 'fecha',
      label: 'Fecha',
      render: (_v, row) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{row.fecha as string}</span>,
    },
    {
      key: 'hora_desde',
      label: 'Hora',
      searchable: false,
      render: (_v, row) => (
        <span style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
          {row.hora_desde as string} – {row.hora_hasta as string}
        </span>
      ),
    },
    {
      key: 'cliente',
      label: 'Cliente',
      render: (_v, row) => <span>{(row.cliente as string) || '—'}</span>,
    },
    {
      key: 'tipo',
      label: 'Tipo',
      render: (_v, row) => {
        const t = ((row.tipo as string) || '').toLowerCase();
        const key = t === 'm' ? 'mesa' : t === 'b' ? 'bicicleta' : t;
        const c = TIPO_COLORS[key] ?? { bg: 'rgba(255,255,255,0.08)', color: 'inherit' };
        const label = key === 'mesa' ? 'Mesa' : key === 'bicicleta' ? 'Bicicleta' : key || '—';
        return (
          <span style={{ background: c.bg, color: c.color, borderRadius: 6, padding: '2px 8px', fontSize: '0.73rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
            {label}
          </span>
        );
      },
    },
    {
      key: 'servicio',
      label: 'Servicio',
      render: (_v, row) => (
        <span style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
          {(row.servicio_confirmado as string) || (row.servicio as string) || (row.servicio_solicitado as string) || 'Por definir'}
        </span>
      ),
    },
    {
      key: 'estado',
      label: 'Estado',
      searchable: false,
      render: (_v, row) => {
        const e = (row.estado as string) || 'PENDIENTE';
        const c = ESTADO_COLORS[e] ?? { bg: 'rgba(255,255,255,0.08)', color: 'inherit' };
        return (
          <span style={{ background: c.bg, color: c.color, borderRadius: 6, padding: '2px 8px', fontSize: '0.73rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
            {e}
          </span>
        );
      },
    },
    {
      key: 'local',
      label: 'Local',
      render: (_v, row) => (
        <span style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 6, padding: '2px 8px', fontSize: '0.73rem', whiteSpace: 'nowrap' }}>
          {row.local as string}
        </span>
      ),
    },
    {
      key: 'acciones',
      label: '',
      searchable: false,
      render: (_v, row) => (
        <div onClick={e => e.stopPropagation()}>
          <RowActionsMenu actions={[
            ...(row.estado !== 'COMPLETADO'
              ? [{ label: 'Editar', icon: <Pencil size={12} strokeWidth={2} />, onClick: () => router.push(`/atrevida-gestion/reservas/editar/${row.id}`) }]
              : []),
            { label: 'Eliminar', icon: <Trash2 size={12} strokeWidth={2} />, onClick: () => requestDeleteReserva(row as unknown as ReservaBD), variant: 'danger', disabled: deletingId === (row.id as number) },
          ]} />
        </div>
      ),
    },
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
                <>
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
                  <div className={styles.vistaToggle}>
                    <button
                      className={`${styles.vistaButton} ${vistaActiva === 'calendario' ? styles.vistaActive : ''}`}
                      onClick={() => setVistaActiva('calendario')}
                    >
                      Calendario
                    </button>
                    <button
                      className={`${styles.vistaButton} ${vistaActiva === 'lista' ? styles.vistaActive : ''}`}
                      onClick={() => setVistaActiva('lista')}
                    >
                      Lista
                    </button>
                  </div>
                </>
              }
            />
          </div>

          {vistaActiva === 'lista' && (
            <AdminPanel>
              <div className={styles.controls}>
                <div className={styles.filtrosRow}>
                  <div className={styles.filtroGroup}>
                    <label>Local</label>
                    <CustomSelect
                      value={effectiveFiltroLocal || LOCAL_SCOPE_PENDING}
                      onChange={(value) => setFiltroLocal(scopedLocalName || value)}
                      options={localesOptions}
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
                </div>

              </div>
              <DataTable<ReservaRow>
                columns={columns}
                data={reservas as unknown as ReservaRow[]}
                loading={loading}
                error={error}
                getRowKey={(r) => r.id as number}
                searchPlaceholder="Buscar cliente, servicio..."
                emptyMessage="No se encontraron reservas"
                onRowClick={(row) => setSelectedReserva(row as unknown as ReservaBD)}
              />
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
            message={`¿Eliminar la reserva de ${confirmDelete?.cliente || `#${confirmDelete?.id}`}? Si usa un paquete, la sesión se devuelve. Es un borrado lógico, reversible desde el backend.`}
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
              sucursal={effectiveSucursalActiva}
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
