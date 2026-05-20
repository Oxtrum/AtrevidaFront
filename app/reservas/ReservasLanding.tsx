'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  HeartPulse,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Target,
  X,
} from 'lucide-react';
import Header from '@/components/Header/Header';
import ReservationForm from '@/components/ReservationForm';
import styles from './page.module.css';

gsap.registerPlugin(ScrollTrigger);

interface ReservasLandingProps {
  initialModalOpen?: boolean;
}

export default function ReservasLanding({ initialModalOpen = false }: ReservasLandingProps) {
  const [modalOpen, setModalOpen] = useState(initialModalOpen);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const proofRef = useRef<HTMLDivElement>(null);
  const openModal = () => setModalOpen(true);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduceMotion) return;

      const textBlocks = gsap.utils.toArray<HTMLElement>([
        `.${styles.sectionIntro}`,
        `.${styles.optionPanel}`,
        `.${styles.finalCta} > div`,
      ].join(', '));
      const cardElements = gsap.utils.toArray<HTMLElement>([
        `.${styles.benefitCard}`,
        `.${styles.optionList} article`,
        `.${styles.processRail} > div`,
      ].join(', '));

      gsap.set([
        proofRef.current?.children,
        `.${styles.trustBand} > div`,
        `.${styles.benefitCard}`,
        `.${styles.optionList} article`,
        `.${styles.processRail} > div`,
      ], { willChange: 'transform, opacity' });

      gsap.set(`.${styles.heroContent} > *:not(.${styles.proofStrip})`, { willChange: 'transform, opacity, clip-path' });
      gsap.set(textBlocks.flatMap(block => Array.from(block.children)), { willChange: 'transform, opacity, clip-path' });

      const tl = gsap.timeline({ defaults: { ease: 'power3.out' }, delay: 0.12 });
      tl.fromTo(
        `.${styles.heroContent} > *:not(.${styles.proofStrip})`,
        { x: -46, y: 18, opacity: 0, clipPath: 'inset(0 100% 0 0)' },
        {
          x: 0,
          y: 0,
          opacity: 1,
          clipPath: 'inset(0 0% 0 0)',
          duration: 0.78,
          stagger: 0.12,
          force3D: true,
          clearProps: 'willChange,clipPath',
        },
      )
        .fromTo(
          proofRef.current?.children || [],
          { y: 24, opacity: 0, scale: 0.975 },
          { y: 0, opacity: 1, scale: 1, duration: 0.58, stagger: 0.08, force3D: true, clearProps: 'willChange,transform' },
          '-=0.28',
        );

      gsap.to(contentRef.current, {
        y: -34,
        ease: 'none',
        force3D: true,
        scrollTrigger: {
          trigger: contentRef.current,
          start: 'top top+=90',
          end: 'bottom top',
          scrub: 0.7,
        },
      });

      ScrollTrigger.batch(`.${styles.trustBand} > div`, {
        start: 'top 88%',
        once: true,
        onEnter: (batch) => {
          gsap.fromTo(batch, { y: 22, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55, stagger: 0.08, ease: 'power3.out', force3D: true, clearProps: 'willChange' });
        },
      });

      textBlocks.forEach((block) => {
        const kicker = block.querySelector(':scope > span');
        const heading = block.querySelector(':scope > h2');
        const paragraph = block.querySelector(':scope > p');
        const button = block.querySelector(':scope > button');

        if (!kicker || !heading) return;

        const textTimeline = gsap.timeline({
          scrollTrigger: {
            trigger: block,
            start: 'top 82%',
            once: true,
          },
          defaults: { ease: 'power3.out', force3D: true },
        });

        textTimeline
          .fromTo(
            kicker,
            { x: -26, opacity: 0, clipPath: 'inset(0 100% 0 0)' },
            { x: 0, opacity: 1, clipPath: 'inset(0 0% 0 0)', duration: 0.5, clearProps: 'willChange,clipPath' },
          )
          .fromTo(
            heading,
            { y: 58, opacity: 0, rotateX: -16, clipPath: 'inset(0 0 100% 0)' },
            { y: 0, opacity: 1, rotateX: 0, clipPath: 'inset(0 0 0% 0)', duration: 0.82, clearProps: 'willChange,clipPath,transform' },
            '-=0.16',
          );

        if (paragraph) {
          textTimeline.fromTo(
            paragraph,
            { x: -38, y: 16, opacity: 0 },
            { x: 0, y: 0, opacity: 1, duration: 0.58, clearProps: 'willChange,transform' },
            '-=0.44',
          );
        }

        if (button) {
          textTimeline.fromTo(
            button,
            { x: -26, opacity: 0, scale: 0.96 },
            { x: 0, opacity: 1, scale: 1, duration: 0.48, clearProps: 'willChange,transform' },
            '-=0.28',
          );
        }
      });

      ScrollTrigger.batch(cardElements, {
        start: 'top 86%',
        once: true,
        onEnter: (batch) => {
          gsap.fromTo(
            batch,
            { y: 24, opacity: 0, scale: 0.985 },
            { y: 0, opacity: 1, scale: 1, duration: 0.56, stagger: 0.07, ease: 'power3.out', force3D: true, clearProps: 'willChange,transform' },
          );
        },
      });

      gsap.to(`.${styles.proofStrip} span`, {
        y: -3,
        duration: 1.8,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
        stagger: 0.18,
        force3D: true,
      });
    }, containerRef);
    return () => {
      ctx.revert();
      ScrollTrigger.getAll().forEach(trigger => {
        if (trigger.trigger && containerRef.current?.contains(trigger.trigger as Node)) {
          trigger.kill();
        }
      });
    };
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
            Reserva estética personalizada
          </div>
          <h1 className={styles.title}>Agenda el tratamiento que tu cuerpo necesita</h1>
          <p className={styles.subtitle}>
            Reserva tu cita para tratamientos corporales, faciales y planes especializados.
            Si aún no sabes por dónde empezar, agenda una evaluación gratuita y recibe una recomendación profesional antes de decidir.
          </p>

          <div className={styles.actions}>
            <button
              className={styles.primaryButton}
              onClick={openModal}
            >
              <CalendarCheck size={19} strokeWidth={1.8} />
              Reservar tratamiento
              <ArrowRight size={18} strokeWidth={1.8} />
            </button>
            <span className={styles.microcopy}>Evaluación gratuita disponible para orientar tu elección</span>
          </div>

          <div ref={proofRef} className={styles.proofStrip}>
            <div>
              <span>+20</span>
              <strong>Tratamientos corporales y faciales</strong>
            </div>
            <div>
              <span>0 Bs</span>
              <strong>Evaluación inicial gratuita</strong>
            </div>
            <div>
              <span>Manual</span>
              <strong>Confirmación por nuestro equipo</strong>
            </div>
          </div>
        </div>
      </main>

      <section className={styles.trustBand} aria-label="Beneficios de reservar">
        <div>
          <ShieldCheck size={20} strokeWidth={1.8} />
          <span>Atención guiada</span>
        </div>
        <div>
          <Clock3 size={20} strokeWidth={1.8} />
          <span>Horarios confirmados</span>
        </div>
        <div>
          <HeartPulse size={20} strokeWidth={1.8} />
          <span>Plan según tu objetivo</span>
        </div>
      </section>

      <section className={styles.valueSection}>
        <div className={styles.sectionIntro}>
          <span>Por qué reservar</span>
          <h2>Menos dudas. Más claridad antes de comenzar.</h2>
          <p>
            No todos los cuerpos necesitan el mismo tratamiento. Por eso el flujo de reserva está pensado para ayudarte a elegir bien, confirmar disponibilidad y llegar con un plan claro.
          </p>
        </div>

        <div className={styles.benefitGrid}>
          <article className={styles.benefitCard}>
            <Target size={24} strokeWidth={1.7} />
            <h3>Recomendación real</h3>
            <p>La evaluación gratuita ayuda a definir qué tecnología o tratamiento tiene más sentido para tu objetivo.</p>
          </article>
          <article className={styles.benefitCard}>
            <CalendarCheck size={24} strokeWidth={1.7} />
            <h3>Reserva ordenada</h3>
            <p>Envías tu solicitud y el equipo confirma manualmente la disponibilidad para evitar choques de horario.</p>
          </article>
          <article className={styles.benefitCard}>
            <MessageCircle size={24} strokeWidth={1.7} />
            <h3>Acompañamiento</h3>
            <p>Si eliges tratamiento especializado, el personal puede ajustar la reserva después de revisar tu caso.</p>
          </article>
        </div>
      </section>

      <section className={styles.optionsSection}>
        <div className={styles.optionPanel}>
          <span className={styles.optionKicker}>Opciones de reserva</span>
          <h2>Empieza con evaluación o solicita un tratamiento.</h2>
          <p>
            La evaluación gratuita es ideal si quieres orientación. El tratamiento especializado funciona cuando ya tienes claro el servicio o vienes por seguimiento.
          </p>
          <button className={styles.secondaryButton} onClick={openModal}>
            Abrir formulario
            <ArrowRight size={17} strokeWidth={1.8} />
          </button>
        </div>
        <div className={styles.optionList}>
          <article>
            <CheckCircle2 size={20} strokeWidth={1.8} />
            <div>
              <h3>Evaluación gratuita</h3>
              <p>Valoración inicial para entender tu objetivo y recomendar el siguiente paso.</p>
            </div>
          </article>
          <article>
            <CheckCircle2 size={20} strokeWidth={1.8} />
            <div>
              <h3>Tratamiento especializado</h3>
              <p>Solicitud de cita para un tratamiento o plan que será validado por el personal.</p>
            </div>
          </article>
        </div>
      </section>

      <section className={styles.processSection}>
        <div className={styles.sectionIntro}>
          <span>Cómo funciona</span>
          <h2>Tu reserva en tres pasos simples.</h2>
        </div>
        <div className={styles.processRail}>
          <div>
            <span>01</span>
            <h3>Solicita</h3>
            <p>Elige sucursal, fecha, horario y el tipo de reserva que necesitas.</p>
          </div>
          <div>
            <span>02</span>
            <h3>Confirmamos</h3>
            <p>El equipo revisa disponibilidad y aprueba manualmente la cita.</p>
          </div>
          <div>
            <span>03</span>
            <h3>Comienzas</h3>
            <p>Llegas con una ruta clara para evaluación, tratamiento o seguimiento.</p>
          </div>
        </div>
      </section>

      <section className={styles.finalCta}>
        <div>
          <span>Tu siguiente cita empieza aquí</span>
          <h2>Reserva ahora y deja que Atrevida prepare el mejor horario para ti.</h2>
        </div>
        <button className={styles.primaryButton} onClick={openModal}>
          Reservar cita
          <ArrowRight size={18} strokeWidth={1.8} />
        </button>
      </section>

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
