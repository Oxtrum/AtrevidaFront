'use client';

import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CustomSelect } from '@/components/Custom/CustomSelectAdmin';
import { DatePickerPopover } from '@/components/AdminReservationForm/DatePickerPopover';
import { todayISO } from '@/lib/utils/format';
import { lunesDe, moverDiaHabil, semanasEntre, sumarDias } from '@/lib/utils/semana';
import styles from './SelectorFecha.module.css';

interface SelectorFechaProps {
  /** Fecha en YYYY-MM-DD. Con `unidad="semana"`, cualquier día de la semana. */
  value: string;
  /**
   * `semana`: flechas o lista; entrega el lunes de la semana elegida.
   * `dia`: flechas o calendario; entrega esa fecha.
   */
  onChange: (iso: string, origen: 'semana' | 'dia') => void;
  /** Qué se elige: una semana (calendarios, formulario de reserva) o un día concreto (Jornada). */
  unidad?: 'semana' | 'dia';
  /** Primera y última fecha elegibles. Por defecto 2 años atrás y 1 adelante. */
  min?: string;
  max?: string;
  /** Botón Hoy, visible solo cuando no estás en hoy. */
  conHoy?: boolean;
  /** Fecha de hoy si no es la del navegador (el servidor manda la suya). */
  today?: string;
  hasError?: boolean;
  id?: string;
}

const textoDia = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

/**
 * Selector de fecha del panel. Por semana: ‹ [Semana 9 al 14 de noviembre ▾] 📅 ›.
 * Por día: ‹ [📅 sábado 14 de noviembre de 2026] ›. Es el único: Reservas, el formulario de reserva,
 * Atenciones e Inventario lo usan, y todo cambio visual va aquí.
 */
export function SelectorFecha({ value, onChange, unidad = 'semana', min, max, conHoy = false, today, hasError, id }: SelectorFechaProps) {
  const porDia = unidad === 'dia';
  const hoy = today || todayISO();
  const base = value || hoy;
  // La fecha elegida siempre debe estar dentro del rango, aunque quede fuera del rango por defecto.
  const desde = [min || sumarDias(hoy, -730), base].sort()[0];
  const hasta = [max || sumarDias(hoy, 365), base].sort().reverse()[0];
  const semanas = useMemo(() => semanasEntre(desde, hasta), [desde, hasta]);

  const lunes = lunesDe(base);
  const indice = semanas.findIndex((s) => s.inicio === lunes);
  const irASemana = (nuevo: number) => {
    if (semanas[nuevo]) onChange(semanas[nuevo].inicio, 'semana');
  };
  const irADia = (sentido: 1 | -1) => {
    const destino = moverDiaHabil(base, sentido);
    if (destino >= desde && destino <= hasta) onChange(destino, 'dia');
  };
  const atras = porDia ? moverDiaHabil(base, -1) < desde : indice <= 0;
  const adelante = porDia ? moverDiaHabil(base, 1) > hasta : indice < 0 || indice >= semanas.length - 1;
  const esHoy = porDia ? base === hoy : lunes === lunesDe(hoy);

  return (
    <div className={styles.grupo} role="group" aria-label={porDia ? 'Día' : 'Semana'}>
      <button
        type="button"
        className={styles.paso}
        onClick={() => (porDia ? irADia(-1) : irASemana(indice - 1))}
        disabled={atras}
        aria-label={porDia ? 'Día anterior' : 'Semana anterior'}
      >
        <ChevronLeft size={16} strokeWidth={2.2} />
      </button>

      {porDia ? (
        <DatePickerPopover
          value={base}
          min={desde}
          max={hasta}
          onSelect={(iso) => onChange(iso, 'dia')}
          wrapClassName={styles.lista}
          triggerClassName={styles.campo}
          triggerLabel={<span className={styles.campoTexto}>{textoDia(base)}</span>}
          iconSize={16}
          align="left"
        />
      ) : (
        <>
          <div className={styles.lista}>
            <CustomSelect
              id={id}
              value={lunes}
              onChange={(inicio) => onChange(inicio, 'semana')}
              options={semanas.map((s) => ({ value: s.inicio, label: s.titulo }))}
              hasError={hasError}
              searchable={false}
            />
          </div>
          <DatePickerPopover
            value={base}
            min={desde}
            max={hasta}
            onSelect={(iso) => onChange(iso, 'dia')}
            triggerClassName={styles.paso}
            iconSize={16}
            align="right"
          />
        </>
      )}

      <button
        type="button"
        className={styles.paso}
        onClick={() => (porDia ? irADia(1) : irASemana(indice + 1))}
        disabled={adelante}
        aria-label={porDia ? 'Día siguiente' : 'Semana siguiente'}
      >
        <ChevronRight size={16} strokeWidth={2.2} />
      </button>
      {conHoy && !esHoy && (
        <button type="button" className={styles.hoy} onClick={() => onChange(porDia ? hoy : lunesDe(hoy), porDia ? 'dia' : 'semana')}>
          Hoy
        </button>
      )}
    </div>
  );
}
