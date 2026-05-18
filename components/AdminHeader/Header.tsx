'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import gsap from 'gsap';
import {
  CalendarDays,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  Settings,
  X,
} from 'lucide-react';
import styles from './Header.module.css';
import { AdminThemeToggle } from '@/components/AdminThemeToggle/AdminThemeToggle';

const NAV_LINKS = [
  {
    label: 'Dashboard',
    detail: 'Pulso operativo',
    href: '/admin/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Reservas',
    detail: 'Agenda y clientes',
    href: '/admin/reservas',
    icon: CalendarDays,
  },
  {
    label: 'Configuración',
    detail: 'Locales y servicios',
    href: '/admin/configuracion',
    icon: Settings,
  },
];

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const shellRef = useRef<HTMLElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

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

  const handleLogout = () => {
    gsap.to(shellRef.current, {
      opacity: 0,
      x: -10,
      duration: 0.22,
      ease: 'power2.in',
      onComplete: () => {
        localStorage.removeItem('adminToken');
        router.push('/admin/login');
      },
    });
  };

  return (
    <>
      <div className={styles.mobileBar}>
        <Link href="/admin/dashboard" className={styles.mobileBrand} aria-label="Ir al dashboard">
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
          <Link href="/admin/dashboard" className={styles.brand} aria-label="AtrevidaFit Admin">
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
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);

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

        <div className={styles.sidePanel}>
          <span className={styles.sidePanelLabel}>Hoy</span>
          <strong>Operación limpia</strong>
          <p>Reservas, locales y servicios listos para trabajar sin ruido visual.</p>
        </div>

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
