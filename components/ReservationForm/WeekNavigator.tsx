'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './ReservationForm.module.css';

interface WeekDay {
  iso: string;
  label: string;
  dia: number;
  mes: string;
  esPasado: boolean;
  activo: boolean;
}

interface WeekNavigatorProps {
  titulo: string;
  dias: WeekDay[];
  puedeRetroceder: boolean;
  onPrev: () => void;
  onNext: () => void;
  onSelect: (iso: string) => void;
}

export function WeekNavigator({ titulo, dias, puedeRetroceder, onPrev, onNext, onSelect }: WeekNavigatorProps) {
  return (
    <div className={styles.weekNav}>
      <div className={styles.weekNavHeader}>
        <button
          type="button"
          className={styles.weekNavArrow}
          onClick={onPrev}
          disabled={!puedeRetroceder}
          aria-label="Semana anterior"
        >
          <ChevronLeft size={18} strokeWidth={1.8} />
        </button>
        <span className={styles.weekNavTitle} aria-live="polite">{titulo}</span>
        <button
          type="button"
          className={styles.weekNavArrow}
          onClick={onNext}
          aria-label="Semana siguiente"
        >
          <ChevronRight size={18} strokeWidth={1.8} />
        </button>
      </div>
      <div className={styles.daySelector}>
        {dias.map((d) => (
          <button
            key={d.iso}
            type="button"
            className={[
              styles.dayChip,
              d.activo ? styles.dayChipActive : '',
              d.esPasado ? styles.dayChipDisabled : '',
            ].filter(Boolean).join(' ')}
            onClick={() => onSelect(d.iso)}
            disabled={d.esPasado}
            aria-pressed={d.activo}
          >
            <span className={styles.dayChipLabel}>{d.label}</span>
            <span className={styles.dayChipDate}>{d.dia} {d.mes}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
