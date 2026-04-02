'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import styles from './Hero.module.css';

export default function Hero() {
  const heroRef = useRef<HTMLElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: 'power3.out' },
        delay: 0.6, // Wait for header animations
      });

      // Badge fades in
      tl.fromTo(
        badgeRef.current,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6 }
      );

      // Title slides up
      tl.fromTo(
        titleRef.current,
        { y: 50, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8 },
        '-=0.3'
      );

      // Subtitle fades in
      tl.fromTo(
        subtitleRef.current,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6 },
        '-=0.4'
      );

      // CTA buttons pop in
      tl.fromTo(
        ctaRef.current,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5 },
        '-=0.3'
      );

      // Scroll indicator
      tl.fromTo(
        scrollRef.current,
        { opacity: 0 },
        { opacity: 0.5, duration: 0.8 },
        '-=0.2'
      );

      // Animate orbs floating
      gsap.to('.heroOrb', {
        y: '+=20',
        duration: 3,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
        stagger: { each: 0.5 },
      });
    }, heroRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={heroRef} className={styles.hero} id="inicio">
      {/* Ambient orbs */}
      <div className={styles.orbContainer}>
        <div className={`${styles.orb} ${styles.orb1} heroOrb`} />
        <div className={`${styles.orb} ${styles.orb2} heroOrb`} />
        <div className={`${styles.orb} ${styles.orb3} heroOrb`} />
      </div>

      {/* Content */}
      <div className={styles.content}>
        <div ref={badgeRef} className={styles.badge}>
          <span className={styles.badgeDot} />
          Belleza &bull; Cosmética &bull; Cuidado Personal
        </div>

        <h1 ref={titleRef} className={styles.title}>
          <span className={styles.titleGradient}>
            Tu mejor versión comienza aquí
          </span>
        </h1>

        <p ref={subtitleRef} className={styles.subtitle}>
          Descubre nuestros servicios de belleza y cuidado personal que transforman tu rutina.
          Tecnología y salud al servicio de tu bienestar.
        </p>

        <div ref={ctaRef} className={styles.ctaGroup}>
          <a href="#servicios" className={styles.ctaPrimary}>
            <span className={styles.ctaPrimaryText}>Ver Servicios</span>
          </a>
          <a href="#reservar" className={styles.ctaSecondary}>
            ✦ Reservar Cita →
          </a>
        </div>
      </div>

      {/* Swipe indicator */}
      <div ref={scrollRef} className={styles.scrollIndicator}>
        <div className={styles.swipeIndicator}>
          <span className={styles.chevron} />
          <span className={styles.chevron} />
          <span className={styles.chevron} />
        </div>
        <span className={styles.scrollText}>Deslizar</span>
      </div>
    </section>
  );
}
