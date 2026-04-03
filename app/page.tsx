'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import gsap from 'gsap';
import styles from './placeholder.module.css';

export default function PlaceholderPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const socialRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: 'power3.out' },
      });

      // Logo entrance
      tl.fromTo(
        logoRef.current,
        { scale: 0.5, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.8, ease: 'back.out(1.7)', delay: 0.2 }
      );

      // Entry sequence
      tl.fromTo(
        badgeRef.current,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, delay: 0.5 }
      );

      tl.fromTo(
        titleRef.current,
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8 },
        '-=0.3'
      );

      tl.fromTo(
        subtitleRef.current,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6 },
        '-=0.4'
      );

      tl.fromTo(
        socialRef.current?.children || [],
        { y: 20, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          stagger: 0.1,
          ease: 'back.out(1.7)',
        },
        '-=0.2'
      );

      tl.fromTo(
        footerRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 1 },
        '+=0.5'
      );

      // Ambient floating orbs
      gsap.to('.orb', {
        y: '+=30',
        x: '+=10',
        duration: 4,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
        stagger: { each: 0.5 },
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <main ref={containerRef} className={styles.container}>
      {/* Ambient Orbs */}
      <div className={styles.orbContainer}>
        <div className={`${styles.orb} ${styles.orb1} orb`} />
        <div className={`${styles.orb} ${styles.orb2} orb`} />
        <div className={`${styles.orb} ${styles.orb3} orb`} />
      </div>

      {/* Main Content */}
      <div className={styles.content}>
        {/* Star Logo with pulse animation */}
        <div ref={logoRef} className={styles.logoWrapper}>
          <div className={styles.pulseRing} />
          <div className={styles.pulseRing2} />
          <Image
            src="/estrella.png"
            alt="AtrevidaFit"
            width={90}
            height={90}
            className={styles.logoImage}
            priority
          />
        </div>

        <div ref={badgeRef} className={styles.badge}>
          <span className={styles.badgeDot} />
          Tecnología &bull; Salud &bull; Belleza
        </div>

        <h1 ref={titleRef} className={styles.title}>
          <span className={styles.titleGradient}>
            Página en Construcción
          </span>
        </h1>

        <p ref={subtitleRef} className={styles.subtitle}>
          Estamos trabajando para brindarte una experiencia renovada en belleza y cuidado personal.
          Pronto estaremos contigo.
        </p>

        {/* Social Links (Placeholders with Icons) */}
        <div ref={socialRef} className={styles.socialLinks}>
          <a href="https://www.instagram.com/atrevida.fit/" className={`${styles.socialIcon} ${styles.socialIconInstagram}`} aria-label="Instagram">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
          </a>
          <a href="https://www.facebook.com/atrevida.fit/" className={`${styles.socialIcon} ${styles.socialIconFacebook}`} aria-label="Facebook">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
          </a>
          <a href="https://www.tiktok.com/@atrevida.fit" className={`${styles.socialIcon} ${styles.socialIconTikTok}`} aria-label="TikTok">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"></path></svg>
          </a>
        </div>
      </div>

      <div ref={footerRef} className={styles.footerNote}>
        © 2026 Atrevida.Fit Todos los derechos reservados.
      </div>
    </main>
  );
}
