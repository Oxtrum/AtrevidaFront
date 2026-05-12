'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import gsap from 'gsap';
import {
  CalendarCheck,
  DollarSign,
  Users,
  DoorOpen,
  CheckCircle2,
  CalendarX,
  UserPlus,
  Calendar,
  BarChart2,
  Clock,
} from 'lucide-react';

import Header from '@/components/AdminHeader/Header';
import styles from './page.module.css';

const KPI_PRIMARY = [
  {
    label: 'Reservas del día',
    icon: <CalendarCheck size={16} strokeWidth={1.5} />,
    color: '#EC008C',
    colorRgb: '236, 0, 140',
  },
  {
    label: 'Ingresos de hoy',
    icon: <DollarSign size={16} strokeWidth={1.5} />,
    color: '#92278F',
    colorRgb: '146, 39, 143',
  },
  {
    label: 'Clientes activos',
    icon: <Users size={16} strokeWidth={1.5} />,
    color: '#14AEEF',
    colorRgb: '20, 174, 239',
  }
];

const KPI_SECONDARY = [
  {
    label: 'Servicios completados',
    icon: <CheckCircle2 size={16} strokeWidth={1.5} />,
    color: '#0F6E56',
    colorRgb: '15, 110, 86',
  },
  {
    label: 'Cancelaciones',
    icon: <CalendarX size={16} strokeWidth={1.5} />,
    color: '#D85A30',
    colorRgb: '216, 90, 48',
  }
];

const WEEK_BARS = [
  { day: 'L', height: '40%' },
  { day: 'M', height: '65%' },
  { day: 'X', height: '50%' },
  { day: 'J', height: '80%' },
  { day: 'V', height: '90%' },
  { day: 'S', height: '55%' },
  { day: 'D', height: '30%' },
];

export default function AdminDashboardPage() {
  const router = useRouter();

  const [adminName] = useState('Admin');
  const [greeting, setGreeting] = useState('Hola');
  const [dateString, setDateString] = useState('');
  const [year, setYear] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const orb1Ref = useRef<HTMLSpanElement>(null);
  const orb2Ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');

    if (!token) {
      router.push('/admin/login');
      return;
    }

    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Buenos días');
    else if (hour < 18) setGreeting('Buenas tardes');
    else setGreeting('Buenas noches');

    const raw = new Date().toLocaleDateString('es-BO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    setDateString(raw.charAt(0).toUpperCase() + raw.slice(1));
    setYear(String(new Date().getFullYear()));

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
  }, [router]);

  return (
    <div ref={containerRef} className={styles.pageContainer}>
      {/* Orbs */}
      <span ref={orb1Ref} className={`${styles.orb} ${styles.orb1}`} />
      <span ref={orb2Ref} className={`${styles.orb} ${styles.orb2}`} />

      {/* Background mesh */}
      <div className={styles.bgMesh} />

      {/* Decorative particles */}
      <span className={styles.particle} style={{ top: '8%', left: '6%' }}>
        ✦
      </span>
      <span
        className={styles.particle}
        style={{ top: '70%', right: '4%', opacity: 0.1 }}
      >
        ◎
      </span>

      <Header />

      <main className={styles.main}>
        <div className={styles.container}>
          {/* Page header */}
          <div ref={headerRef} className={styles.pageHeader}>
            <div className={styles.titleBlock}>
              <span className={styles.badge}>
                <span className={styles.badgeDot} />
                Panel Administrativo
              </span>

              <h1 className={styles.title}>
                {greeting},{' '}
                <span className={styles.titleAccent}>{adminName}</span>
              </h1>

              <p className={styles.subtitle}>
                Gestiona reservas, servicios y operaciones de AtrevidaFit
              </p>
            </div>

            <div className={styles.headerActions}>
              <div className={styles.dateBadge}>
                <Calendar
                  size={14}
                  strokeWidth={1.5}
                  className={styles.dateIcon}
                />
                {dateString}
              </div>
            </div>
          </div>

          {/* ── KPIs — fila principal ── */}
          <div className={styles.kpiGridPrimary}>
            {KPI_PRIMARY.map((kpi, i) => (
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
                  <span className={styles.kpiTrendNeutral}>—</span>
                </div>

                <div className={styles.kpiValue}>—</div>
                <div className={styles.kpiLabel}>{kpi.label}</div>
                <div className={styles.kpiSub}>Disponible próximamente</div>
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
                  <span className={styles.kpiTrendNeutral}>—</span>
                </div>

                <div className={styles.kpiValue}>—</div>
                <div className={styles.kpiLabel}>{kpi.label}</div>
                <div className={styles.kpiSub}>Disponible próximamente</div>
              </div>
            ))}
          </div>

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
                    Reservas — últimos 7 días
                  </span>
                </div>
                <span className={styles.comingSoonChip}>
                  <Clock size={10} strokeWidth={1.5} />
                  Próximamente
                </span>
              </div>

              <div className={styles.chartArea}>
                {WEEK_BARS.map((bar, i) => (
                  <div key={i} className={styles.barWrap}>
                    <div
                      className={styles.bar}
                      style={{
                        height: bar.height,
                        background: i < 5 ? '#EC008C' : '#92278F',
                      }}
                    />
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
                <span className={styles.comingSoonChip}>
                  <Clock size={10} strokeWidth={1.5} />
                  Próximamente
                </span>
              </div>

              <div className={styles.emptyState}>
                <CalendarCheck
                  size={28}
                  strokeWidth={1}
                  className={styles.emptyIcon}
                />
                <p className={styles.emptyText}>
                  Las reservas del día aparecerán aquí
                </p>
                <span className={styles.emptyTag}>
                  Disponible al conectar la API
                </span>
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