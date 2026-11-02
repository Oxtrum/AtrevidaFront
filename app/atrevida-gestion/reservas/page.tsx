'use client';

import { useRef, useEffect, useState, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import gsap from 'gsap';
import { CalendarDays, CalendarRange, List } from 'lucide-react';
import { DiaSemana, ReservaBD, ReservaDetalle, generarSemanas, getFechasDeSemana } from '@/types/reserva';
import { SLOTS_POR_HORA, calcularHoraFin } from '@/lib/constants/reservationForm';
import { CalendarAdmin } from '@/components/Calendar';
import { useLocales } from '@/lib/hooks/useLocales';
import { useAdminLocalScopeState } from '@/lib/auth/useAdminLocalScope';
import { PageHeader, ConfirmDialog, Tabs } from '@/components/AdminConfig';
import type { TabItem } from '@/components/AdminConfig';
import { eliminarReservaDB } from '@/lib/api/reservas';
import { toast } from '@/components/Shared/Toast';
import { BandejaReservas, ReservaDetailModal, ReservasToolbar } from '@/components/AdminReservas';
import styles from './page.module.css';

type Vista = 'calendario' | 'lista';

const VISTAS: TabItem<Vista>[] = [
  { key: 'calendario', label: 'Calendario', icon: <CalendarDays size={14} strokeWidth={2} /> },
  { key: 'lista', label: 'Lista', icon: <List size={14} strokeWidth={2} /> },
];

const DEFAULT_LOCAL = 'SAN MARTIN';
const LOCAL_SCOPE_PENDING = '__LOCAL_SCOPE_PENDING__';

/**
 * AdminReservasPage - Página de gestión de reservas para administrador.
 * Calendario para ver la semana; Lista para aprobar, confirmar, completar y cobrar.
 */
export default function AdminReservasPage() {
  const router = useRouter();
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const [sucursalActiva, setSucursalActiva] = useState(DEFAULT_LOCAL);
  const [semanaActiva, setSemanaActiva] = useState('0');
  const [vistaActiva, setVistaActiva] = useState<Vista>('calendario');
  const [calendarRevision, setCalendarRevision] = useState(0);

  const { locales } = useLocales();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [selectedReserva, setSelectedReserva] = useState<ReservaBD | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ReservaBD | null>(null);
  const adminLocalScope = useAdminLocalScopeState();
  const scopedLocalName = adminLocalScope.workplace?.nombre_local ?? '';
  const effectiveSucursalActiva = scopedLocalName || (adminLocalScope.ready ? sucursalActiva : '');


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

  // Verificar autenticación admin
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/atrevida-gestion/login');
    }
  }, [router]);

  // Aprobacion de reservas redirige aqui con ?vista=pendientes.
  useEffect(() => {
    const vista = new URLSearchParams(window.location.search).get('vista');
    if (vista === 'pendientes' || vista === 'lista') setVistaActiva('lista');
  }, []);

  const cambiarVista = (vista: Vista) => {
    setVistaActiva(vista);
    window.history.replaceState(null, '', window.location.pathname);
  };

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
      setCalendarRevision((n) => n + 1);
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
  };

  return (
    <div ref={containerRef} className="admin-stack">
          <div ref={headerRef}>
            <PageHeader
              kicker="Operación diaria"
              kickerIcon={<CalendarRange size={14} strokeWidth={2} />}
              title="Gestión de Reservas"
              accentWord="Reservas"
              subtitle="Agenda de la semana y lista de reservas por atender."
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

          <Tabs tabs={VISTAS} active={vistaActiva} onChange={cambiarVista} ariaLabel="Vistas de reservas" />

          {vistaActiva === 'lista' && <BandejaReservas />}

          {vistaActiva === 'calendario' && (
            <>
              <ReservasToolbar
                localValue={effectiveSucursalActiva}
                localOptions={localesOptions}
                onLocalChange={handleSucursalChange}
                localLocked={!!scopedLocalName}
                semanaIndex={Number(semanaActiva)}
                semanaOptions={semanaOptions}
                onSemanaChange={handleSemanaChange}
                fechaISO={semanaFechaISO}
                minISO={rangoFechas.min}
                maxISO={rangoFechas.max}
                onFechaSelect={handleFechaSelect}
              />

              <CalendarAdmin
                key={`${pathname}-${calendarRevision}`}
                hideControls
                sucursal={effectiveSucursalActiva}
                semanaIndex={Number(semanaActiva)}
                onSlotClick={handleSlotClick}
                onReservaClick={abrirDetalleDesdeCalendario}
                onSucursalChange={handleSucursalChange}
                onSemanaChange={handleSemanaChange}
              />
            </>
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
    </div>
  );
}
