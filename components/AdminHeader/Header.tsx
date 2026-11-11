'use client';

import { Suspense, useEffect, useRef, useState, type RefObject } from 'react';
import type { LucideIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import gsap from 'gsap';
import {
  Banknote,
  Boxes,
  CalendarDays,
  ClipboardCheck,
  ChevronDown,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  Settings,
  ShieldCheck,
  Users,
  ArrowLeftRight,
  UsersRound,
  X,
} from 'lucide-react';
import styles from './Header.module.css';
import { AdminThemeToggle } from '@/components/AdminThemeToggle/AdminThemeToggle';
import { NotificationBell } from './NotificationBell';
import { canViewAdminPayments, canViewFinancialReports, clearStoredAdminSession, isAdminSys } from '@/lib/auth/adminSession';

const BASE = '/atrevida-gestion';

type NavAccess = 'financial' | 'payments' | 'adminSys';

/** Destino del menú. Si varias entradas comparten `path`, `param` dice qué pestaña (?clave=valor) abre cada una. */
interface NavTarget {
  label: string;
  path: string;
  param?: [key: string, value: string];
  /** Marca la entrada que se abre sin parámetro (o con uno que ninguna hermana reclama). */
  defaultParam?: string;
  /** Solo coincide con la ruta exacta, no con sus subrutas. */
  exact?: boolean;
  access?: NavAccess;
  icon?: LucideIcon;
  detail?: string;
}

interface NavLinkItem extends NavTarget {
  icon: LucideIcon;
  detail: string;
}

interface NavGroupItem {
  label: string;
  detail: string;
  icon: LucideIcon;
  children: NavTarget[];
}

type NavItem = NavLinkItem | NavGroupItem;

const isGroup = (item: NavItem): item is NavGroupItem => 'children' in item;

// Lo del día a día va suelto; el resto se agrupa en submenús. Cada pestaña de una pantalla
// (Clientes, Finanzas, Reservas) tiene su propia entrada que abre esa pestaña por la URL.
const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', detail: 'Pulso operativo', path: `${BASE}/dashboard`, icon: LayoutDashboard },
  { label: 'Reservas', detail: 'Agenda y clientes', path: `${BASE}/reservas`, defaultParam: 'vista', icon: CalendarDays },
  {
    label: 'Aprobaciones',
    detail: 'Solicitudes pendientes',
    path: `${BASE}/reservas`,
    param: ['vista', 'pendientes'],
    icon: ShieldCheck,
  },
  { label: 'Atenciones', detail: 'Servicios realizados', path: `${BASE}/atenciones`, icon: ClipboardCheck },
  { label: 'Cobros', detail: 'Registrar una venta', path: `${BASE}/caja`, icon: Banknote },
  {
    label: 'Clientes',
    detail: 'Directorio, deudas y paquetes',
    icon: Users,
    children: [
      { label: 'Directorio', path: `${BASE}/clientes`, defaultParam: 'vista' },
      { label: 'Con deuda', path: `${BASE}/clientes`, param: ['vista', 'deuda'] },
      { label: 'Paquetes activos', path: `${BASE}/clientes`, param: ['vista', 'paquetes'] },
    ],
  },
  { label: 'Inventario', detail: 'Stock y compras', path: `${BASE}/inventario`, icon: Boxes },
  {
    label: 'Finanzas',
    detail: 'Todo el dinero',
    icon: ArrowLeftRight,
    children: [
      { label: 'Movimientos', path: `${BASE}/finanzas`, defaultParam: 'tab', access: 'financial' },
      { label: 'Resumen', path: `${BASE}/finanzas`, param: ['tab', 'resumen'], access: 'financial' },
      { label: 'Ventas', path: `${BASE}/finanzas`, param: ['tab', 'ventas'], access: 'financial' },
      { label: 'Historial de pagos', path: `${BASE}/pagos`, access: 'payments', icon: CreditCard, detail: 'Auditoría de pagos' },
    ],
  },
  {
    label: 'Recursos Humanos',
    detail: 'Personal y reportes',
    icon: UsersRound,
    children: [
      { label: 'Empleados y planillas', path: `${BASE}/rrhh`, exact: true, access: 'financial' },
      { label: 'Reportes de recursos humanos', path: `${BASE}/rrhh/reportes`, access: 'financial' },
    ],
  },
  {
    label: 'Configuración',
    detail: 'Locales y servicios',
    icon: Settings,
    children: [
      { label: 'General', path: `${BASE}/configuracion`, exact: true },
      { label: 'Categorías', path: `${BASE}/configuracion/categorias` },
      { label: 'Locales', path: `${BASE}/configuracion/locales` },
      { label: 'Servicios', path: `${BASE}/configuracion/servicios` },
      { label: 'Catálogo de paquetes', path: `${BASE}/configuracion/paquetes` },
      { label: 'Usuarios', path: `${BASE}/configuracion/usuarios`, access: 'adminSys' },
      { label: 'Gastos fijos', path: `${BASE}/configuracion/gastos-fijos`, access: 'adminSys' },
      { label: 'Categorías financieras', path: `${BASE}/configuracion/categorias-financieras`, access: 'adminSys' },
      { label: 'Categorías de inventario', path: `${BASE}/configuracion/categorias-inventario`, access: 'adminSys' },
      { label: 'Inventario y finanzas', path: `${BASE}/configuracion/parametros` },
    ],
  },
];

