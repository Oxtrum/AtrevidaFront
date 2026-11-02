'use client';

import { DatePickerPopover } from '@/components/AdminReservationForm/DatePickerPopover';
import styles from './CampoFecha.module.css';

interface CampoFechaProps {
  /** YYYY-MM-DD. */
  value: string;
  onChange: (value: string) => void;
  /** Primera y ultima fecha elegibles (YYYY-MM-DD). */
  min: string;
  max: string;
  placeholder?: string;
}

const formatear = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('es-BO', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).replace(/\./g, '');

/**
 * Un dia elegido en el calendario global de reservas, con el aspecto de un campo de formulario. Reemplaza al
 * selector de fecha del navegador: no deja escribir fechas sueltas y bloquea los domingos.
 */
export function CampoFecha({ value, onChange, min, max, placeholder = 'Elegir fecha' }: CampoFechaProps) {
  return (
    <DatePickerPopover
      value={value}
      min={min}
      max={max}
      onSelect={onChange}
      align="left"
      iconSize={16}
      wrapClassName={styles.contenedor}
      triggerClassName={styles.disparador}
      triggerLabel={<span className={value ? styles.valor : styles.vacio}>{value ? formatear(value) : placeholder}</span>}
    />
  );
}
