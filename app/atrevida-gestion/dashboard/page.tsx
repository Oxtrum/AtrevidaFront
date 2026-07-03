'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import gsap from 'gsap';
import {
  AlertCircle,
  CalendarCheck,
  CheckCircle2,
  CalendarX,
  Calendar,
  BarChart2,
  Clock,
  DollarSign,
  Users,
} from 'lucide-react';

import Header from '@/components/AdminHeader/Header';
import { PageHeader } from '@/components/AdminConfig';
import { CustomSelect } from '@/components/Custom/CustomSelectAdmin';
import {
  getReservasResumenDB,
  type ReservasResumenData,
} from '@/lib/api/reservas';
import { getClientesDB } from '@/lib/api/clientes';
import { useAdminLocalScopeState } from '@/lib/auth/useAdminLocalScope';
import { useLocales } from '@/lib/hooks/useLocales';
import styles from './page.module.css';

type KpiCard = {
  label: string;
  icon: React.ReactNode;
  color: string;
  colorRgb: string;
  getValue: (resumen: ReservasResumenData, isLoading: boolean) => string;
  getSub: (isLoading: boolean) => string;
  trend: string;
};

const EMPTY_RESUMEN: ReservasResumenData = {
  reservas_agendadas_dia: 0,
  servicios_completados_dia: 0,
  ingresos_hoy: 0,
  cancelaciones_hoy: 0,
  semana: {
    total_reservas: 0,
    lunes: 0,
    martes: 0,
    miercoles: 0,
    jueves: 0,
    viernes: 0,
  },
};

const getTodayISO = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
};

const GENERAL_LOCAL = '';
const LOCAL_SCOPE_PENDING = '__LOCAL_SCOPE_PENDING__';

const formatDashboardCurrency = (value: number | string | null | undefined) => `Bs ${Number(value ?? 0).toLocaleString('es-BO', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})}`;

const makeKpiPrimary = (clientesTotal: number | null): KpiCard[] => [
  {
    label: 'Reservas del día',
    trend: 'Hoy',
    icon: <CalendarCheck size={16} strokeWidth={1.5} />,
    color: '#EC008C',
    colorRgb: '236, 0, 140',
    getValue: (resumen, isLoading) => isLoading ? '—' : String(resumen.reservas_agendadas_dia),
    getSub: () => 'Agendadas para la fecha seleccionada',
  },
  {
    label: 'Ingresos de hoy',
    trend: 'Hoy',
    icon: <DollarSign size={16} strokeWidth={1.5} />,
    color: '#92278F',
    colorRgb: '146, 39, 143',
    getValue: (resumen, isLoading) => isLoading ? '—' : formatDashboardCurrency(resumen.ingresos_hoy),
    getSub: () => 'Ingresos registrados para la fecha seleccionada',
  },
  {
    label: 'Clientes activos',
    trend: '—',
    icon: <Users size={16} strokeWidth={1.5} />,
    color: '#14AEEF',
    colorRgb: '20, 174, 239',
    getValue: (_r, isLoading) => (isLoading || clientesTotal === null) ? '—' : String(clientesTotal),
    getSub: () => clientesTotal === null ? 'Cargando...' : 'Total en el directorio',
  },
];

const KPI_SECONDARY: KpiCard[] = [
  {
    label: 'Servicios completados',
    trend: 'Hoy',
    icon: <CheckCircle2 size={16} strokeWidth={1.5} />,
    color: '#14AEEF',
    colorRgb: '20, 174, 239',
    getValue: (resumen, isLoading) => isLoading ? '—' : String(resumen.servicios_completados_dia),
    getSub: () => 'Atenciones marcadas como completadas',
  },
  {
    label: 'Cancelaciones',
    trend: 'Hoy',
    icon: <CalendarX size={16} strokeWidth={1.5} />,
    color: '#FFE600',
    colorRgb: '255, 230, 0',
    getValue: (resumen, isLoading) => isLoading ? '—' : String(resumen.cancelaciones_hoy),
    getSub: () => 'Reservas canceladas en la fecha seleccionada',
  }
];

const getWeekBars = (resumen: ReservasResumenData) => {
  const values = [
    { day: 'Lunes', value: resumen.semana.lunes ?? 0 },
    { day: 'Martes', value: resumen.semana.martes ?? 0 },
    { day: 'Miércoles', value: resumen.semana.miercoles ?? 0 },
    { day: 'Jueves', value: resumen.semana.jueves ?? 0 },
    { day: 'Viernes', value: resumen.semana.viernes ?? 0 },
  ];
  const max = Math.max(1, ...values.map((bar) => bar.value));

  return values.map((bar) => ({
    ...bar,
    height: `${Math.max(8, Math.round((bar.value / max) * 100))}%`,
  }));
};

