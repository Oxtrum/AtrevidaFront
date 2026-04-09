'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import styles from './Servicios.module.css';

gsap.registerPlugin(ScrollTrigger);

const SERVICIOS = [
  {
    id: 'epulse-bike',
    nombre: 'E Pulse Bike',
    descripcion:
      'Bicicleta de estimulación eléctrica de alta intensidad. Activa músculo profundo sin impacto articular, ideal para tonificar y rehabilitar.',
    imagen: '/E-Pulse Bike.JPEG',
    color: '#EC008C',
    icono: '⚡',
    beneficios: ['Tonificación muscular', 'Sin impacto articular', 'Alta intensidad'],
  },
  {
    id: 'lipo-laser',
    nombre: 'Lipo Láser',
    descripcion:
      'Tratamiento de lipolisis no invasiva con láser frío. Destruye células de grasa localizada sin cirugía ni tiempo de recuperación.',
    imagen: '/Lipolaser.JPEG',
    color: '#14AEEF',
    icono: '✦',
    beneficios: ['No invasivo', 'Sin cirugía', 'Grasa localizada'],
  },
  {
    id: 'maderoterapia',
    nombre: 'Maderoterapia',
    descripcion:
      'Técnica de masaje corporal con herramientas de madera que moldea y tonifica el cuerpo, reduce celulitis y mejora la circulación.',
    imagen: '/Maderoterapia.JPEG',
    color: '#92278F',
    icono: '🌿',
    beneficios: ['Reduce celulitis', 'Mejora circulación', 'Moldea el cuerpo'],
  },
  {
    id: 'ondas-rusas',
    nombre: 'Ondas Rusas',
    descripcion:
      'Electroestimulación de corriente rusa que contrae los músculos profundos. Efecto lifting y definición muscular de alto rendimiento.',
    imagen: '/Ondas Rusas.JPEG',
    color: '#FFE600',
    icono: '〜',
    beneficios: ['Lifting muscular', 'Definición', 'Corriente profunda'],
  },
  {
    id: 'radiofrecuencia',
    nombre: 'Radiofrecuencia',
    descripcion:
      'Tecnología de ondas electromagnéticas que estimula el colágeno y la elastina. Rejuvenece y firma la piel de forma progresiva.',
    imagen: '/Radiofrecuencia.JPEG',
    color: '#EC008C',
    icono: '◉',
    beneficios: ['Colágeno natural', 'Efecto tensor', 'Piel firme'],
  },
  {
    id: 'vacumterapia',
    nombre: 'Vacumterapia',
    descripcion:
      'Succión al vacío que activa el sistema linfático y circulatorio. Elimina toxinas, reduce retención de líquidos y reafirma tejidos.',
    imagen: '/Vacumterpia.JPEG',
    color: '#14AEEF',
    icono: '◎',
    beneficios: ['Drenaje linfático', 'Reduce retención', 'Reafirma tejidos'],
  },
];

export default function Servicios() {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Title animation
      gsap.fromTo(
        titleRef.current,
        { y: 60, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.9,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: titleRef.current,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        }
      );

      // Cards stagger animation
      cardsRef.current.forEach((card, i) => {
        if (!card) return;
        gsap.fromTo(
          card,
          { y: 80, opacity: 0, scale: 0.95 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            duration: 0.7,
            ease: 'power3.out',
            delay: (i % 3) * 0.12,
            scrollTrigger: {
              trigger: card,
              start: 'top 88%',
              toggleActions: 'play none none none',
            },
          }
        );
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className={styles.servicios} id="servicios">
      {/* Background elements */}
      <div className={styles.bgGradient} />
      <div className={styles.bgLine} />

      <div className={styles.container}>
        {/* Section header */}
        <div ref={titleRef} className={styles.sectionHeader}>
          <span className={styles.sectionBadge}>Nuestros Servicios</span>
          <h2 className={styles.sectionTitle}>
            Tecnología al servicio
            <br />
            <span className={styles.titleAccent}>de tu belleza</span>
          </h2>
          <p className={styles.sectionSubtitle}>
            Tratamientos de última generación diseñados para transformar tu cuerpo y bienestar.
            Resultados visibles desde la primera sesión.
          </p>
        </div>

        {/* Cards grid */}
        <div className={styles.grid}>
          {SERVICIOS.map((servicio, i) => (
            <div
              key={servicio.id}
              ref={(el) => { if (el) cardsRef.current[i] = el; }}
              className={styles.card}
              style={{ '--card-color': servicio.color } as React.CSSProperties}
            >
              {/* Image */}
              <div className={styles.cardImageWrapper}>
                <Image
                  src={servicio.imagen}
                  alt={servicio.nombre}
                  fill
                  className={styles.cardImage}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
                <div className={styles.cardOverlay} />
                <span className={styles.cardIcon}>{servicio.icono}</span>
              </div>

              {/* Content */}
              <div className={styles.cardContent}>
                <h3 className={styles.cardTitle}>{servicio.nombre}</h3>
                <p className={styles.cardDesc}>{servicio.descripcion}</p>

                {/* Benefits */}
                <ul className={styles.benefitsList}>
                  {servicio.beneficios.map((b) => (
                    <li key={b} className={styles.benefitItem}>
                      <span className={styles.benefitDot} />
                      {b}
                    </li>
                  ))}
                </ul>

                <a href="#contacto" className={styles.cardCta}>
                  Reservar sesión →
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
