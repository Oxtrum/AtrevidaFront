'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import gsap from 'gsap';
import styles from './Header.module.css';

const NAV_LINKS = [
  { label: 'Inicio', href: '/', section: 'inicio' },
  { label: 'Servicios', href: '/#servicios', section: 'servicios' },
  { label: 'Nosotros', href: '/#nosotros', section: 'nosotros' },
  { label: 'Contacto', href: '/#contacto', section: 'contacto' },
  { label: 'Reservas', href: '/reservas', section: 'reservas' },
];

export default function Header() {
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const navLinksRef = useRef<HTMLAnchorElement[]>([]);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('inicio');

  // Entrance animations
  useEffect(() => {
    // Guarded GSAP entrance animations: only run when targets exist.
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      if (logoRef.current) {
        tl.fromTo(
          logoRef.current,
          { x: -60, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.8 }
        );
      }

      // navLinksRef may be an array of anchors; ensure at least one exists
      const navTargets = navLinksRef.current.filter(Boolean);
      if (navTargets.length > 0) {
        tl.fromTo(
          navTargets,
          { y: -30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5, stagger: 0.1 },
          '-=0.4'
        );
      }

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

  useEffect(() => {
    if (pathname !== '/') {
      return;
    }

    const sectionIds = NAV_LINKS
      .map((link) => link.section)
      .filter((section) => section !== 'reservas');

    const updateActiveSection = () => {
      const headerOffset = 130;
      const currentSection = sectionIds.reduce((current, section) => {
        const element = document.getElementById(section);
        if (!element) return current;

        const sectionTop = element.getBoundingClientRect().top + window.scrollY;
        return window.scrollY + headerOffset >= sectionTop ? section : current;
      }, 'inicio');

      setActiveSection(currentSection);
    };

    updateActiveSection();
    window.addEventListener('scroll', updateActiveSection, { passive: true });
    window.addEventListener('resize', updateActiveSection);

    return () => {
      window.removeEventListener('scroll', updateActiveSection);
      window.removeEventListener('resize', updateActiveSection);
    };
  }, [pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  // Animate mobile menu links in
  useEffect(() => {
    if (mobileOpen) {
      // Only animate items that are present in the DOM
      const items = Array.from(document.querySelectorAll('.mobileNavItem'));
      if (items.length > 0) {
        gsap.fromTo(
          items,
          { y: 40, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.4, stagger: 0.08, ease: 'power3.out', delay: 0.1 }
        );
      }
    }
  }, [mobileOpen]);

  const headerClasses = [
    styles.header,
    scrolled ? styles.headerScrolled : '',
  ].join(' ').trim();

  const effectiveActiveSection = pathname === '/'
    ? activeSection
    : pathname.startsWith('/reservas') ? 'reservas' : 'inicio';
  const isLinkActive = (section: string) => effectiveActiveSection === section;

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
              className={`${styles.navLink} ${isLinkActive(link.section) ? styles.navLinkActive : ''}`}
              aria-current={isLinkActive(link.section) ? 'page' : undefined}
              ref={(el) => { if (el) navLinksRef.current[i] = el; }}
            >
              {link.label}
            </Link>
          ))}
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
            className={`${styles.mobileNavLink} ${isLinkActive(link.section) ? styles.mobileNavLinkActive : ''} mobileNavItem`}
            aria-current={isLinkActive(link.section) ? 'page' : undefined}
            onClick={() => setMobileOpen(false)}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </>
  );
}
