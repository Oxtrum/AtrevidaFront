'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { getReservaByID } from '@/lib/api/reservas';
import type { ReservaBD } from '@/types/reserva';

interface Props {
  onLoad: (reserva: ReservaBD) => void;
  onError: () => void;
}

/**
 * Lee `?reserva=<id>` y carga esa reserva para precargar el cobro. Va en su propio componente
 * (dentro de Suspense) porque `useSearchParams` lo exige en páginas que se prerenderizan.
 */
export function CobroReservaLoader({ onLoad, onError }: Props) {
  const reservaId = useSearchParams().get('reserva');

  useEffect(() => {
    if (!reservaId) return;
    let cancelled = false;
    getReservaByID(reservaId)
      .then((res) => {
        if (cancelled) return;
        if (res.data?.reserva) onLoad(res.data.reserva);
        else onError();
      })
      .catch(() => {
        if (!cancelled) onError();
      });
    return () => { cancelled = true; };
  }, [reservaId, onLoad, onError]);

  return null;
}
