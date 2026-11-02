'use client';

import { X } from 'lucide-react';
import { DatePickerPopover } from '@/components/AdminReservationForm/DatePickerPopover';
import styles from './FechaFiltro.module.css';

interface FechaFiltroProps {
  /** YYYY-MM-DD; vacío = sin filtro. */
  value: string;
  onChange: (value: string) => void;
  /** Texto cuando no hay fecha. */
  placeholder?: string;
  /** Días hacia atrás y hacia adelante que se pueden elegir. */
  diasAtras?: number;
  diasAdelante?: number;
}

const toISO = (d: Date) => d.toLocaleDateString('en-CA');

const mover = (dias: number) => {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return toISO(d);
};

const formatear = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('es-BO', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

/**
 * Filtro de un día dentro de una FilterBar. Abre el mismo calendario del formulario de reservas, en vez del
 * selector nativo del navegador. Con una fecha elegida aparece una X para quitarla.
 */
export function FechaFiltro({ value, onChange, placeholder = 'Cualquier día', diasAtras = 730, diasAdelante = 365 }: FechaFiltroProps) {
  return (
    <div className={styles.campo}>
      <DatePickerPopover
        value={value}
        min={mover(-diasAtras)}
        max={mover(diasAdelante)}
        onSelect={onChange}
        align="left"
        iconSize={16}
        wrapClassName={styles.contenedor}
        triggerClassName={styles.disparador}
        triggerLabel={<span className={value ? styles.valor : styles.vacio}>{value ? formatear(value) : placeholder}</span>}
      />
      {value && (
        <button type="button" className={styles.quitar} onClick={() => onChange('')} aria-label="Quitar la fecha">
          <X size={14} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
