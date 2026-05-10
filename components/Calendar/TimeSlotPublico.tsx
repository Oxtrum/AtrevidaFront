'use client';

import { DiaSemana, ReservaDetalle, getTipoColor } from '@/types/reserva';
import {
  contarSlotsPorTipo,
  obtenerDisponibilidadEnHora,
  obtenerEtiquetaDisponibilidad,
  esHoraDisponible,
} from '@/lib/utils/calendarHelpers';
import styles from './Calendar.module.css';
import { SlotBadges } from './SlotBadges';

interface TimeSlotPublicoProps {
  dia: DiaSemana;
  slots: ReservaDetalle[] | undefined;
  hora: string;
  fecha: Date;
  onClick?: () => void;
  esPasado?: boolean;
}

/**
 * TimeSlotPublico - Muestra disponibilidad de forma resumida para el público
 * - Verde (+) si hay disponibilidad
 * - Rojo/Gris si está ocupado
 * - No muestra nombres de clientes ni servicios específicos
 */
export default function TimeSlotPublico({ dia, slots, hora, fecha, onClick, esPasado = false }: TimeSlotPublicoProps) {
  const mesasLibres = contarSlotsPorTipo(slots, 'mesa');
  const bicicletasLibres = contarSlotsPorTipo(slots, 'bicicleta');
  const hayDisponibilidad = (mesasLibres > 0 || bicicletasLibres > 0) && !esPasado;
  const esClickeable = hayDisponibilidad && esHoraDisponible(fecha);

  return (
    <div
      className={`${styles.timeSlot} ${hayDisponibilidad ? styles.timeSlotLibre : styles.timeSlotReservado} ${esPasado ? styles.timeSlotPasado : ''}`}
      onClick={esClickeable ? onClick : undefined}
      role={esClickeable ? 'button' : undefined}
      tabIndex={esClickeable ? 0 : undefined}
    >
      <div className={styles.timeSlotContent}>
        {esPasado ? (
          <div className={styles.passedSlot}><span className={styles.passedIcon}>—</span></div>
        ) : !esPasado ? (
          <div className={styles.freeSlotWithBadges}>
            {hayDisponibilidad && (
              <div className={styles.freeSlot}>
                <span className={styles.freeIcon}>+</span>
              </div>
            )}
            <SlotBadges mesas={mesasLibres} bicicletas={bicicletasLibres} slots={slots} />
          </div>
        ) : (
          <div className={styles.passedSlot}><span className={styles.passedIcon}>—</span></div>
        )}
      </div>
    </div>
  );
}