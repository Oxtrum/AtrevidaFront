'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import styles from './CtaBanner.module.css';

gsap.registerPlugin(ScrollTrigger);

export default function CtaBanner() {
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        contentRef.current,
        { y: 50, opacity: 0, scale: 0.97 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.9,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: contentRef.current,
            start: 'top 85%',
          },
        }
      );

      // Floating particles
      gsap.to('.ctaParticle', {
        y: '-=15',
        duration: 2.5,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
        stagger: { each: 0.4 },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className={styles.ctaBanner}>
      {/* Animated bg */}
      <div className={styles.bgMesh} />

      {/* Floating decorative particles */}
      <span className={`${styles.particle} ctaParticle`} style={{ top: '15%', left: '8%' }}>✦</span>
      <span className={`${styles.particle} ctaParticle`} style={{ top: '70%', left: '15%' }}>◎</span>
      <span className={`${styles.particle} ctaParticle`} style={{ top: '20%', right: '12%' }}>◉</span>
      <span className={`${styles.particle} ctaParticle`} style={{ bottom: '20%', right: '8%' }}>✦</span>

      <div className={styles.container}>
        <div ref={contentRef} className={styles.content}>
          <span className={styles.eyebrow}>¿Estás lista?</span>
          <h2 className={styles.title}>
            Da el primer paso hacia
            <br />
            <span className={styles.titleAccent}>tu mejor versión</span>
          </h2>
          <p className={styles.subtitle}>
            Primera consulta gratuita · Sin compromisos · Resultados reales
          </p>
          <div className={styles.actions}>
            <a href="#contacto" className={styles.btnPrimary}>
              ✦ Reservar cita gratuita
            </a>
            <a href="https://wa.me/000000000" className={styles.btnSecondary} target="_blank" rel="noreferrer">
              WhatsApp →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
