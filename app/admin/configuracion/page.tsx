'use client';

import { useRouter } from 'next/navigation';
import { Tags, Building2, Scissors } from 'lucide-react';
import Header from '@/components/AdminHeader/Header';
import styles from './page.module.css';

const OPTIONS = [
  {
    title: 'Categorías',
    description: 'Administrar categorías de servicios',
    icon: <Tags size={24} strokeWidth={1.5} />,
    href: '/admin/configuracion/categorias',
    color: '#2563eb',
    colorRgb: '37, 99, 235',
  },
  {
    title: 'Locales',
    description: 'Gestionar sucursales y sus espacios',
    icon: <Building2 size={24} strokeWidth={1.5} />,
    href: '/admin/configuracion/locales',
    color: '#7c3aed',
    colorRgb: '124, 58, 237',
  },
  {
    title: 'Servicios',
    description: 'Configurar servicios ofrecidos por local',
    icon: <Scissors size={24} strokeWidth={1.5} />,
    href: '/admin/configuracion/servicios',
    color: '#10b981',
    colorRgb: '16, 185, 129',
  },
];

export default function ConfiguracionPage() {
  const router = useRouter();

  return (
    <div className={styles.pageContainer}>
      <Header />
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.pageHeader}>
            <div className={styles.titleBlock}>
              <span className={styles.badge}>
                <span className={styles.badgeDot} />
                Configuración
              </span>
              <h1 className={styles.title}>
                Ajustes del{' '}
                <span className={styles.titleAccent}>Sistema</span>
              </h1>
              <p className={styles.subtitle}>
                Administra categorías, locales y servicios del centro
              </p>
            </div>
          </div>

          <div className={styles.gridLabel}>
            <span className={styles.gridLabelText}>Módulos</span>
            <span className={styles.gridLabelLine} />
          </div>

          <div className={styles.grid}>
            {OPTIONS.map((opt) => (
              <div
                key={opt.href}
                className={styles.card}
                style={{ '--card-color': opt.color, '--card-color-rgb': opt.colorRgb } as React.CSSProperties}
                onClick={() => router.push(opt.href)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && router.push(opt.href)}
              >
                <div className={styles.cardBar} />
                <div className={styles.cardIconWrapper}>
                  <span className={styles.cardIcon}>{opt.icon}</span>
                </div>
                <div className={styles.cardContent}>
                  <h3 className={styles.cardTitle}>{opt.title}</h3>
                  <p className={styles.cardDesc}>{opt.description}</p>
                </div>
                <div className={styles.cardFooter}>
                  <span className={styles.cardCta}>Administrar</span>
                </div>
                <div className={styles.cardGlow} />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
