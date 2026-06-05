'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import gsap from 'gsap';
import {
  CalendarDays,
  Clock3,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  Settings,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import styles from './Header.module.css';
import { AdminThemeToggle } from '@/components/AdminThemeToggle/AdminThemeToggle';
import { NotificationBell } from './NotificationBell';

const NAV_LINKS = [
  {
    label: 'Dashboard',
    detail: 'Pulso operativo',
    href: '/atrevida-gestion/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Reservas',
    detail: 'Agenda y clientes',
    href: '/atrevida-gestion/reservas',
    icon: CalendarDays,
  },
  {
    label: 'Aprobaciones',
    detail: 'Solicitudes pendientes',
    href: '/atrevida-gestion/reservas/aprobacion',
    icon: ShieldCheck,
  },
  {
    label: 'Citas próximas',
    detail: 'Recordatorios de hoy',
    href: '/atrevida-gestion/reservas/proximas',
    icon: Clock3,
  },
  {
    label: 'Pagos',
    detail: 'Gestión de pagos',
    href: '/atrevida-gestion/pagos',
    icon: CreditCard,
  },
  {
    label: 'Clientes',
    detail: 'Directorio de clientes',
    href: '/atrevida-gestion/clientes',
    icon: Users,
  },
  {
    label: 'Configuración',
    detail: 'Locales y servicios',
    href: '/atrevida-gestion/configuracion',
    icon: Settings,
  },
];

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const shellRef = useRef<HTMLElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        shellRef.current,
        { x: -18, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.46, ease: 'power3.out' }
      );

      gsap.fromTo(
        '.adminNavItem',
        { x: -10, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.34, stagger: 0.06, delay: 0.12, ease: 'power3.out' }
      );
    }, shellRef);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 900px)');
    const syncViewport = () => setIsMobileViewport(mediaQuery.matches);

    syncViewport();
    mediaQuery.addEventListener('change', syncViewport);

    return () => mediaQuery.removeEventListener('change', syncViewport);
  }, []);

  const handleLogout = () => {
    gsap.to(shellRef.current, {
      opacity: 0,
      x: -10,
      duration: 0.22,
      ease: 'power2.in',
      onComplete: () => {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        router.push('/atrevida-gestion/login');
      },
    });
  };

  return (
    <>
      <div className={styles.mobileBar}>
        <Link href="/atrevida-gestion/dashboard" className={styles.mobileBrand} aria-label="Ir al dashboard">
          <Image
            src="/estrella.png"
            alt=""
            width={30}
            height={30}
            className={styles.mobileLogo}
            priority
          />
          <span>AtrevidaFit Admin</span>
        </Link>
        <div className={styles.mobileActions}>
          {isMobileViewport && <NotificationBell />}
          <button
            type="button"
            className={styles.mobileMenuButton}
            onClick={() => setMobileOpen((open) => !open)}
            aria-label={mobileOpen ? 'Cerrar navegación' : 'Abrir navegación'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={19} strokeWidth={1.8} /> : <Menu size={19} strokeWidth={1.8} />}
          </button>
        </div>
      </div>

      <div className={styles.desktopActions}>
        {!isMobileViewport && <NotificationBell />}
      </div>

      {mobileOpen && (
        <button
          type="button"
          className={styles.backdrop}
          aria-label="Cerrar navegación"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        ref={shellRef}
        className={`${styles.sidebar} admin-sidebar-shell ${mobileOpen ? styles.sidebarOpen : ''}`}
      >
        <div className={styles.brandBlock}>
          <Link href="/atrevida-gestion/dashboard" className={styles.brand} aria-label="AtrevidaFit Admin">
            <span className={styles.logoShell}>
              <Image
                src="/estrella.png"
                alt=""
                width={40}
                height={40}
                className={styles.logoImage}
                priority
              />
            </span>
            <span className={styles.brandText}>
              <strong>AtrevidaFit</strong>
              <span>Admin Studio</span>
            </span>
          </Link>
          <span className={styles.liveBadge}>
            <span className={styles.liveDot} />
            Panel activo
          </span>
        </div>

        <nav className={styles.nav} aria-label="Navegación administrativa">
          {NAV_LINKS.map((link) => {
            const Icon = link.icon;
            const active = link.href === '/atrevida-gestion/reservas'
              ? pathname === link.href || pathname.startsWith('/atrevida-gestion/reservas/crear') || pathname.startsWith('/atrevida-gestion/reservas/editar')
              : pathname === link.href || pathname.startsWith(`${link.href}/`);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`${styles.navLink} adminNavItem ${active ? styles.navLinkActive : ''}`}
                aria-current={active ? 'page' : undefined}
                onClick={() => setMobileOpen(false)}
              >
                <span className={styles.navIcon}>
                  <Icon size={19} strokeWidth={1.7} />
                </span>
                <span className={styles.navCopy}>
                  <span className={styles.navLabel}>{link.label}</span>
                  <span className={styles.navDetail}>{link.detail}</span>
                </span>
              </Link>
            );
          })}
        </nav>

     
        <div className={styles.footer}>
          <AdminThemeToggle />
          <Link href="/" className={styles.publicLink}>
            <PanelLeftClose size={17} strokeWidth={1.7} />
            Sitio público
          </Link>
          <button type="button" className={styles.logoutButton} onClick={handleLogout}>
            <LogOut size={17} strokeWidth={1.8} />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}
