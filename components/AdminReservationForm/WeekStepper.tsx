'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CustomSelect } from '../Custom/CustomSelectAdmin';
import { DatePickerPopover } from './DatePickerPopover';
import styles from './ReservationForm.module.css';

interface WeekStepperProps {
  semanaIndex: number;
  semanaOptions: Array<{ value: string; label: string }>;
  onSemanaChange: (value: string) => void;
  /** Fecha del día seleccionado (YYYY-MM-DD), para resaltarla en el calendario. */
  fechaISO: string;
  minISO: string;
  maxISO: string;
  onFechaSelect: (iso: string) => void;
  hasError?: boolean;
}

/** 📅 ‹ [semana] › — el calendario salta a una fecha concreta. */
export function WeekStepper({
  semanaIndex, semanaOptions, onSemanaChange,
  fechaISO, minISO, maxISO, onFechaSelect, hasError,
}: WeekStepperProps) {
  return (
    <div className={styles.weekStepper}>
      <DatePickerPopover value={fechaISO} min={minISO} max={maxISO} onSelect={onFechaSelect} align="left" />
      <button
        type="button"
        className={styles.weekStepButton}
        onClick={() => onSemanaChange(String(semanaIndex - 1))}
        disabled={semanaIndex <= 0}
        aria-label="Semana anterior"
      >
        <ChevronLeft size={18} strokeWidth={1.8} />
      </button>
      <CustomSelect
        value={String(semanaIndex)}
        onChange={onSemanaChange}
        options={semanaOptions}
        hasError={hasError}
        searchable={false}
      />
      <button
        type="button"
        className={styles.weekStepButton}
        onClick={() => onSemanaChange(String(semanaIndex + 1))}
        disabled={semanaIndex >= semanaOptions.length - 1}
        aria-label="Semana siguiente"
      >
        <ChevronRight size={18} strokeWidth={1.8} />
      </button>
    </div>
  );
}
