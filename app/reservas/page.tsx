'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import Header from '@/components/Header/Header';
import { Calendar } from '@/components/Calendar';
import { TimeSlotInfo } from '@/types/reserva';
import styles from './page.module.css';

export default function ReservasPage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const badgeRef     = useRef<HTMLDivElement>(null);
  const headerRef    = useRef<HTMLDivElement>(null);
  const actionsRef   = useRef<HTMLDivElement>(null);
  const calendarRef  = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      tl.fromTo(badgeRef.current,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6 }
      )
      .fromTo(headerRef.current,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7 },
        '-=0.3'
      )
      .fromTo(actionsRef.current,
        { x: 20, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.5 },
        '-=0.3'
      )
      .fromTo(calendarRef.current,
        { y: 24, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6 },
        '-=0.2'
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const handleSlotClick = (slot: TimeSlotInfo) => {
    const params = new URLSearchParams({
      local: '',
      semana: '',
      dia: slot.dia,
      hora_desde: slot.hora,
      hora_hasta: slot.horaFin,
    });
    router.push(`/reservas/crear?${params.toString()}`);
  };

  return (
    <div ref={containerRef} className={styles.pageContainer}>
      <Header />

      <main className={styles.main}>
        {/* Page header */}
        <div className={styles.header}>
          <div ref={badgeRef} className={styles.badge}>
            <span className={styles.badgeDot} />
            Gestión de citas
          </div>

          <div ref={headerRef}>
            <h1 className={styles.title}>Reservas</h1>
            
          </div>
        </div>

        {/* Actions */}
        <div ref={actionsRef} className={styles.actions}>
          <a href="/reservas/crear" className={styles.createButton}>
            <span className={styles.createButtonIcon}>+</span>
            <span className={styles.createButtonText}>Nueva Reserva</span>
          </a>
        </div>

        {/* Calendar */}
        <div ref={calendarRef} className={styles.calendarSection}>
          <Calendar onSlotClick={handleSlotClick} />
        </div>
      </main>
    </div>
  );
}