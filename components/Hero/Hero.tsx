'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import gsap from 'gsap';
import { ArrowRight, CalendarCheck, CheckCircle2, Sparkles } from 'lucide-react';
import styles from './Hero.module.css';

export default function Hero() {
  const heroRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const visualRef = useRef<HTMLDivElement>(null);
  const proofRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduceMotion) return;

      const tl = gsap.timeline({
        defaults: { ease: 'power3.out' },
        delay: 0.18,
      });

      tl.fromTo(
        badgeRef.current,
        { x: -34, opacity: 0, clipPath: 'inset(0 100% 0 0)' },
        { x: 0, opacity: 1, clipPath: 'inset(0 0% 0 0)', duration: 0.58 }
      );

      tl.fromTo(
        titleRef.current,
        { y: 64, opacity: 0, rotateX: -14, clipPath: 'inset(0 0 100% 0)' },
        { y: 0, opacity: 1, rotateX: 0, clipPath: 'inset(0 0 0% 0)', duration: 0.92, force3D: true },
        '-=0.18'
      );

      tl.fromTo(
        subtitleRef.current,
        { x: -38, y: 16, opacity: 0 },
        { x: 0, y: 0, opacity: 1, duration: 0.62, force3D: true },
        '-=0.5'
      );

      tl.fromTo(
        ctaRef.current,
        { x: -28, opacity: 0, scale: 0.97 },
        { x: 0, opacity: 1, scale: 1, duration: 0.52, force3D: true },
        '-=0.34'
      );

      tl.fromTo(
        proofRef.current?.children || [],
        { y: 22, opacity: 0, scale: 0.98 },
        { y: 0, opacity: 1, scale: 1, duration: 0.5, stagger: 0.08, force3D: true },
        '-=0.18'
      );

      tl.fromTo(
        visualRef.current,
        { x: 62, opacity: 0, scale: 0.98 },
        { x: 0, opacity: 1, scale: 1, duration: 0.86, force3D: true },
        '-=0.95'
      );

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

      <div className={styles.container}>
        <div ref={contentRef} className={styles.contentSide}>
          <div ref={badgeRef} className={styles.badge}>
            <Sparkles size={15} strokeWidth={1.8} />
            <span className={styles.badgeDot} />
            Centro estético corporal y facial
          </div>

          <h1 ref={titleRef} className={styles.title}>
            Más que un spa,<span>una transformación.</span>
          </h1>

          <p ref={subtitleRef} className={styles.subtitle}>
            Moldea, tonifica y cuida tu piel con tecnología estética no invasiva, atención personalizada
            y una evaluación gratuita para elegir el tratamiento correcto desde el primer paso.
          </p>

          <div ref={ctaRef} className={styles.ctaGroup}>
            <Link href="/reservas" className={styles.ctaPrimary}>
              <CalendarCheck size={19} strokeWidth={1.8} />
              Reservar evaluación
              <ArrowRight size={18} strokeWidth={1.8} />
            </Link>
            <a href="#servicios" className={styles.ctaSecondary}>
              Ver tratamientos
            </a>
          </div>

          <div ref={proofRef} className={styles.proofGrid}>
            <div>
              <strong>7000+</strong>
              <span>clientas atendidas</span>
            </div>
            <div>
              <strong>0 Bs</strong>
              <span>evaluación inicial</span>
            </div>
            <div>
              <CheckCircle2 size={18} strokeWidth={1.8} />
              <span>plan personalizado</span>
            </div>
          </div>
        </div>

        <div ref={visualRef} className={styles.visualSide}>
          <div className={styles.imageWrapper}>
            <div className={`${styles.imageFrame} ${styles.frameMain}`}>
              <Image 
                src="/reina1.jpg" 
                alt="Atrevida Fit" 
                fill 
                priority
                className={styles.heroImage}
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              <div className={styles.imageOverlay} />
            </div>
            
            <div className={`${styles.imageFrame} ${styles.frameSub}`}>
              <Image 
                src="/reina2.jpg" 
                alt="Belleza Atrevida" 
                fill 
                className={styles.heroImage}
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              <div className={styles.imageOverlay} />
            </div>

            {/* Decorative Elements */}
            <div className={styles.decorCircle} />
            <div className={styles.decorDots} />
            <div className={styles.floatingCard}>
              <span>Reserva guiada</span>
              <strong>Evaluación gratuita</strong>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
