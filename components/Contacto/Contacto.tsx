'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MapPin, MessageCircle, Camera, Clock } from 'lucide-react';
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
      // Info column entrance
      gsap.fromTo(
        contentRef.current,
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.9,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: contentRef.current,
            start: 'top 82%'
          },
        }
      );

      // CTA entrance
      gsap.fromTo(
        ctaRef.current,
        { y: 40, opacity: 0, scale: 0.97 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.9,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: ctaRef.current,
            start: 'top 88%',
          },
        }
      );

      // Floating particles
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
      <span className={`${styles.particle} contactParticle`} style={{ top: '10%', left: '5%' }}>✦</span>
      <span className={`${styles.particle} contactParticle`} style={{ top: '65%', left: '8%' }}>◎</span>
      <span className={`${styles.particle} contactParticle`} style={{ top: '15%', right: '7%' }}>◉</span>
      <span className={`${styles.particle} contactParticle`} style={{ bottom: '25%', right: '5%' }}>✦</span>

      <div className={styles.container}>
        {/* Info section */}
        <div className={styles.contentWrapper}>
          <div ref={contentRef} className={styles.infoCol}>
            <span className={styles.sectionBadge}>Contacto</span>
            <h2 className={styles.sectionTitle}>
              Estamos para
              <br />
              <span className={styles.titleAccent}>atenderte</span>
            </h2>
            <p className={styles.infoText}>
              ¿Tienes alguna duda o quieres saber más sobre nuestros servicios?
              Contáctanos por cualquiera de nuestros canales oficiales y te responderemos a la brevedad.
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
          <p className={styles.ctaEyebrow}>¿Estás lista?</p>
          <Link href="/reservas" className={styles.ctaBtn}>
            ✦ Reservar cita
          </Link>
        </div>
      </div>
    </section>
  );
}