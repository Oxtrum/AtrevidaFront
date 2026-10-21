'use client';

import styles from './ChoiceChips.module.css';

export interface ChoiceOption<V extends string = string> {
  value: V;
  label: string;
}

interface ChoiceChipsProps<V extends string> {
  options: ChoiceOption<V>[];
  value: V;
  onChange: (value: V) => void;
  /** Nombre accesible del grupo (qué se está eligiendo). */
  ariaLabel: string;
  /** chips = botones sueltos (varias opciones); toggle = control compacto de 2 o 3 opciones en una sola pieza. */
  variant?: 'chips' | 'toggle';
}

/**
 * Elegir una opción entre pocas con un solo clic, sin abrir un desplegable. Para listas largas o con
 * búsqueda usar CustomSelect.
 */
export function ChoiceChips<V extends string>({ options, value, onChange, ariaLabel, variant = 'chips' }: ChoiceChipsProps<V>) {
  return (
    <div className={`${styles.group} ${variant === 'toggle' ? styles.toggle : ''}`} role="radiogroup" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          className={`${styles.chip} ${o.value === value ? styles.selected : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
