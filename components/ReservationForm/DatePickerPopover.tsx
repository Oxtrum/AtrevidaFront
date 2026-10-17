'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './ReservationForm.module.css';

interface DatePickerPopoverProps {
  /** Fecha seleccionada (YYYY-MM-DD). */
  value: string;
  /** Primera fecha elegible (YYYY-MM-DD). */
  min: string;
  /** Última fecha elegible (YYYY-MM-DD). */
  max: string;
  onSelect: (iso: string) => void;
  /** Clase del botón disparador (por defecto, círculo de 40px del formulario). */
  triggerClassName?: string;
  iconSize?: number;
  /** Lado del que se ancla el popover respecto al botón. */
  align?: 'left' | 'right';
}

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const CABECERA = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

const toISO = (d: Date) => d.toLocaleDateString('en-CA');

/** Calendario mensual en popover. Bloquea domingos y fechas fuera de [min, max]. */
export function DatePickerPopover({
  value, min, max, onSelect,
  triggerClassName, iconSize = 18, align = 'right',
}: DatePickerPopoverProps) {
  const [open, setOpen] = useState(false);
  const [mes, setMes] = useState(() => {
    const base = value ? new Date(`${value}T00:00:00`) : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = () => {
    if (!open && value) {
      const base = new Date(`${value}T00:00:00`);
      setMes(new Date(base.getFullYear(), base.getMonth(), 1));
    }
    setOpen(o => !o);
  };

  const celdas = useMemo(() => {
    const primero = new Date(mes.getFullYear(), mes.getMonth(), 1);
    const offset = (primero.getDay() + 6) % 7; // lunes = 0
    const diasEnMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
    const out: Array<{ iso: string; dia: number; deshabilitado: boolean } | null> = [];
    for (let i = 0; i < offset; i++) out.push(null);
    for (let n = 1; n <= diasEnMes; n++) {
      const d = new Date(mes.getFullYear(), mes.getMonth(), n);
      const iso = toISO(d);
      out.push({
        iso,
        dia: n,
        deshabilitado: d.getDay() === 0 || iso < min || iso > max,
      });
    }
    return out;
  }, [mes, min, max]);

  const puedeRetroceder = toISO(new Date(mes.getFullYear(), mes.getMonth(), 0)) >= min;
  const puedeAvanzar = toISO(new Date(mes.getFullYear(), mes.getMonth() + 1, 1)) <= max;
  const hoy = toISO(new Date());

  return (
    <div className={styles.datePickerWrap} ref={wrapRef}>
      <button
        type="button"
        className={triggerClassName ?? styles.weekStepButton}
        onClick={toggle}
        aria-label="Elegir una fecha específica"
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Elegir fecha"
      >
        <CalendarDays size={iconSize} strokeWidth={1.8} />
      </button>

      {open && (
        <div className={`${styles.calendarPopover} ${align === 'left' ? styles.calendarPopoverLeft : ''}`} role="dialog" aria-label="Calendario">
          <div className={styles.calendarHeader}>
            <button
              type="button"
              className={styles.calendarNav}
              onClick={() => setMes(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
              disabled={!puedeRetroceder}
              aria-label="Mes anterior"
            >
              <ChevronLeft size={16} strokeWidth={1.8} />
            </button>
            <span className={styles.calendarTitle} aria-live="polite">
              {MESES[mes.getMonth()]} {mes.getFullYear()}
            </span>
            <button
              type="button"
              className={styles.calendarNav}
              onClick={() => setMes(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
              disabled={!puedeAvanzar}
              aria-label="Mes siguiente"
            >
              <ChevronRight size={16} strokeWidth={1.8} />
            </button>
          </div>

          <div className={styles.calendarGrid}>
            {CABECERA.map((c, i) => (
              <span key={i} className={styles.calendarWeekday}>{c}</span>
            ))}
            {celdas.map((c, i) =>
              c ? (
                <button
                  key={c.iso}
                  type="button"
                  className={[
                    styles.calendarDay,
                    c.iso === value ? styles.calendarDayActive : '',
                    c.iso === hoy ? styles.calendarDayToday : '',
                  ].filter(Boolean).join(' ')}
                  disabled={c.deshabilitado}
                  aria-pressed={c.iso === value}
                  onClick={() => { onSelect(c.iso); setOpen(false); }}
                >
                  {c.dia}
                </button>
              ) : (
                <span key={`v${i}`} />
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}
