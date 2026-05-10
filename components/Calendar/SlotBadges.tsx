import styles from '../Calendar/Calendar.module.css';
import { ReservaDetalle, normalizeTipo } from '@/types/reserva';

interface SlotBadgesProps {
  mesas: number;
  bicicletas: number;
  slots?: ReservaDetalle[];
}

export function SlotBadges({ mesas, bicicletas, slots = [] }: SlotBadgesProps) {
  // Verificar si existen configuraciones para mesas/bicis en este slot
  const tieneMesas = slots.some(s => normalizeTipo(s.tipo) === 'm');
  const tieneBicis = slots.some(s => normalizeTipo(s.tipo) === 'b');

  // Si no hay nada definido para este slot, no mostramos nada
  if (!tieneMesas && !tieneBicis) return null;

  // CASO: TODO OCUPADO (Sin espacios de ningún tipo)
  if (mesas === 0 && bicicletas === 0) {
    return (
      <div className={styles.slotBadges}>
        <span className={styles.slotBadgeOcupado} style={{ width: '100%', textAlign: 'center' }}>
          Sin espacios disponibles
        </span>
      </div>
    );
  }

  return (
    <div className={styles.slotBadges}>
      {/* MESAS */}
      {mesas > 0 ? (
        <span className={styles.slotBadgeMesa}>
          {mesas} {mesas === 1 ? 'Mesa Libre' : 'Mesas Libres'}
        </span>
      ) : tieneMesas ? (
        <span className={styles.slotBadgeOcupado}>
          Mesas llenas
        </span>
      ) : null}

      {/* BICICLETAS */}
      {bicicletas > 0 ? (
        <span className={styles.slotBadgeBicicleta}>
          {bicicletas} {bicicletas === 1 ? 'Bicicleta Libre' : 'Bicicletas Libres'}
        </span>
      ) : tieneBicis ? (
        <span className={styles.slotBadgeOcupado}>
          Bicis llenas
        </span>
      ) : null}
    </div>
  );
}