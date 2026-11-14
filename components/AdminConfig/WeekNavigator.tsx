'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { todayISO } from '@/lib/utils/format';
import { moverSemana } from '@/lib/utils/semana';
import styles from './WeekNavigator.module.css';

interface WeekNavigatorProps {
  /** Cualquier día de la semana, en formato YYYY-MM-DD. */
  value: string;
  onChange: (value: string) => void;
  id?: string;
}

/**
 * Selector de semana con flechas, fecha y Hoy. Pensado para FilterBar.Item con `grow`, que le da dos columnas.
 * Es el hermano de MonthPicker: mismo borde, mismo alto y mismas flechas.
 */
export function WeekNavigator({ value, onChange, id }: WeekNavigatorProps) {
  const base = value || todayISO();
  return (
    <div className={styles.navigator} role="group" aria-label="Semana">
      <div className={styles.picker}>
        <button type="button" className={styles.arrow} onClick={() => onChange(moverSemana(base, -1))} aria-label="Semana anterior">
          <ChevronLeft size={16} strokeWidth={2} />
        </button>
        <input
          id={id}
          type="date"
          className={styles.date}
          value={value}
          onChange={(event) => onChange(event.target.value || todayISO())}
          aria-label="Fecha de la semana"
        />
        <button type="button" className={styles.arrow} onClick={() => onChange(moverSemana(base, 1))} aria-label="Semana siguiente">
          <ChevronRight size={16} strokeWidth={2} />
        </button>
      </div>
      <button type="button" className={styles.today} onClick={() => onChange(todayISO())}>
        Hoy
      </button>
    </div>
  );
}
