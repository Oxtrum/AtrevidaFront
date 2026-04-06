'use client';

import { DiaSemana, FechaDia } from '@/types/reserva';
import styles from './ReservationForm.module.css';

interface DayInfo {
  value: DiaSemana;
  label: string;
  esPasado: boolean;
  fecha: FechaDia | null;
}

interface DaySelectorProps {
  dias: DayInfo[];
  diaActivo: DiaSemana;
  onChange: (dia: DiaSemana) => void;
}

export function DaySelector({ dias, diaActivo, onChange }: DaySelectorProps) {
  return (
    <div className={styles.daySelector}>
      {dias.map((d) => (
        <button
          key={d.value}
          type="button"
          className={[
            styles.dayChip,
            diaActivo === d.value ? styles.dayChipActive : '',
            d.esPasado ? styles.dayChipDisabled : '',
          ]
            .filter(Boolean)
            .join(' ')}
          onClick={() => { if (!d.esPasado) onChange(d.value); }}
          disabled={d.esPasado}
        >
          <span className={styles.dayChipLabel}>{d.label}</span>
          {d.fecha && (
            <span className={styles.dayChipDate}>
              {String(d.fecha.dia)} {d.fecha.mes}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}