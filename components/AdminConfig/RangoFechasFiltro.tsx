'use client';

import { DatePickerPopover } from '@/components/AdminReservationForm/DatePickerPopover';
import styles from './CampoFecha.module.css';

interface Atajo<V extends string> {
  value: V;
  label: string;
}

interface RangoFechasFiltroProps<V extends string> {
  /** Atajos que se eligen con un toque (por ejemplo Próximas o Todas). */
  atajos: Atajo<V>[];
  /** Atajo activo, o RANGO cuando se eligieron dos días en el calendario. */
  valor: V | 'RANGO';
  onAtajo: (valor: V) => void;
  /** Rango elegido en el calendario (YYYY-MM-DD); solo se muestra con valor RANGO. */
  desde: string;
  hasta: string;
  onRango: (desde: string, hasta: string) => void;
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
  new Date(`${iso}T00:00:00`).toLocaleDateString('es-BO', { day: 'numeric', month: 'short' }).replace(/\./g, '');

/**
 * Filtro de fechas de una FilterBar: un solo campo que dice qué fechas se ven. Abre el calendario del formulario
 * de reservas; ahí se toca el primer y el último día del rango, o se usa un atajo.
 */
export function RangoFechasFiltro<V extends string>({
  atajos,
  valor,
  onAtajo,
  desde,
  hasta,
  onRango,
  diasAtras = 730,
  diasAdelante = 365,
}: RangoFechasFiltroProps<V>) {
  const etiqueta = valor === 'RANGO'
    ? desde === hasta ? formatear(desde) : `${formatear(desde)} – ${formatear(hasta)}`
    : atajos.find((a) => a.value === valor)?.label ?? '';

  return (
    <DatePickerPopover
      value=""
      min={mover(-diasAtras)}
      max={mover(diasAdelante)}
      onSelect={() => undefined}
      rango={valor === 'RANGO' ? { desde, hasta } : undefined}
      onSelectRange={onRango}
      align="left"
      iconSize={16}
      wrapClassName={styles.contenedor}
      triggerClassName={styles.disparador}
      triggerLabel={<span className={styles.valor}>{etiqueta}</span>}
      encabezado={(cerrar) => (
        <div className={styles.atajos} role="group" aria-label="Atajos de fechas">
          {atajos.map((a) => (
            <button
              key={a.value}
              type="button"
              className={`${styles.atajo} ${valor === a.value ? styles.atajoActivo : ''}`}
              onClick={() => {
                onAtajo(a.value);
                cerrar();
              }}
            >
              {a.label}
            </button>
          ))}
          <p className={styles.ayuda}>O toca el primer y el último día.</p>
        </div>
      )}
    />
  );
}
