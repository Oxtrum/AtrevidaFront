'use client';

import { Building2, ChevronLeft, ChevronRight } from 'lucide-react';
import { CustomSelect } from '@/components/Custom/CustomSelectAdmin';
import { DatePickerPopover } from '@/components/AdminReservationForm/DatePickerPopover';
import styles from './ReservasToolbar.module.css';

interface ReservasToolbarProps {
  vista: 'calendario' | 'lista';
  onVistaChange: (vista: 'calendario' | 'lista') => void;
  localValue: string;
  localOptions: { value: string; label: string }[];
  onLocalChange: (value: string) => void;
  /** Sesión acotada a un local: el selector se muestra fijo. */
  localLocked?: boolean;
  semanaIndex: number;
  semanaOptions: { value: string; label: string }[];
  onSemanaChange: (value: string) => void;
  /** Fecha resaltada en el calendario (YYYY-MM-DD) y rango elegible. */
  fechaISO: string;
  minISO: string;
  maxISO: string;
  onFechaSelect: (iso: string) => void;
  /** Segunda fila, sólo en vista lista. */
  filtros?: React.ReactNode;
}

/**
 * Reúne sucursal, semana y el toggle de vista en una sola barra compacta.
 * Antes eran cuatro controles del mismo nivel repartidos en dos superficies,
 * con los selects ocupando media pantalla cada uno.
 */
export function ReservasToolbar({
  vista,
  onVistaChange,
  localValue,
  localOptions,
  onLocalChange,
  localLocked = false,
  semanaIndex,
  semanaOptions,
  onSemanaChange,
  fechaISO,
  minISO,
  maxISO,
  onFechaSelect,
  filtros,
}: ReservasToolbarProps) {
  const ultimaSemana = semanaOptions.length - 1;

  const irASemana = (siguiente: number) => {
    if (siguiente < 0 || siguiente > ultimaSemana) return;
    onSemanaChange(String(siguiente));
  };

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

        <div className={styles.weekGroup} role="group" aria-label="Semana">
          <button
            type="button"
            className={styles.stepper}
            onClick={() => irASemana(semanaIndex - 1)}
            disabled={semanaIndex <= 0}
            aria-label="Semana anterior"
          >
            <ChevronLeft size={16} strokeWidth={2.2} />
          </button>
          <div className={styles.chipSelectWide}>
            <CustomSelect
              id="reservas-semana"
              value={String(semanaIndex)}
              onChange={onSemanaChange}
              options={semanaOptions}
              searchable={false}
            />
          </div>
          <DatePickerPopover
            value={fechaISO}
            min={minISO}
            max={maxISO}
            onSelect={onFechaSelect}
            triggerClassName={styles.stepper}
            iconSize={16}
            align="right"
          />
          <button
            type="button"
            className={styles.stepper}
            onClick={() => irASemana(semanaIndex + 1)}
            disabled={semanaIndex >= ultimaSemana}
            aria-label="Semana siguiente"
          >
            <ChevronRight size={16} strokeWidth={2.2} />
          </button>
        </div>

        <div className={styles.vistaToggle} role="group" aria-label="Vista de reservas">
          <button
            type="button"
            className={`${styles.vistaButton} ${vista === 'calendario' ? styles.vistaActive : ''}`}
            onClick={() => onVistaChange('calendario')}
          >
            Calendario
          </button>
          <button
            type="button"
            className={`${styles.vistaButton} ${vista === 'lista' ? styles.vistaActive : ''}`}
            onClick={() => onVistaChange('lista')}
          >
            Lista
          </button>
        </div>
      </div>

      {vista === 'lista' && filtros && <div className={styles.filtrosRow}>{filtros}</div>}
    </div>
  );
}
