'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MapPin, MessageCircle, Camera, Clock } from 'lucide-react';
import styles from './Contacto.module.css';

gsap.registerPlugin(ScrollTrigger);

const INFO_ITEMS = [
  {
    icono: <MapPin strokeWidth={1.5} />,
    titulo: 'Ubicación',
    valor: 'Tu ciudad, País',
    sub: 'Consulta nuestras sucursales disponibles',
    color: '#EC008C',
    rgb: '236, 0, 140'
  },
  {
    icono: <MessageCircle strokeWidth={1.5} />,
    titulo: 'WhatsApp',
    valor: '+000 000 0000',
    sub: 'Lun – Sáb, 8am – 7pm',
    color: '#14AEEF',
    rgb: '20, 174, 239'
  },
  {
    icono: <Camera strokeWidth={1.5} />,
    titulo: 'Instagram',
    valor: '@atrevidafit',
    sub: 'Síguenos para ver resultados',
    color: '#92278F',
    rgb: '146, 39, 143'
  },
  {
    icono: <Clock strokeWidth={1.5} />,
    titulo: 'Horarios',
    valor: 'Lun – Sáb: 8am – 7pm',
    sub: 'Dom: Citas especiales',
    color: '#FFE600',
    rgb: '255, 230, 0'
  },
];

export default function Contacto() {
  const sectionRef = useRef<HTMLElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        leftRef.current,
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.9,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: leftRef.current,
            start: 'top 82%'
          },
        }
      );
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className={styles.contacto} id="contacto">
      <div className={styles.bgGlow} />

      <div className={styles.container}>
        <div className={styles.contentWrapper}>
          <div ref={leftRef} className={styles.infoCol}>
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
              {INFO_ITEMS.map((item) => (
                <div
                  key={item.titulo}
                  className={styles.infoItem}
                  style={{ 
                    '--icon-color': item.color,
                    '--icon-color-rgb': item.rgb 
                  } as React.CSSProperties}
                >
                  <span className={styles.infoIcon}>{item.icono}</span>
                  <div>
                    <p className={styles.infoTitulo}>{item.titulo}</p>
                    <p className={styles.infoValor}>{item.valor}</p>
                    <p className={styles.infoSub}>{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}