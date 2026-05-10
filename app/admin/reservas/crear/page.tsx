'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef } from 'react';
import gsap from 'gsap';
import Header from '@/components/Header/Header';
import { type ReservationFormInitialData } from '@/components/ReservationForm/useReservationForm';
import { DiaSemana } from '@/types/reserva';
import styles from './page.module.css';
import ReservationForm from '@/components/ReservationForm';

function CrearReservaContent() {
  const searchParams = useSearchParams();
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      gsap.fromTo(
        contentRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
      );
    }
  }, []);

  const initialData: ReservationFormInitialData = {
    local: searchParams.get('local') || undefined,
    semana: searchParams.get('semana') || undefined,
    dia: (searchParams.get('dia') as DiaSemana) || undefined,
    hora_desde: searchParams.get('hora_desde') || undefined,
    hora_hasta: searchParams.get('hora_hasta') || undefined,
    servicio: searchParams.get('servicio') || undefined,
    isAdmin: true,
  };

  return (
    <div ref={contentRef} className={styles.content}>
      <ReservationForm initialData={initialData} />
    </div>
  );
}

export default function CrearReservaPage() {
  return (
    <div className={styles.pageContainer}>
      <Header />
      <main className={styles.main}>
        <Suspense
          fallback={
            <div className={styles.loading}>
              <div className={styles.loadingSpinner} />
              <p>Cargando...</p>
            </div>
          }
        >
          <CrearReservaContent />
        </Suspense>
      </main>
    </div>
  );
}
