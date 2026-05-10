'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import gsap from 'gsap';
import {
  CalendarDays,
  BarChart2,
  Clock,
  CheckCircle2,
  Download,
  CalendarCheck,
  BarChart3,
  Settings,
  Calendar,
  ArrowRight,
} from 'lucide-react';

import Header from '@/components/AdminHeader/Header';
import styles from './page.module.css';

interface AdminOption {
  title: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  color: string;
  colorRgb: string;
  badge?: string;
}

const STATS = [
  {
    value: '—',
    label: 'Reservas Hoy',
    icon: <CalendarDays size={20} strokeWidth={1.5} />,
    color: '#EC008C',
  },
  {
    value: '—',
    label: 'Esta Semana',
    icon: <BarChart2 size={20} strokeWidth={1.5} />,
    color: '#92278F',
  },
  {
    value: '—',
    label: 'Pendientes',
    icon: <Clock size={20} strokeWidth={1.5} />,
    color: '#FFE600',
  },
  {
    value: '—',
    label: 'Completadas',
    icon: <CheckCircle2 size={20} strokeWidth={1.5} />,
    color: '#14AEEF',
  },
];

export default function AdminDashboardPage() {
  const router = useRouter();

  const [adminName] = useState('Admin');
  const [greeting, setGreeting] = useState('Hola');
  const [dateString, setDateString] = useState('');
  const [year, setYear] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const orb1Ref = useRef<HTMLSpanElement>(null);
  const orb2Ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');

    if (!token) {
      router.push('/admin/login');
      return;
    }

    // Greeting
    const hour = new Date().getHours();

    if (hour < 12) {
      setGreeting('Buenos días');
    } else if (hour < 18) {
      setGreeting('Buenas tardes');
    } else {
      setGreeting('Buenas noches');
    }

    // Date
    setDateString(
      new Date().toLocaleDateString('es-BO', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
    );

    // Year
    setYear(String(new Date().getFullYear()));

    // GSAP animations
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: 'power3.out' },
      });

      if (headerRef.current) {
        tl.fromTo(
          headerRef.current,
          { y: -24, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.7 }
        );
      }

      const statsChildren = statsRef.current?.children
        ? Array.from(statsRef.current.children)
        : [];

      if (statsChildren.length > 0) {
        tl.fromTo(
          statsChildren,
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.55, stagger: 0.08 },
          '-=0.3'
        );
      }

      tl.fromTo(
        '.admin-card',
        { y: 40, opacity: 0, scale: 0.97 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.55,
          stagger: 0.1,
        },
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

  const handleImportar = async () => {
    try {
      const token = localStorage.getItem('adminToken');

      const res = await fetch('/api/admin/importar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      alert(data.message || 'Importación completada');
    } catch {
      alert('Error al importar');
    }
  };

  const options: AdminOption[] = [
    {
      title: 'Importar Datos',
      description:
        'Sincronizar reservas desde Google Sheets al sistema de gestión',
      icon: <Download size={24} strokeWidth={1.5} />,
      action: handleImportar,
      color: '#EC008C',
      colorRgb: '236, 0, 140',
      badge: 'Sincronizar',
    },
    {
      title: 'Gestionar Reservas',
      description:
        'Ver, editar y administrar todas las citas del centro',
      icon: <CalendarCheck size={24} strokeWidth={1.5} />,
      action: () => router.push('/admin/reservas'),
      color: '#92278F',
      colorRgb: '146, 39, 143',
    },
    {
      title: 'Reportes',
      description:
        'Consultar estadísticas de servicios, clientes y rendimiento',
      icon: <BarChart3 size={24} strokeWidth={1.5} />,
      action: () => alert('Próximamente'),
      color: '#14AEEF',
      colorRgb: '20, 174, 239',
      badge: 'Pronto',
    },
    {
      title: 'Configuración',
      description:
        'Ajustes del sistema, horarios, servicios y personal',
      icon: <Settings size={24} strokeWidth={1.5} />,
      action: () => alert('Próximamente'),
      color: '#FFE600',
      colorRgb: '255, 230, 0',
      badge: 'Pronto',
    },
  ];

  return (
    <div ref={containerRef} className={styles.pageContainer}>
      {/* Orbs */}
      <span ref={orb1Ref} className={`${styles.orb} ${styles.orb1}`} />
      <span ref={orb2Ref} className={`${styles.orb} ${styles.orb2}`} />

      {/* Background mesh */}
      <div className={styles.bgMesh} />

      {/* Decorative particles */}
      <span
        className={styles.particle}
        style={{ top: '8%', left: '6%' }}
      >
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
          {/* Header */}
          <div ref={headerRef} className={styles.pageHeader}>
            <div className={styles.titleBlock}>
              <span className={styles.badge}>
                <span className={styles.badgeDot} />
                Panel Administrativo
              </span>

              <h1 className={styles.title}>
                {greeting},{' '}
                <span className={styles.titleAccent}>
                  {adminName}
                </span>
              </h1>

              <p className={styles.subtitle}>
                Gestiona reservas, servicios y operaciones de
                AtrevidaFit
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

          {/* Stats */}
          <div ref={statsRef} className={styles.statsGrid}>
            {STATS.map((stat, i) => (
              <div
                key={i}
                className={styles.statItem}
                style={
                  {
                    '--stat-color': stat.color,
                  } as React.CSSProperties
                }
              >
                <span className={styles.statIcon}>
                  {stat.icon}
                </span>

                <span className={styles.statValue}>
                  {stat.value}
                </span>

                <span className={styles.statLabel}>
                  {stat.label}
                </span>
              </div>
            ))}
          </div>

          {/* Grid label */}
          <div className={styles.gridLabel}>
            <span className={styles.gridLabelText}>
              Acciones rápidas
            </span>

            <span className={styles.gridLabelLine} />
          </div>

          {/* Cards */}
          <div ref={gridRef} className={styles.grid}>
            {options.map((option, index) => (
              <div
                key={index}
                className={`admin-card ${styles.card}`}
                style={
                  {
                    '--card-color': option.color,
                    '--card-color-rgb': option.colorRgb,
                  } as React.CSSProperties
                }
                onClick={option.action}
                role="button"
                tabIndex={0}
                onKeyDown={(e) =>
                  e.key === 'Enter' && option.action()
                }
              >
                <div className={styles.cardBar} />

                {option.badge && (
                  <span className={styles.cardBadge}>
                    {option.badge}
                  </span>
                )}

                <div className={styles.cardIconWrapper}>
                  <span className={styles.cardIcon}>
                    {option.icon}
                  </span>
                </div>

                <div className={styles.cardContent}>
                  <h3 className={styles.cardTitle}>
                    {option.title}
                  </h3>

                  <p className={styles.cardDesc}>
                    {option.description}
                  </p>
                </div>

                <div className={styles.cardFooter}>
                  <span className={styles.cardCta}>
                    Ver más
                  </span>

                  <ArrowRight
                    size={16}
                    strokeWidth={2}
                    className={styles.cardArrow}
                  />
                </div>

                <div className={styles.cardGlow} />
              </div>
            ))}
          </div>

          {/* Footer */}
          <p className={styles.footerNote}>
            AtrevidaFit Admin · {year}
          </p>
        </div>
      </main>
    </div>
  );
}