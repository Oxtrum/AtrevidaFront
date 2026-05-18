'use client';

import { useRef, useEffect, useState, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import gsap from 'gsap';
import { DiaSemana } from '@/types/reserva';
import { CalendarAdmin } from '@/components/Calendar';
import { useLocales } from '@/lib/hooks/useLocales';
import { useReservasFiltradas } from '@/lib/hooks/useReservasFiltradas';
import { ReservasTable } from '@/components/AdminReservas';
import { CustomSelect } from '@/components/Custom/CustomSelectAdmin';
import { Input } from '@/components/Shared';
import Header from '@/components/AdminHeader/Header';
import styles from './page.module.css';

/**
 * AdminReservasPage - Página de gestión de reservas para administrador
 */
export default function AdminReservasPage() {
  const router = useRouter();
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const [sucursalActiva, setSucursalActiva] = useState('');
  const [semanaActiva, setSemanaActiva] = useState('');

  // Estado para filtros de lista de reservas
  const [vistaActiva, setVistaActiva] = useState<'calendario' | 'lista'>('calendario');
  const [filtroLocal, setFiltroLocal] = useState('SAN MARTIN');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroCliente, setFiltroCliente] = useState('');

  const { locales } = useLocales();
  const { reservas, total, loading, error, fetch: fetchReservas } = useReservasFiltradas();

  // Inicializar fechas por defecto
  const getInitialFechaDesde = () => {
    const hoy = new Date();
    return hoy.toISOString().split('T')[0];
  };
  const getInitialFechaHasta = () => {
    const hoy = new Date();
    const proximoSabado = new Date(hoy);
    proximoSabado.setDate(hoy.getDate() + (6 - hoy.getDay()));
    return proximoSabado.toISOString().split('T')[0];
  };

  const [filtroFechaDesde, setFiltroFechaDesde] = useState(getInitialFechaDesde);
  const [filtroFechaHasta, setFiltroFechaHasta] = useState(getInitialFechaHasta);

  // Fetch reservas filtradas cuando cambian los filtros
  useEffect(() => {
    if (filtroLocal && filtroFechaDesde && filtroFechaHasta) {
      fetchReservas({
        local: filtroLocal,
        fecha_desde: filtroFechaDesde,
        fecha_hasta: filtroFechaHasta,
        tipo: filtroTipo || undefined,
        cliente: filtroCliente || undefined,
      });
    }
  }, [filtroLocal, filtroFechaDesde, filtroFechaHasta, filtroTipo, filtroCliente, fetchReservas]);

  // Verificar autenticación admin
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/admin/login');
    }
  }, [router]);

  // Animaciones GSAP
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.fromTo(headerRef.current, { y: -30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 })
        .fromTo(calendarRef.current, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, '-=0.2');
    }, containerRef);

    return () => ctx.kill();
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleSlotClick = (hora: string, dia: DiaSemana, slots: unknown) => {
    let hora_desde: string, hora_hasta: string;

    if (hora.includes(' a ')) {
      const partes = hora.split(' a ').map(h => h.trim());
      hora_desde = partes[0] || '';
      hora_hasta = partes[1] || '';
    } else {
      hora_desde = hora.includes(':') ? hora : `${hora}:00`;
      const [hh, mm] = hora_desde.split(':').map(Number);
      const minutos = (mm || 0) + 60;
      if (minutos >= 60) {
        hora_hasta = `${(hh + 1).toString().padStart(2, '0')}:00`;
      } else {
        hora_hasta = `${hh.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
      }
    }

    const params = new URLSearchParams({
      local: sucursalActiva,
      semana: semanaActiva,
      dia: dia,
      hora_desde,
      hora_hasta,
    });

    router.push(`/admin/reservas/crear?${params.toString()}`);
  };

  const handleSucursalChange = (sucursal: string) => {
    setSucursalActiva(sucursal);
  };

  const handleSemanaChange = (semana: string) => {
    setSemanaActiva(semana);
  };

  const localesOptions = useMemo(
    () => locales.map(l => ({ value: l.nombre, label: l.nombre })),
    [locales]
  );

  const tipoOptions = [
    { value: '', label: 'Todos' },
    { value: 'mesa', label: 'Mesa' },
    { value: 'bicicleta', label: 'Bicicleta' },
  ];

  return (
    <div ref={containerRef} className={styles.pageContainer}>
      <Header />
      <main className={styles.main}>
        <div ref={headerRef} className={styles.header}>
          <div>
            <h1 className={styles.title}>Gestión de Reservas</h1>
            <p className={styles.subtitle}>
              Vista detallada de todas las reservas. Haz clic en el (+) para crear una nueva reserva
            </p>
          </div>

          <div className={styles.headerActions}>
            <button
              className={styles.createButton}
              onClick={() => {
                const params = new URLSearchParams({
                  local: sucursalActiva,
                  semana: semanaActiva,
                });
                router.push(`/admin/reservas/crear?${params.toString()}`);
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
          </div>
        </div>

        {vistaActiva === 'lista' && (
          <div className={styles.filtrosSection}>
            <div className={styles.filtrosRow}>
              <div className={styles.filtroGroup}>
                <label>Local</label>
                <CustomSelect
                  value={filtroLocal}
                  onChange={setFiltroLocal}
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
                  onChange={setFiltroTipo}
                  options={tipoOptions}
                />
              </div>
              <div className={styles.filtroGroup}>
                <label>Cliente</label>
                <Input
                  type="text"
                  value={filtroCliente}
                  onChange={(e) => setFiltroCliente(e.target.value)}
                  placeholder="Buscar cliente..."
                />
              </div>
            </div>

            <ReservasTable
              reservas={reservas}
              total={total}
              loading={loading}
              error={error}
            />
          </div>
        )}

        {vistaActiva === 'calendario' && (
          <div ref={calendarRef} className={styles.calendarSection}>
            <CalendarAdmin
              key={pathname}
              localInicial="SAN MARTIN"
              onSlotClick={handleSlotClick}
              onSucursalChange={handleSucursalChange}
              onSemanaChange={handleSemanaChange}
            />
          </div>
        )}
      </main>
    </div>
  );
}
