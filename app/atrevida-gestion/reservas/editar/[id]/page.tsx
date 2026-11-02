'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import ReservationForm from '@/components/AdminReservationForm';
import { AdminButton } from '@/components/AdminConfig';
import { getReservaByID } from '@/lib/api/reservas';
import type { ReservaBD } from '@/types/reserva';
import styles from './page.module.css';

/**
 * Editar una reserva: el mismo formulario de Nueva reserva, con los datos de la reserva cargados. El precio sigue
 * al servicio y el estado se maneja desde la lista (aprobar, rechazar, completar), por eso no se editan aquí.
 */
function EditarReservaContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const contentRef = useRef<HTMLDivElement>(null);
  const reservaId = params.id as string;

  const [reserva, setReserva] = useState<ReservaBD | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reservaId) return;
    let activo = true;
    getReservaByID(reservaId)
      .then((res) => {
        if (!activo) return;
        const encontrada = res.data?.reserva ?? null;
        setReserva(encontrada);
        setError(encontrada ? null : 'No se encontró la reserva.');
      })
      .catch(() => {
        if (activo) setError('No se pudo cargar la reserva.');
      })
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => { activo = false; };
  }, [reservaId]);

  useEffect(() => {
    if (cargando || !contentRef.current) return;
    gsap.fromTo(
      contentRef.current,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out', clearProps: 'transform' },
    );
  }, [cargando]);

  if (cargando) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingSpinner} />
        <p>Cargando...</p>
      </div>
    );
  }

  const volver = () => router.push('/atrevida-gestion/reservas');

  if (!reserva || reserva.estado === 'COMPLETADO') {
    return (
      <div ref={contentRef} className={styles.content}>
        <div className={styles.aviso}>
          <h2>{reserva ? `La reserva #${reserva.id} ya está completada` : 'No se puede abrir la reserva'}</h2>
          <p>{reserva ? 'Una reserva completada no se edita: su cobro y su descuento de insumos ya están hechos.' : error}</p>
          <AdminButton variant="secondary" onClick={volver}>Volver a Reservas</AdminButton>
        </div>
      </div>
    );
  }

  return (
    <div ref={contentRef} className={styles.content}>
      <ReservationForm initialData={{ isAdmin: true, reserva, aprobar: searchParams.get('aprobar') === '1' && reserva.estado === 'PENDIENTE' }} />
    </div>
  );
}

export default function EditarReservaPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.loading}>
          <div className={styles.loadingSpinner} />
          <p>Cargando...</p>
        </div>
      }
    >
      <EditarReservaContent />
    </Suspense>
  );
}
