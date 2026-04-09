'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
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

function getPerPage(): number {
  if (typeof window === 'undefined') return 3;
  if (window.innerWidth <= 640) return 1;
  if (window.innerWidth <= 1024) return 2;
  return 3;
}

export default function Servicios() {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const [idx, setIdx] = useState(0);
  const [perPage, setPerPage] = useState(3);

  const total = SERVICIOS.length;
  const maxIdx = Math.max(0, total - perPage);
  const pages = Math.ceil(total / perPage);

  // Touch swipe
  const touchStartX = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) move(1);
      else move(-1);
    }
  };

  const move = useCallback(
    (dir: number) => {
      // jump by pages on PC, by 1 on mobile
      const step = perPage > 1 ? perPage : 1;
      setIdx((prev) => {
        let next = prev + dir * step;
        // logic for page alignment on PC
        if (perPage > 1) {
          if (dir > 0) next = Math.ceil(next / perPage) * perPage;
          else next = Math.floor(next / perPage) * perPage;
        }
        return Math.min(Math.max(0, next), maxIdx);
      });
    },
    [maxIdx, perPage]
  );

  // Resize → recalc perPage and clamp idx
  useEffect(() => {
    const onResize = () => {
      const pp = getPerPage();
      setPerPage(pp);
      // Ensure we land on a valid index for the new perPage
      setIdx((prev) => {
        const currentPos = Math.min(prev, Math.max(0, total - pp));
        return pp > 1 ? Math.floor(currentPos / pp) * pp : currentPos;
      });
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [total]);

  // Slide track
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector<HTMLElement>(`.${styles.card}`);
    if (!card) return;
    const gap = parseFloat(getComputedStyle(track).gap) || 20;
    const cardW = card.getBoundingClientRect().width;
    track.style.transform = `translateX(-${idx * (cardW + gap)}px)`;
  }, [idx, perPage]);

  // GSAP entrance
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        titleRef.current,
        { y: 60, opacity: 0 },
        {
          y: 0, opacity: 1, duration: 0.9, ease: 'power3.out',
          scrollTrigger: { trigger: titleRef.current, start: 'top 85%', toggleActions: 'play none none none' },
        }
      );
      gsap.fromTo(
        trackRef.current,
        { y: 50, opacity: 0 },
        {
          y: 0, opacity: 1, duration: 0.8, ease: 'power3.out',
          scrollTrigger: { trigger: trackRef.current, start: 'top 88%', toggleActions: 'play none none none' },
        }
      );
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className={styles.servicios} id="servicios">
      <div className={styles.bgGradient} />
      <div className={styles.bgLine} />

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

        {/* Carousel */}
        <div className={styles.carouselWrap}>
          <div
            className={styles.carouselOuter}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div
              ref={trackRef}
              className={styles.carouselTrack}
            >
              {SERVICIOS.map((servicio) => (
                <div
                  key={servicio.id}
                  className={styles.card}
                  style={{ '--card-color': servicio.color } as React.CSSProperties}
                >
                  {/* Color bar */}
                  <div className={styles.cardBar} />

                  {/* Image */}
                  <div className={styles.cardImageWrapper}>
                    <Image
                      src={servicio.imagen}
                      alt={servicio.nombre}
                      fill
                      className={styles.cardImage}
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                    <div className={styles.cardOverlay} />
                    <span className={styles.cardIcon}>{servicio.icono}</span>
                  </div>

                  {/* Content */}
                  <div className={styles.cardContent}>
                    <h3 className={styles.cardTitle}>{servicio.nombre}</h3>
                    <p className={styles.cardDesc}>{servicio.descripcion}</p>
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

          {/* Nav bar */}
          <div className={styles.carouselNav}>
            {/* Dots */}
            <div className={styles.dots}>
              {Array.from({ length: pages }).map((_, i) => (
                <button
                  key={i}
                  className={`${styles.dotBtn} ${Math.floor(idx / perPage) === i ? styles.dotActive : ''}`}
                  onClick={() => setIdx(Math.min(i * perPage, maxIdx))}
                  aria-label={`Página ${i + 1}`}
                />
              ))}
            </div>

            {/* Counter */}
            <div className={styles.counter}>
              {perPage === 1 ? (
                <><strong>{idx + 1}</strong> / {total}</>
              ) : (
                <>Pág. <strong>{Math.floor(idx / perPage) + 1}</strong> / {pages}</>
              )}
            </div>

            {/* Arrows */}
            <div className={styles.arrows}>
              <button
                className={styles.arrBtn}
                onClick={() => move(-1)}
                disabled={idx === 0}
                aria-label="Anterior"
              >
                ←
              </button>
              <button
                className={styles.arrBtn}
                onClick={() => move(1)}
                disabled={idx >= maxIdx}
                aria-label="Siguiente"
              >
                →
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}