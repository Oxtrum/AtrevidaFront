'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ArrowRight, CalendarCheck, Sparkles, X } from 'lucide-react';
import Header from '@/components/Header/Header';
import ReservationForm from '@/components/ReservationForm';
import styles from './page.module.css';

interface ReservasLandingProps {
  initialModalOpen?: boolean;
}

export default function ReservasLanding({ initialModalOpen = false }: ReservasLandingProps) {
  const [modalOpen, setModalOpen] = useState(initialModalOpen);
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

  useEffect(() => {
    document.body.style.overflow = modalOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [modalOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setModalOpen(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div ref={containerRef} className={styles.pageContainer}>
      <Header />
      <main className={styles.hero}>
        <div ref={contentRef} className={styles.heroContent}>
          <div className={styles.eyebrow}>
            <Sparkles size={16} strokeWidth={1.8} />
            Reservas de tratamientos
          </div>
          <h1 className={styles.title}>Agenda tu tratamiento estético</h1>
          <p className={styles.subtitle}>
            Reserva tu cita y deja que nuestro equipo confirme el mejor horario para ti.
            Si aún no sabes qué tratamiento elegir, puedes comenzar con una evaluación gratuita para recibir una recomendación profesional.
          </p>

          <div className={styles.actions}>
            <button
              className={styles.primaryButton}
              onClick={() => setModalOpen(true)}
            >
              <CalendarCheck size={19} strokeWidth={1.8} />
              Reservar cita
              <ArrowRight size={18} strokeWidth={1.8} />
            </button>
            <span className={styles.microcopy}>Evaluación gratuita disponible</span>
          </div>

          <div ref={proofRef} className={styles.proofStrip}>
            <div>
              <span>1</span>
              <strong>Elige tu fecha</strong>
            </div>
            <div>
              <span>2</span>
              <strong>Solicita la reserva</strong>
            </div>
            <div>
              <span>3</span>
              <strong>Confirmamos tu cita</strong>
            </div>
          </div>
        </div>
      </main>

      {modalOpen && (
        <div
          className={styles.modalOverlay}
          role="dialog"
          aria-modal="true"
          aria-label="Formulario de reserva"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setModalOpen(false);
          }}
        >
          <div className={styles.modalPanel}>
            <button
              type="button"
              className={styles.modalClose}
              aria-label="Cerrar reserva"
              onClick={() => setModalOpen(false)}
            >
              <X size={20} strokeWidth={1.8} />
            </button>
            <ReservationForm
              onSuccess={() => setModalOpen(false)}
              onCancel={() => setModalOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