const ALL_TARGETS: NavTarget[] = NAV_ITEMS.flatMap((item) => (isGroup(item) ? item.children : [item]));

const hrefOf = (target: NavTarget) =>
  target.param ? `${target.path}?${target.param[0]}=${target.param[1]}` : target.path;

function isTargetActive(target: NavTarget, pathname: string, search: URLSearchParams): boolean {
  const onPath = target.exact
    ? pathname === target.path
    : pathname === target.path || pathname.startsWith(`${target.path}/`);
  if (!onPath) return false;

  const key = target.param?.[0] ?? target.defaultParam;
  if (!key) return true;

  const current = search.get(key);
  if (target.param) return current === target.param[1];
  return !ALL_TARGETS.some(
    (other) => other !== target && other.path === target.path && other.param?.[0] === key && other.param[1] === current
  );
}

type NavPermissions = Record<NavAccess, boolean>;

const canSee = (target: NavTarget, permissions: NavPermissions) => !target.access || permissions[target.access];

interface NavListProps {
  pathname: string;
  permissions: NavPermissions;
  onNavigate: () => void;
  navRef: RefObject<HTMLElement | null>;
}

function NavList({ pathname, permissions, onNavigate, navRef }: NavListProps) {
  const search = useSearchParams();

  // La entrada animada vive aqui y no en Header: NavList se hidrata dentro de un Suspense, y animar
  // desde Header tocaria el HTML del servidor antes de hidratarlo (error de hidratacion por el style).
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.adminNavItem',
        { x: -10, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.34, stagger: 0.06, delay: 0.12, ease: 'power3.out', clearProps: 'transform,opacity' }
      );
    }, navRef);

    return () => ctx.revert();
  }, [navRef]);

  // Lo que el usuario abre o cierra a mano manda; si no ha tocado el grupo, se abre solo cuando contiene la ruta activa.
  const [openOverride, setOpenOverride] = useState<Record<string, boolean>>({});

  const renderLink = (target: NavLinkItem) => {
    const Icon = target.icon;
    const active = isTargetActive(target, pathname, search);

    return (
      <Link
        key={hrefOf(target)}
        href={hrefOf(target)}
        className={`${styles.navLink} adminNavItem ${active ? styles.navLinkActive : ''}`}
        aria-current={active ? 'page' : undefined}
        onClick={onNavigate}
      >
        <span className={styles.navIcon}>
          <Icon size={19} strokeWidth={1.7} />
        </span>
        <span className={styles.navCopy}>
          <span className={styles.navLabel}>{target.label}</span>
          <span className={styles.navDetail}>{target.detail}</span>
        </span>
      </Link>
    );
  };

  return (
    <>
      {NAV_ITEMS.map((item) => {
        if (!isGroup(item)) return canSee(item, permissions) ? renderLink(item) : null;

        const children = item.children.filter((child) => canSee(child, permissions));
        if (children.length === 0) return null;
        // Un submenú de una sola entrada no aporta: se muestra como enlace directo.
        if (children.length === 1) {
          const [only] = children;
          return renderLink({ ...only, icon: only.icon ?? item.icon, detail: only.detail ?? item.detail });
        }

        const Icon = item.icon;
        const hasActiveChild = children.some((child) => isTargetActive(child, pathname, search));
        const open = openOverride[item.label] ?? hasActiveChild;
        const panelId = `nav-sub-${item.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

        return (
          <div key={item.label} className={styles.navGroup}>
            <button
              type="button"
              className={`${styles.navLink} ${styles.navGroupButton} adminNavItem ${hasActiveChild ? styles.navLinkActive : ''}`}
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => setOpenOverride((prev) => ({ ...prev, [item.label]: !open }))}
            >
              <span className={styles.navIcon}>
                <Icon size={19} strokeWidth={1.7} />
              </span>
              <span className={styles.navCopy}>
                <span className={styles.navLabel}>{item.label}</span>
                <span className={styles.navDetail}>{item.detail}</span>
              </span>
              <ChevronDown size={16} strokeWidth={1.8} className={`${styles.navChevron} ${open ? styles.navChevronOpen : ''}`} />
            </button>
            <div id={panelId} className={`${styles.subMenu} ${open ? styles.subMenuOpen : ''}`}>
              <div className={styles.subMenuInner}>
                {children.map((child) => {
                  const active = isTargetActive(child, pathname, search);
                  return (
                    <Link
                      key={hrefOf(child)}
                      href={hrefOf(child)}
                      className={`${styles.subLink} ${active ? styles.subLinkActive : ''}`}
                      aria-current={active ? 'page' : undefined}
                      onClick={onNavigate}
                    >
                      {child.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const shellRef = useRef<HTMLElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [showAdminPayments, setShowAdminPayments] = useState(false);
  const [showFinancialReports, setShowFinancialReports] = useState(false);
  const [showAdminSys, setShowAdminSys] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShowAdminPayments(canViewAdminPayments());
      setShowFinancialReports(canViewFinancialReports());
      setShowAdminSys(isAdminSys());
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    // En móvil el sidebar se posiciona con transform (translateX) vía CSS; animar
    // el shell con GSAP escribiría un transform inline que pisa ese CSS y rompe el
    // abrir/cerrar. Solo animamos el shell en desktop y limpiamos el transform al
    // terminar para que un resize a móvil no quede con el inline colgado.
    const isMobile = window.matchMedia('(max-width: 900px)').matches;
    const ctx = gsap.context(() => {
      if (!isMobile) {
        gsap.fromTo(
          shellRef.current,
          { x: -18, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.46, ease: 'power3.out', clearProps: 'transform' }
        );
      }
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
        clearStoredAdminSession();
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
        </div>

        <nav ref={navRef} className={styles.nav} aria-label="Navegación administrativa">
          <Suspense fallback={null}>
            <NavList
              pathname={pathname}
              permissions={{ financial: showFinancialReports, payments: showAdminPayments, adminSys: showAdminSys }}
              onNavigate={() => setMobileOpen(false)}
              navRef={navRef}
            />
          </Suspense>
        </nav>

     
        <div className={styles.footer}>
          <AdminThemeToggle soloIcono className={styles.footerIcon} />
          <Link href="/" className={`${styles.publicLink} ${styles.footerIcon}`} title="Sitio público" aria-label="Sitio público">
            <PanelLeftClose size={17} strokeWidth={1.7} />
          </Link>
          <button type="button" className={`${styles.logoutButton} ${styles.footerIcon}`} onClick={handleLogout} title="Cerrar sesión" aria-label="Cerrar sesión">
            <LogOut size={17} strokeWidth={1.8} />
          </button>
        </div>
      </aside>
    </>
  );
}
