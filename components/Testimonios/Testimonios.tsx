'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import styles from './Testimonios.module.css';

gsap.registerPlugin(ScrollTrigger);

const TESTIMONIOS = [
  {
    nombre: 'María Fernanda López',
    cargo: 'Cliente frecuente — Radiofrecuencia',
    texto:
      'Increíble experiencia. Después de 6 sesiones de radiofrecuencia, mi piel es completamente diferente. El equipo es súper profesional y el ambiente te hace sentir como en casa.',
    rating: 5,
    inicial: 'M',
    color: '#EC008C',
  },
  {
    nombre: 'Andrea Rodríguez',
    cargo: 'Cliente — Lipo Láser & Vacumterapia',
    texto:
      'Llevaba años buscando algo que realmente funcionara para la grasa localizada. El lipo láser combinado con vacumterapia me dio resultados que no esperaba en tan poco tiempo.',
    rating: 5,
    inicial: 'A',
    color: '#92278F',
  },
  {
    nombre: 'Valeria Morales',
    cargo: 'Cliente nueva — Maderoterapia',
    texto:
      'La maderoterapia es simplemente maravillosa. Notaba la diferencia desde la primera sesión. Además, la atención personalizada hace que cada visita sea especial.',
    rating: 5,
    inicial: 'V',
    color: '#14AEEF',
  },
  {
    nombre: 'Carolina Mejía',
    cargo: 'Cliente fiel — E Pulse Bike',
    texto:
      'El E Pulse Bike es lo más innovador que he probado. Siendo mamá no tenía tiempo para el gym, y esto me dio los resultados que buscaba sin afectar mis articulaciones.',
    rating: 5,
    inicial: 'C',
    color: '#FFE600',
  },
  {
    nombre: 'Paola Jiménez',
    cargo: 'Cliente — Ondas Rusas',
    texto:
      'Profesionalismo de primer nivel. Las ondas rusas me ayudaron a recuperar el tono muscular después del embarazo. 100% recomendado para cualquier mujer.',
    rating: 5,
    inicial: 'P',
    color: '#EC008C',
  },
];

export default function Testimonios() {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const ctx = gsap.context(() => {
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
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  // Animate slider on active change
  useEffect(() => {
    if (!trackRef.current) return;
    gsap.to(trackRef.current, {
      x: `-${active * 100}%`,
      duration: 0.7,
      ease: 'power3.inOut',
    });
  }, [active]);

  // Auto-advance
  useEffect(() => {
    const timer = setInterval(() => {
      setActive((prev) => (prev + 1) % TESTIMONIOS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section ref={sectionRef} className={styles.testimonios} id="testimonios">
      <div className={styles.bgMesh} />

      <div className={styles.container}>
        {/* Header */}
        <div ref={titleRef} className={styles.sectionHeader}>
          <span className={styles.sectionBadge}>Testimonios</span>
          <h2 className={styles.sectionTitle}>
            Lo que dicen
            <br />
            <span className={styles.titleAccent}>nuestras clientas</span>
          </h2>
        </div>

        {/* Slider */}
        <div className={styles.sliderWrapper}>
          <div className={styles.sliderViewport}>
            <div ref={trackRef} className={styles.sliderTrack}>
              {TESTIMONIOS.map((t, i) => (
                <div
                  key={i}
                  className={`${styles.slide} ${i === active ? styles.slideActive : ''}`}
                >
                  <div
                    className={styles.card}
                    style={{ '--t-color': t.color } as React.CSSProperties}
                  >
                    {/* Quote */}
                    <span className={styles.quoteIcon}>"</span>

                    {/* Stars */}
                    <div className={styles.stars}>
                      {Array.from({ length: t.rating }).map((_, j) => (
                        <span key={j} className={styles.star}>★</span>
                      ))}
                    </div>

                    <p className={styles.testimonioText}>{t.texto}</p>

                    {/* Author */}
                    <div className={styles.author}>
                      <div
                        className={styles.authorAvatar}
                        style={{ background: `linear-gradient(135deg, ${t.color}, ${t.color}88)` }}
                      >
                        {t.inicial}
                      </div>
                      <div>
                        <p className={styles.authorNombre}>{t.nombre}</p>
                        <p className={styles.authorCargo}>{t.cargo}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Nav buttons */}
          <button
            className={`${styles.navBtn} ${styles.navBtnPrev}`}
            onClick={() => setActive((prev) => (prev - 1 + TESTIMONIOS.length) % TESTIMONIOS.length)}
            aria-label="Anterior"
          >
            ←
          </button>
          <button
            className={`${styles.navBtn} ${styles.navBtnNext}`}
            onClick={() => setActive((prev) => (prev + 1) % TESTIMONIOS.length)}
            aria-label="Siguiente"
          >
            →
          </button>
        </div>

        {/* Dots */}
        <div className={styles.dots}>
          {TESTIMONIOS.map((_, i) => (
            <button
              key={i}
              className={`${styles.dot} ${i === active ? styles.dotActive : ''}`}
              onClick={() => setActive(i)}
              aria-label={`Testimonio ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
