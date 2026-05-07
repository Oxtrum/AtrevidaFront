import styles from '../Calendar/Calendar.module.css';

export function SlotBadges({ mesas, bicicletas }: { mesas: number; bicicletas: number }) {
  if (mesas === 0 && bicicletas === 0) return null;

  return (
    <div className={styles.slotBadges}>
      {mesas > 0 && (
        <span className={styles.slotBadgeMesa}>
          {mesas} {mesas === 1 ? 'Mesa Libre' : 'Mesas Libres'}
        </span>
      )}
      {bicicletas > 0 && (
        <span className={styles.slotBadgeBicicleta}>
          {bicicletas} {bicicletas === 1 ? 'Bicicleta Libre' : 'Bicicletas Libres'}
        </span>
      )}
    </div>
  );
}