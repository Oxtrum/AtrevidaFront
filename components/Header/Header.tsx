'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import gsap from 'gsap';
import styles from './Header.module.css';

const NAV_LINKS = [
  { label: 'Inicio', href: '#inicio' },
  { label: 'Servicios', href: '#servicios' },
  { label: 'Nosotros', href: '#nosotros' },
  { label: 'Contacto', href: '#contacto' },
];

export default function Header() {
  const headerRef = useRef<HTMLElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const navLinksRef = useRef<HTMLAnchorElement[]>([]);
  const ctaRef = useRef<HTMLAnchorElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Entrance animations
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      // Logo slides in from left
      tl.fromTo(
        logoRef.current,
        { x: -60, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.8 }
      );

      // Nav links stagger from top
      tl.fromTo(
        navLinksRef.current,
        { y: -30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, stagger: 0.1 },
        '-=0.4'
      );

      // CTA button pops in
      tl.fromTo(
        ctaRef.current,
        { scale: 0.8, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.5 },
        '-=0.2'
      );

      // Gradient line fades in
      if (headerRef.current) {
        tl.fromTo(
          headerRef.current,
          { '--line-opacity': 0 } as any,
          { '--line-opacity': 0.6, duration: 0.6 } as any,
          '-=0.3'
        );
      }
    }, headerRef);

    return () => ctx.revert();
  }, []);

  // Scroll listener
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 50);
    };
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
        <div ref={logoRef} className={styles.logoContainer}>
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

        {/* Desktop Nav */}
        <nav className={styles.nav}>
          {NAV_LINKS.map((link, i) => (
            <a
              key={link.href}
              ref={(el) => { if (el) navLinksRef.current[i] = el; }}
              href={link.href}
              className={styles.navLink}
            >
              {link.label}
            </a>
          ))}
          <a
            ref={ctaRef}
            href="#contacto"
            className={styles.ctaButton}
          >
            <span className={styles.ctaButtonText}>✦ Reservar</span>
          </a>
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
        <div className={styles.mobileMenuOrb} />
        {NAV_LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className={`${styles.mobileNavLink} mobileNavItem`}
            onClick={() => setMobileOpen(false)}
          >
            {link.label}
          </a>
        ))}
        <a
          href="#contacto"
          className={`${styles.ctaButton} mobileNavItem`}
          onClick={() => setMobileOpen(false)}
          style={{ marginTop: '1rem', fontSize: '1rem', padding: '0.8rem 2.5rem' }}
        >
          <span className={styles.ctaButtonText}>✦ Reservar</span>
        </a>
      </div>
    </>
  );
}
