'use client';

import { ReservaDetalle } from '@/types/reserva';
import styles from './Calendar.module.css';

interface ReservationCardProps {
  reserva: ReservaDetalle;
  onClick?: () => void;
}

export default function ReservationCard({ reserva, onClick }: ReservationCardProps) {
  const tipoLabels: Record<string, string> = {
    mesa: 'Mesa',
    b: 'Belleza',
    baño: 'Baño',
  };

  return (
    <div 
      className={styles.reservationCard}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <span className={styles.reservationCliente}>{reserva.cliente}</span>
      <span className={styles.reservationTipo}>{tipoLabels[reserva.tipo] || reserva.tipo}</span>
    </div>
  );
}
