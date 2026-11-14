'use client';

import { Building2 } from 'lucide-react';
import { CustomSelect } from '@/components/Custom/CustomSelectAdmin';
import { SelectorFecha } from '@/components/AdminConfig';
import styles from './ReservasToolbar.module.css';

interface ReservasToolbarProps {
  localValue: string;
  localOptions: { value: string; label: string }[];
  onLocalChange: (value: string) => void;
  /** Sesión acotada a un local: el selector se muestra fijo. */
  localLocked?: boolean;
  /** Fecha resaltada en el calendario (YYYY-MM-DD) y rango elegible. */
  fechaISO: string;
  minISO: string;
  maxISO: string;
  onFechaSelect: (iso: string) => void;
}

/**
 * Reúne sucursal y semana del calendario en una sola barra compacta (la semana es SelectorFecha).
 * Antes eran cuatro controles del mismo nivel repartidos en dos superficies,
 * con los selects ocupando media pantalla cada uno.
 */
export function ReservasToolbar({
  localValue,
  localOptions,
  onLocalChange,
  localLocked = false,
  fechaISO,
  minISO,
  maxISO,
  onFechaSelect,
}: ReservasToolbarProps) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.row}>
        <div className={styles.chip}>
          <Building2 size={15} strokeWidth={1.9} className={styles.chipIcon} aria-hidden="true" />
          {localLocked ? (
            <span className={styles.chipStatic}>{localValue || '—'}</span>
          ) : (
            <div className={styles.chipSelect}>
              <CustomSelect
                id="reservas-local"
                value={localValue}
                onChange={onLocalChange}
                options={localOptions}
                placeholder="Sucursal"
                allowClear={false}
              />
            </div>
          )}
        </div>

        <div className={styles.weekGroup}>
          <SelectorFecha id="reservas-semana" value={fechaISO} min={minISO} max={maxISO} onChange={onFechaSelect} />
        </div>
      </div>
    </div>
  );
}
