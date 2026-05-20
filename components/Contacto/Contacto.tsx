'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, CalendarCheck, Camera, Clock, MapPin, MessageCircle } from 'lucide-react';
import styles from './Contacto.module.css';
import Link from 'next/link';

gsap.registerPlugin(ScrollTrigger);

const INFO_ITEMS = [
  {
    icono: <MapPin strokeWidth={1.5} />,
    titulo: 'Ubicación',
    valor: 'Cochabamba, Bolivia',
    sub: 'Consulta nuestras sucursales disponibles',
    color: '#EC008C',
    rgb: '236, 0, 140'
  },
  {
    icono: <MessageCircle strokeWidth={1.5} />,
    titulo: 'WhatsApp',
    valor: '+591 77411855',
    sub: 'Lun – Sáb, 8am – 7pm',
    color: '#14AEEF',
    rgb: '20, 174, 239',
    link: 'https://wa.me/59177411855'
  },
  {
    icono: <Camera strokeWidth={1.5} />,
    titulo: 'Instagram',
    valor: '@atrevida.fit',
    sub: 'Síguenos para ver resultados',
    color: '#92278F',
    rgb: '146, 39, 143',
    link: 'https://instagram.com/atrevida.fit'
  },
  {
    icono: <Clock strokeWidth={1.5} />,
    titulo: 'Horarios',
    valor: 'Lun – Sáb: 8am – 8pm',
    sub: 'Agenda tu cita en el horario que más te convenga',
    color: '#FFE600',
    rgb: '255, 230, 0'
  },
];

export default function Contacto() {
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduceMotion) return;

      const textItems = contentRef.current?.querySelectorAll(`.${styles.sectionBadge}, .${styles.sectionTitle}, .${styles.infoText}`);
      const infoItems = contentRef.current?.querySelectorAll(`.${styles.infoItem}`);

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: contentRef.current,
          start: 'top 78%',
          once: true,
        },
        defaults: { ease: 'power3.out', force3D: true },
      });

      tl.fromTo(
        textItems || [],
        { x: -44, y: 18, opacity: 0, clipPath: 'inset(0 100% 0 0)' },
        {
          x: 0,
          y: 0,
          opacity: 1,
          clipPath: 'inset(0 0% 0 0)',
          duration: 0.72,
          stagger: 0.12,
          clearProps: 'clipPath,transform',
        },
      ).fromTo(
        infoItems || [],
        { x: 54, y: 26, opacity: 0, scale: 0.975 },
        {
          x: 0,
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.62,
          stagger: 0.08,
          clearProps: 'transform',
        },
        '-=0.42',
      );

      gsap.fromTo(
        ctaRef.current,
        { y: 46, opacity: 0, scale: 0.965 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.74,
          ease: 'power3.out',
          force3D: true,
          scrollTrigger: {
            trigger: ctaRef.current,
            start: 'top 86%',
            once: true,
          },
        }
      );

      gsap.to('.contactParticle', {
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
    <section ref={sectionRef} className={styles.contacto} id="contacto">
      {/* Animated mesh gradient background */}
      <div className={styles.bgMesh} />

      {/* Floating decorative particles */}
      <span className={`${styles.particle} contactParticle`} style={{ top: '10%', left: '5%' }} />
      <span className={`${styles.particle} contactParticle`} style={{ top: '65%', left: '8%' }} />
      <span className={`${styles.particle} contactParticle`} style={{ top: '15%', right: '7%' }} />
      <span className={`${styles.particle} contactParticle`} style={{ bottom: '25%', right: '5%' }} />

      <div className={styles.container}>
        {/* Info section */}
        <div className={styles.contentWrapper}>
          <div ref={contentRef} className={styles.infoCol}>
            <span className={styles.sectionBadge}>Agenda y contacto</span>
            <h2 className={styles.sectionTitle}>
              Tu cita puede
              <br />
              <span className={styles.titleAccent}>empezar hoy</span>
            </h2>
            <p className={styles.infoText}>
              Escríbenos, reserva una evaluación gratuita o solicita un tratamiento. Nuestro equipo revisa tu solicitud
              y confirma el horario más conveniente para ti.
            </p>

            <div className={styles.infoList}>
              {INFO_ITEMS.map((item) => {
                const content = (
                  <>
                    <span className={styles.infoIcon}>{item.icono}</span>
                    <div>
                      <p className={styles.infoTitulo}>{item.titulo}</p>
                      <p className={styles.infoValor}>{item.valor}</p>
                      <p className={styles.infoSub}>{item.sub}</p>
                    </div>
                  </>
                );

                const itemStyle = {
                  '--icon-color': item.color,
                  '--icon-color-rgb': item.rgb
                } as React.CSSProperties;

                if (item.link) {
                  return (
                    <a
                      key={item.titulo}
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.infoItem}
                      style={{ ...itemStyle, textDecoration: 'none' }}
                    >
                      {content}
                    </a>
                  );
                }

                return (
                  <div
                    key={item.titulo}
                    className={styles.infoItem}
                    style={itemStyle}
                  >
                    {content}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* CTA button section */}
        <div ref={ctaRef} className={styles.ctaSection}>
          <div>
            <p className={styles.ctaEyebrow}>¿Estás lista?</p>
            <h3 className={styles.ctaTitle}>Reserva una evaluación gratuita y recibe una recomendación profesional.</h3>
          </div>
          <Link href="/reservas" className={styles.ctaBtn}>
            <CalendarCheck size={20} strokeWidth={1.8} />
            Reservar cita
            <ArrowRight size={18} strokeWidth={1.8} />
          </Link>
        </div>
      </div>
    </section>
  );
}