export default function AdminDashboardPage() {
  const router = useRouter();

  const [adminName] = useState('Admin');
  const [greeting] = useState(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  });
  const [dateString] = useState(() => {
    const raw = new Date().toLocaleDateString('es-BO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  });
  const [year] = useState(() => String(new Date().getFullYear()));
  const [resumenFecha] = useState(getTodayISO);
  const [resumen, setResumen] = useState<ReservasResumenData>(EMPTY_RESUMEN);
  const [resumenLoading, setResumenLoading] = useState(true);
  const [resumenError, setResumenError] = useState<string | null>(null);
  const [clientesTotal, setClientesTotal] = useState<number | null>(null);
  const [dashboardLocal, setDashboardLocal] = useState(GENERAL_LOCAL);
  const adminLocalScope = useAdminLocalScopeState();
  const scopedLocalName = adminLocalScope.workplace?.nombre_local ?? '';
  const { locales } = useLocales();
  const effectiveDashboardLocal = scopedLocalName || (adminLocalScope.ready ? dashboardLocal : '');
  const dashboardLocalValue = adminLocalScope.ready
    ? effectiveDashboardLocal
    : LOCAL_SCOPE_PENDING;
  const dashboardLocalOptions = !adminLocalScope.ready
    ? [{ value: LOCAL_SCOPE_PENDING, label: 'Cargando local...' }]
    : scopedLocalName
      ? [{ value: scopedLocalName, label: scopedLocalName }]
      : [
          { value: GENERAL_LOCAL, label: 'General' },
          ...locales.map((local) => ({ value: local.nombre, label: local.nombre })),
        ];
  const canChooseDashboardLocal = dashboardLocalOptions.length > 1;
  const dashboardLocalLabel = dashboardLocalOptions.find((option) => option.value === dashboardLocalValue)?.label
    ?? dashboardLocalOptions[0]?.label
    ?? 'General';

  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const orb1Ref = useRef<HTMLSpanElement>(null);
  const orb2Ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');

    if (!token) {
      router.push('/atrevida-gestion/login');
      return;
    }

    if (!adminLocalScope.ready) return;

    const loadResumen = async () => {
      setResumenLoading(true);
      setResumenError(null);

      const resumenRequest = getReservasResumenDB({
        fecha: resumenFecha,
        local: !scopedLocalName ? effectiveDashboardLocal || undefined : undefined,
      });

      const [resumenResult, clientesResult] = await Promise.allSettled([
        resumenRequest,
        getClientesDB({}),
      ]);

      if (resumenResult.status === 'fulfilled') {
        setResumen(resumenResult.value.data ?? EMPTY_RESUMEN);
      } else {
        setResumen(EMPTY_RESUMEN);
        setResumenError(resumenResult.reason instanceof Error ? resumenResult.reason.message : 'No se pudo cargar el resumen');
      }

      if (clientesResult.status === 'fulfilled') {
        setClientesTotal(clientesResult.value.data?.total ?? 0);
      }

      setResumenLoading(false);
    };

    void loadResumen();

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      if (headerRef.current) {
        tl.fromTo(
          headerRef.current,
          { y: -24, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.7 }
        );
      }

      tl.fromTo(
        '.kpi-card',
        { y: 30, opacity: 0, scale: 0.97 },
        { y: 0, opacity: 1, scale: 1, duration: 0.5, stagger: 0.07 },
        '-=0.3'
      );

      tl.fromTo(
        '.bottom-panel',
        { y: 24, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, stagger: 0.1 },
        '-=0.2'
      );

      if (orb1Ref.current) {
        gsap.to(orb1Ref.current, {
          y: '+=30',
          duration: 4.5,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
        });
      }

      if (orb2Ref.current) {
        gsap.to(orb2Ref.current, {
          y: '-=22',
          duration: 3.8,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
          delay: 0.7,
        });
      }
    }, containerRef);

    return () => ctx.revert();
  }, [adminLocalScope.ready, effectiveDashboardLocal, resumenFecha, router, scopedLocalName]);

  const weekBars = getWeekBars(resumen);

  return (
    <div ref={containerRef} className={styles.pageContainer}>
      {/* Orbs */}
      <span ref={orb1Ref} className={`${styles.orb} ${styles.orb1}`} />
      <span ref={orb2Ref} className={`${styles.orb} ${styles.orb2}`} />

      {/* Background mesh */}
      <div className={styles.bgMesh} />

      <Header />

      <main className={styles.main}>
        <div className={styles.container}>
          {/* Page header */}
          <div ref={headerRef} className={styles.headerLayer}>
            <PageHeader
              kicker="Panel de control"
              kickerIcon={<BarChart2 size={14} strokeWidth={2} />}
              title={`${greeting}, ${adminName}`}
              accentWord={adminName}
              subtitle="Gestiona reservas, servicios y operaciones de AtrevidaFit"
              actions={
                <div className={styles.headerMeta}>
                  <div className={styles.dateBadge}>
                    <Calendar size={14} strokeWidth={1.5} className={styles.dateIcon} />
                    {dateString}
                  </div>
                  <div className={styles.scopeControl}>
                    {canChooseDashboardLocal ? (
                      <CustomSelect
                        value={dashboardLocalValue}
                        onChange={(value) => {
                          if (value === LOCAL_SCOPE_PENDING) return;
                          setDashboardLocal(value);
                        }}
                        options={dashboardLocalOptions}
                      />
                    ) : (
                      <button type="button" className={styles.scopeButton} disabled>
                        {dashboardLocalLabel}
                      </button>
                    )}
                  </div>
                </div>
              }
            />
          </div>

          {/* ── KPIs — fila principal ── */}
          <div className={styles.kpiGridPrimary}>
            {makeKpiPrimary(clientesTotal).map((kpi, i) => (
              <div
                key={i}
                className={`kpi-card ${styles.kpiCard}`}
                style={
                  {
                    '--kpi-color': kpi.color,
                    '--kpi-color-rgb': kpi.colorRgb,
                  } as React.CSSProperties
                }
              >
                <div className={styles.kpiBar} />

                <div className={styles.kpiTop}>
                  <span className={styles.kpiIcon}>{kpi.icon}</span>
                  <span className={styles.kpiTrendNeutral}>{kpi.trend}</span>
                </div>

                <div className={styles.kpiValue}>{kpi.getValue(resumen, resumenLoading)}</div>
                <div className={styles.kpiLabel}>{kpi.label}</div>
                <div className={styles.kpiSub}>{kpi.getSub(resumenLoading)}</div>
              </div>
            ))}
          </div>

          {/* ── KPIs — fila secundaria ── */}
          <div className={styles.kpiGridSecondary}>
            {KPI_SECONDARY.map((kpi, i) => (
              <div
                key={i}
                className={`kpi-card ${styles.kpiCard}`}
                style={
                  {
                    '--kpi-color': kpi.color,
                    '--kpi-color-rgb': kpi.colorRgb,
                  } as React.CSSProperties
                }
              >
                <div className={styles.kpiBar} />

                <div className={styles.kpiTop}>
                  <span className={styles.kpiIcon}>{kpi.icon}</span>
                  <span className={styles.kpiTrendNeutral}>{kpi.trend}</span>
                </div>

                <div className={styles.kpiValue}>{kpi.getValue(resumen, resumenLoading)}</div>
                <div className={styles.kpiLabel}>{kpi.label}</div>
                <div className={styles.kpiSub}>{kpi.getSub(resumenLoading)}</div>
              </div>
            ))}
          </div>

          {resumenError && (
            <div className={styles.summaryError} role="status">
              <AlertCircle size={16} strokeWidth={1.7} />
              {resumenError}
            </div>
          )}

          {/* ── Section label ── */}
          <div className={styles.gridLabel}>
            <span className={styles.gridLabelText}>Análisis & actividad</span>
            <span className={styles.gridLabelLine} />
          </div>

          {/* ── Bottom panels ── */}
          <div className={styles.bottomRow}>
            {/* Chart panel */}
            <div className={`bottom-panel ${styles.panelCard}`}>
              <div className={styles.panelHeader}>
                <div className={styles.panelTitleGroup}>
                  <BarChart2 size={15} strokeWidth={1.5} className={styles.panelIcon} />
                  <span className={styles.panelTitle}>
                    Reservas — semana
                  </span>
                </div>
                <span className={styles.liveChip}>
                  <Clock size={10} strokeWidth={1.5} />
                  {resumenFecha}
                </span>
              </div>

              <div className={styles.chartArea}>
                {weekBars.map((bar, i) => (
                  <div key={i} className={styles.barWrap}>
                    <div
                      className={styles.bar}
                      style={{
                        height: bar.height,
                        background: i < 5 ? '#EC008C' : '#92278F',
                      }}
                      aria-label={`${bar.day}: ${bar.value} reservas`}
                    />
                    <strong className={styles.barValue}>{resumenLoading ? '—' : bar.value}</strong>
                    <span className={styles.barLabel}>{bar.day}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity panel */}
            <div className={`bottom-panel ${styles.panelCard}`}>
              <div className={styles.panelHeader}>
                <div className={styles.panelTitleGroup}>
                  <CalendarCheck size={15} strokeWidth={1.5} className={styles.panelIcon} />
                <span className={styles.panelTitle}>Actividad reciente</span>
                </div>
                <span className={styles.liveChip}>Resumen del día</span>
              </div>

              <div className={styles.activitySummary}>
                <div>
                  <span>Reservas agendadas</span>
                  <strong>{resumenLoading ? '—' : resumen.reservas_agendadas_dia}</strong>
                </div>
                <div>
                  <span>Servicios completados</span>
                  <strong>{resumenLoading ? '—' : resumen.servicios_completados_dia}</strong>
                </div>
                <div>
                  <span>Total semanal</span>
                  <strong>{resumenLoading ? '—' : resumen.semana.total_reservas}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <p className={styles.footerNote}>AtrevidaFit Admin · {year}</p>
        </div>
      </main>
    </div>
  );
}
