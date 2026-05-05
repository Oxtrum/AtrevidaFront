'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import styles from './Nosotros.module.css';

gsap.registerPlugin(ScrollTrigger);

const STATS = [
  { numero: '4+', label: 'Años de experiencia' },
  { numero: '7000+', label: 'Clientes satisfechas' },
  { numero: '6', label: 'Tratamientos especializados' },
  { numero: '100%', label: 'Resultados garantizados' },
];

const VALORES = [
  {
    icono: '✦',
    titulo: 'Profesionalismo',
    descripcion: 'Equipo certificado y en constante formación para ofrecerte lo mejor.',
  },
  {
    icono: '◉',
    titulo: 'Tecnología',
    descripcion: 'Equipos de última generación importados con certificación médica.',
  },
  {
    icono: '♡',
    titulo: 'Confianza',
    descripcion: 'Un ambiente seguro y confidencial donde tu bienestar es prioridad.',
  },
];

export default function Nosotros() {
  const sectionRef = useRef<HTMLElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement[]>([]);
  const valoresRef = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Left column slides in
      gsap.fromTo(
        leftRef.current,
        { x: -80, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: leftRef.current,
            start: 'top 82%',
          },
        }
      );

      // Right column slides in
      gsap.fromTo(
        rightRef.current,
        { x: 80, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: rightRef.current,
            start: 'top 82%',
          },
        }
      );

      // Stats counter animation
      statsRef.current.forEach((stat, i) => {
        if (!stat) return;
        gsap.fromTo(
          stat,
          { y: 40, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.6,
            ease: 'power3.out',
            delay: i * 0.1,
            scrollTrigger: {
              trigger: stat,
              start: 'top 90%',
            },
          }
        );
      });

      // Valores stagger
      valoresRef.current.forEach((v, i) => {
        if (!v) return;
        gsap.fromTo(
          v,
          { y: 50, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.7,
            delay: i * 0.15,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: v,
              start: 'top 90%',
            },
          }
        );
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className={styles.nosotros} id="nosotros">
      <div className={styles.bgMesh} />

      <div className={styles.container}>
        {/* Main two-column layout */}
        <div className={styles.mainGrid}>
          {/* Left – images collage */}
          <div ref={leftRef} className={styles.imageCollage}>
            <div className={styles.imageMain}>
              <Image
                src="/modelos2.jpg"
                alt="AtrevidaFit modelo"
                fill
                className={styles.img}
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              <div className={styles.imgOverlay} />
            </div>
            <div className={styles.imageSecond}>
              <Image
                src="/modelos3.jpg"
                alt="Tratamiento AtrevidaFit"
                fill
                className={styles.imgSecond}
                sizes="(max-width: 768px) 100vw, 30vw"
              />
              <div className={styles.imgOverlay} />
            </div>

            {/* Floating badge */}
            <div className={styles.floatingBadge}>
              <span className={styles.floatingNumber}>7000+</span>
              <span className={styles.floatingLabel}>Clientes satisfechos</span>
            </div>
          </div>

          {/* Right – text content */}
          <div ref={rightRef} className={styles.textContent}>
            <span className={styles.sectionBadge}>¿Quiénes Somos?</span>
            <h2 className={styles.sectionTitle}>
              Más que un spa,
              <br />
              <span className={styles.titleAccent}>una transformación</span>
            </h2>
            <p className={styles.bodyText}>
              En <strong>AtrevidaFit</strong> creemos que cada mujer merece sentirse segura y radiante en su propio cuerpo.
              Somos un centro de bienestar y estética corporal especializado en tratamientos no invasivos con tecnología de última generación.
            </p>
            <p className={styles.bodyText}>
              Nuestro equipo de profesionales certificados combina ciencia, experiencia y pasión para ofrecerte resultados reales,
              en un ambiente cálido, seguro y completamente personalizado para ti.
            </p>

            {/* Valores */}
            <div className={styles.valoresList}>
              {VALORES.map((v, i) => (
                <div
                  key={v.titulo}
                  ref={(el) => { if (el) valoresRef.current[i] = el; }}
                  className={styles.valorItem}
                >
                  <span className={styles.valorIcon}>{v.icono}</span>
                  <div>
                    <h4 className={styles.valorTitulo}>{v.titulo}</h4>
                    <p className={styles.valorDesc}>{v.descripcion}</p>
                  </div>
                </div>
              ))}
            </div>

            <a href="#servicios" className={styles.ctaButton}>
              Ver nuestros servicios →
            </a>
          </div>
        </div>

        {/* Stats bar */}
        <div className={styles.statsGrid}>
          {STATS.map((stat, i) => (
            <div
              key={stat.label}
              ref={(el) => { if (el) statsRef.current[i] = el; }}
              className={styles.statItem}
            >
              <span className={styles.statNumber}>{stat.numero}</span>
              <span className={styles.statLabel}>{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
