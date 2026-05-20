'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, Bike, CircleDot, Leaf, Radio, Snowflake, Waves, Zap } from 'lucide-react';
import styles from './Servicios.module.css';

const SERVICIOS = [
  {
    id: 'maderoterapia',
    nombre: 'Maderoterapia',
    descripcion:
      'Masaje con herramientas de madera que moldea y tonifica el cuerpo, reduce celulitis.',
    imagen: '/maderoterapiaNuevo.jpg',
    color: '#EC008C',
    Icon: Leaf,
    tamaño: 'grande',
    position: 'center 70%',
  },
  {
    id: 'lipo-laser',
    nombre: 'Lipo Láser',
    descripcion:
      'Tratamiento no invasivo con láser frío. Destruye células de grasa localizada sin cirugía.',
    imagen: '/Lipolaser.JPEG',
    color: '#14AEEF',
    Icon: Zap,
    tamaño: 'normal',
  },
  {
    id: 'epulse-bike',
    nombre: 'E Pulse Bike',
    descripcion:
      'Bicicleta de estimulación eléctrica de alta intensidad. Activa músculo profundo sin impacto articular.',
    imagen: '/E-Pulse Bike.JPEG',
    color: '#FFE600',
    Icon: Bike,
    tamaño: 'normal',
  },
  {
    id: 'ondas-rusas',
    nombre: 'Ondas Rusas',
    descripcion:
      'Electroestimulación que contrae los músculos profundos. Efecto lifting y definición muscular.',
    imagen: '/Ondas Rusas.JPEG',
    color: '#EC008C',
    Icon: Waves,
    tamaño: 'normal',
  },
  {
    id: 'vacumterapia',
    nombre: 'Vacumterapia',
    descripcion:
      'Succión al vacío que activa el sistema linfático. Elimina toxinas y reduce retención de líquidos.',
    imagen: '/Vacumterpia.JPEG',
    color: '#14AEEF',
    Icon: CircleDot,
    tamaño: 'normal',
    position: 'center 85%',
  },
  {
    id: 'radiofrecuencia',
    nombre: 'Radiofrecuencia',
    descripcion:
      'Ondas electromagnéticas que estimulan colágeno y elastina. Rejuvenece la piel progresivamente.',
    imagen: '/radiofrecuenciaNuevo.jpg',
    color: '#EC008C',
    Icon: Radio,
    tamaño: 'normal',
    position: 'center 65%',
  },
  {
    id: 'criolipolisis',
    nombre: 'Criolipolisis',
    descripcion:
      'Eliminación de grasa localizada mediante la aplicación controlada de frío. Resultados definitivos sin cirugía.',
    imagen: '/crioliposis.jpg',
    color: '#14AEEF',
    Icon: Snowflake,
    tamaño: 'normal',
  },
];

export default function Servicios() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    // Animate only compositor‑friendly properties and give the browser
    // a hint that these will change frequently (will‑change) and force
    // a GPU layer (force3D). Stagger is limited to ~1 s of total time.
    const ctx = gsap.context(() => {
      gsap.fromTo(
        titleRef.current,
        { y: 40, opacity: 0, willChange: 'transform, opacity', force3D: true },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: titleRef.current,
            start: 'top 80%',
            toggleActions: 'play none none none',
          },
        }
      );

      // Stagger cards entrance from grid – animate only transform & opacity
      const cards = gridRef.current?.querySelectorAll(`.${styles.serviceCard}`);
      if (cards && cards.length > 0) {
        gsap.fromTo(
          cards,
          { y: 40, opacity: 0, willChange: 'transform, opacity', force3D: true },
          {
            y: 0,
            opacity: 1,
            duration: 0.6,
            ease: 'power3.out',
            // Limit concurrent animations to keep main‑thread work low
            stagger: { each: 0.07, amount: 1 },
            scrollTrigger: {
              trigger: gridRef.current,
              start: 'top 75%',
              toggleActions: 'play none none none',
            },
            onComplete: () => {
              // Clean up will‑change after animation finishes
              cards.forEach((el) => {
                (el as HTMLElement).style.willChange = '';
              });
            },
          }
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className={styles.servicios} id="servicios">
      <div className={styles.container}>
        {/* Header */}
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

        {/* Bento Grid */}
        <div ref={gridRef} className={styles.bentoGrid}>
          {SERVICIOS.map((servicio) => {
            const Icon = servicio.Icon;
            return (
            <article
              key={servicio.id}
              className={`${styles.serviceCard} ${styles[servicio.tamaño] ?? styles.normal ?? ''}`}
              style={{ '--accent-color': servicio.color } as React.CSSProperties}
            >
              {/* Image Background */}
              <div className={styles.cardImage}>
                <Image
                  src={servicio.imagen}
                  alt={servicio.nombre}
                  fill
                  quality={75}
                  // Allow Next.js to optimize; removed unoptimized flag
                  loading="lazy"
                  className={styles.image}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 50vw"
                  style={{ objectPosition: servicio.position || 'center' }}
                />
                <div className={styles.cardOverlay} />
                <span className={styles.cardIcon}>
                  <Icon size={22} strokeWidth={1.8} />
                </span>
              </div>

              {/* Content Overlay */}
              <div className={styles.cardContent}>
                <div className={styles.contentInner}>
                  <h3 className={styles.cardTitle}>{servicio.nombre}</h3>
                  <p className={styles.cardDesc}>{servicio.descripcion}</p>
                  <a href="/reservas" className={styles.cardCta}>
                    Reservar
                    <ArrowRight size={16} strokeWidth={1.8} />
                  </a>
                </div>
              </div>

              {/* Accent Border Line */}
              <div className={styles.accentLine} />
            </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
