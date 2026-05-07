'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import gsap from 'gsap';
import styles from './Header.module.css';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

const NAV_LINKS = [
  { label: 'Inicio', href: '/admin/dashboard' },
  { label: 'Reservas', href: '/admin/reservas' },
];

export default function Header() {


  const headerRef = useRef<HTMLElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const navLinksRef = useRef<HTMLAnchorElement[]>([]);
  const ctaRef = useRef<HTMLButtonElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);


  const router = useRouter();
  const handleLogout = () => {
    gsap.to(headerRef.current, {
      opacity: 0, y: -10, duration: 0.3, ease: 'power2.in',
      onComplete: () => {
        localStorage.removeItem('adminToken');
        router.push('/admin/login');
      }
    });
  };
  // Entrance animations
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.fromTo(logoRef.current,
        { x: -60, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.8 }
      )
        .fromTo(navLinksRef.current,
          { y: -30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5, stagger: 0.1 },
          '-=0.4'
        )
        .fromTo(ctaRef.current,
          { scale: 0.8, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.5 },
          '-=0.2'
        );

      // Gradient line fades in
      if (headerRef.current) {
        gsap.fromTo(
          headerRef.current,
          { opacity: 0 },
          { opacity: 1, duration: 0.6 }
        );
      }
    }, headerRef);

    return () => ctx.revert();
  }, []);

  // Scroll listener
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  // Animate mobile menu links in
  useEffect(() => {
    if (mobileOpen) {
      gsap.fromTo(
        '.mobileNavItem',
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, stagger: 0.08, ease: 'power3.out', delay: 0.1 }
      );
    }
  }, [mobileOpen]);

  const headerClasses = [
    styles.header,
    scrolled ? styles.headerScrolled : '',
  ].join(' ');

  return (
    <>
      <header ref={headerRef} className={headerClasses}>
        {/* Logo */}
        <Link href="/">
          <div ref={logoRef} className={styles.logo}>
            <Image
              src="/estrella.png"
              alt="AtrevidaFit Logo"
              width={50}
              height={50}
              className={styles.logoImage}
              priority
            />
            <span className={styles.logoText}>ATREVIDAFIT</span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className={styles.nav}>
          {NAV_LINKS.map((link, i) => (
            <Link
              key={link.href}
              href={link.href}
              className={styles.navLink}
              ref={(el) => { if (el) navLinksRef.current[i] = el; }}
            >
              {link.label}
            </Link>
          ))}
          {/* Logout Button */}
          <button
            ref={ctaRef}
            className={`${styles.ctaButton} ${styles.logoutButton}`}
            onClick={handleLogout}
          >
            <div className={styles.ctaButtonText} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <LogOut size={18} strokeWidth={2.5} />
              <span>Cerrar Sesión</span>
            </div>
          </button>
        </nav>

        {/* Hamburger */}
        <button
          className={`${styles.hamburger} ${mobileOpen ? styles.hamburgerOpen : ''}`}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          <span className={styles.hamburgerLine} />
          <span className={styles.hamburgerLine} />
          <span className={styles.hamburgerLine} />
        </button>
      </header>

      {/* Mobile Menu */}
      <div className={`${styles.mobileMenu} ${mobileOpen ? styles.mobileMenuOpen : ''}`}>
        <div className={styles.mobileMenuOrb} />
        <div className={styles.mobileMenuOrb2} />
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`${styles.mobileNavLink} mobileNavItem`}
            onClick={() => setMobileOpen(false)}
          >
            {link.label}
          </Link>
        ))}
        {/* Mobile Logout */}
        <button
          className={`${styles.mobileLogout} mobileNavItem`}
          onClick={handleLogout}
        >
          <div className={styles.ctaButtonText} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <LogOut size={24} strokeWidth={2} />
            <span>Cerrar Sesión</span>
          </div>
        </button>
      </div>
    </>
  );
}
