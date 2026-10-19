'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './MonthPicker.module.css';

interface MonthPickerProps {
  /** Mes en formato YYYY-MM. */
  value: string;
  onChange: (value: string) => void;
  id?: string;
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** "2026-10" → "Octubre 2026". */
export function formatMes(value: string): string {
  const [y, m] = value.split('-').map(Number);
  const nombre = MESES[(m || 1) - 1] ?? '';
  return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${y}`;
}

function desplazar(value: string, delta: number): string {
  const [y, m] = value.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Selector de mes con flechas: más rápido y legible que el `<input type="month">` del navegador. */
export function MonthPicker({ value, onChange, id }: MonthPickerProps) {
  return (
    <div className={styles.picker} role="group" aria-label="Mes">
      <button type="button" className={styles.arrow} onClick={() => onChange(desplazar(value, -1))} aria-label="Mes anterior">
        <ChevronLeft size={16} strokeWidth={2} />
      </button>
      <span id={id} className={styles.label} aria-live="polite">{formatMes(value)}</span>
      <button type="button" className={styles.arrow} onClick={() => onChange(desplazar(value, 1))} aria-label="Mes siguiente">
        <ChevronRight size={16} strokeWidth={2} />
      </button>
    </div>
  );
}
