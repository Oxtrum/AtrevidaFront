'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import styles from './Hero.module.css';

export default function Hero() {
  const heroRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const visualRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: 'power3.out' },
        delay: 0.3,
      });

      // Content side animations
      tl.fromTo(
        badgeRef.current,
        { x: -30, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.6 }
      );

      tl.fromTo(
        titleRef.current,
        { x: -50, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.8 },
        '-=0.3'
      );

      tl.fromTo(
        subtitleRef.current,
        { x: -40, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.6 },
        '-=0.4'
      );

      tl.fromTo(
        ctaRef.current,
        { x: -30, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.5 },
        '-=0.3'
      );

      // Visual side animations
      tl.fromTo(
        visualRef.current,
        { x: 50, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.8 },
        '-=0.8'
      );

      // Animate orbs with spring physics
      gsap.to('.heroOrb', {
        y: '+=24',
        duration: 3.5,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
        stagger: { each: 0.6 },
      });
    }, heroRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={heroRef} className={styles.hero} id="inicio">
      {/* Background orbs */}
      <div className={styles.orbContainer}>
        <div className={`${styles.orb} ${styles.orb1} heroOrb`} />
        <div className={`${styles.orb} ${styles.orb2} heroOrb`} />
        <div className={`${styles.orb} ${styles.orb3} heroOrb`} />
      </div>

      {/* Split Layout: Content (Left) + Visual (Right) */}
      <div className={styles.container}>
        {/* Content Side */}
        <div ref={contentRef} className={styles.contentSide}>
          <div ref={badgeRef} className={styles.badge}>
            <span className={styles.badgeDot} />
            Belleza Premium
          </div>

          <h1 ref={titleRef} className={styles.title}>
            Tu mejor versión<br />
            <span className={styles.titleAccent}>comienza aquí</span>
          </h1>

          <p ref={subtitleRef} className={styles.subtitle}>
            Descubre servicios de belleza y cuidado personal que transforman tu rutina. Tecnología y salud al servicio de tu bienestar.
          </p>

          <div ref={ctaRef} className={styles.ctaGroup}>
            <a href="#servicios" className={styles.ctaPrimary}>
              <span style={{ position: 'relative', zIndex: 2 }}>Ver Servicios</span>
            </a>
            <a href="/reservas" className={styles.ctaSecondary}>
              <span style={{ position: 'relative', zIndex: 2 }}>Reservar Cita →</span>
            </a>
          </div>
        </div>

        {/* Visual Side */}
        <div ref={visualRef} className={styles.visualSide}>
          <div className={styles.visualCard}>
            <div className={styles.visualPlaceholder}>
              <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="100" cy="100" r="95" stroke="currentColor" strokeWidth="2" opacity="0.2" />
                <circle cx="100" cy="100" r="70" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
                <circle cx="100" cy="100" r="45" stroke="currentColor" strokeWidth="1" opacity="0.4" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
