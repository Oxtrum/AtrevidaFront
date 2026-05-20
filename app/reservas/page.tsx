'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ArrowRight, CalendarCheck, Sparkles } from 'lucide-react';
import Header from '@/components/Header/Header';
import styles from './page.module.css';

export default function ReservasPage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const proofRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.fromTo(contentRef.current, { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: 0.75 })
        .fromTo(proofRef.current?.children || [], { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.08 }, '-=0.25');
    }, containerRef);
    return () => ctx.kill();
  }, []);

  return (
    <div ref={containerRef} className={styles.pageContainer}>
      <Header />
      <main className={styles.hero}>
        <div ref={contentRef} className={styles.heroContent}>
          <div className={styles.eyebrow}>
            <Sparkles size={16} strokeWidth={1.8} />
            Evaluación gratuita
          </div>
          <h1 className={styles.title}>Agenda tu evaluación estética sin costo</h1>
          <p className={styles.subtitle}>
            Descubre el tratamiento ideal para tu cuerpo con una valoración profesional.
            Solicita tu reserva y nuestro equipo confirmará el horario disponible.
          </p>

          <div className={styles.actions}>
            <button
              className={styles.primaryButton}
              onClick={() => router.push('/reservas/crear')}
            >
              <CalendarCheck size={19} strokeWidth={1.8} />
              Reservar evaluación
              <ArrowRight size={18} strokeWidth={1.8} />
            </button>
            <span className={styles.microcopy}>Cupo sujeto a aprobación manual</span>
          </div>

          <div ref={proofRef} className={styles.proofStrip}>
            <div>
              <span>1</span>
              <strong>Elige fecha y hora</strong>
            </div>
            <div>
              <span>2</span>
              <strong>Recibe confirmación</strong>
            </div>
            <div>
              <span>3</span>
              <strong>Diseñamos tu plan</strong>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
