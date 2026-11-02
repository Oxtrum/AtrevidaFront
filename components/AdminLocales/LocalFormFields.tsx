'use client';

import { BedSingle, Bike, Minus, Plus } from 'lucide-react';
import styles from './LocalFormFields.module.css';

export interface Espacio {
  tipo_espacio: string;
  cantidad_espacios: number;
}

interface LocalFormFieldsProps {
  nombre: string;
  onNombreChange: (value: string) => void;
  nombreError?: string;
  autoFocusNombre?: boolean;
  espacios: Espacio[];
  onCantidadChange: (index: number, value: number) => void;
  espaciosError?: string;
  /** Texto de ayuda bajo el título de espacios; opcional. */
  espaciosHint?: string;
}

/** Cantidad entera y nunca menor que 0: 0 es válido (mantenimiento), negativo no. */
const clampCantidad = (value: number) => Math.max(0, Math.floor(Number.isFinite(value) ? value : 0));

const TIPOS = {
  M: { plural: 'Mesas', singular: 'mesa', Icon: BedSingle },
  B: { plural: 'Bicicletas', singular: 'bicicleta', Icon: Bike },
} as const;

/**
 * Campos de un local (nombre + mesas y bicicletas). Los comparten el modal de Nuevo Local y la
 * página de Editar Local, para que ambos se vean y se comporten igual.
 */
export function LocalFormFields({
  nombre, onNombreChange, nombreError, autoFocusNombre,
  espacios, onCantidadChange, espaciosError, espaciosHint,
}: LocalFormFieldsProps) {
  return (
    <>
      <div className={styles.field}>
        <label htmlFor="local-nombre" className={styles.label}>Nombre del local</label>
        <input
          id="local-nombre"
          type="text"
          className={`${styles.input} ${nombreError ? styles.inputError : ''}`}
          value={nombre}
          onChange={(e) => onNombreChange(e.target.value)}
          placeholder="Ej: SAN MARTIN"
          autoFocus={autoFocusNombre}
          aria-invalid={!!nombreError}
        />
        {nombreError && <span className={styles.fieldError}>{nombreError}</span>}
      </div>

      <div className={styles.section} role="group" aria-labelledby="local-espacios">
        <span id="local-espacios" className={styles.label}>Espacios</span>
        {espaciosHint && <p className={styles.hint}>{espaciosHint}</p>}

        <div className={styles.espacios}>
          {espacios.map((esp, i) => {
            const tipo = TIPOS[esp.tipo_espacio as keyof typeof TIPOS] ?? TIPOS.M;
            const { Icon } = tipo;
            return (
              <div key={esp.tipo_espacio} className={styles.espacio}>
                <span className={styles.espacioHead}>
                  <span className={styles.espacioIcon}><Icon size={15} strokeWidth={2} /></span>
                  {tipo.plural}
                </span>
                <div className={styles.stepper}>
                  <button
                    type="button"
                    className={styles.stepperButton}
                    onClick={() => onCantidadChange(i, clampCantidad(esp.cantidad_espacios - 1))}
                    disabled={esp.cantidad_espacios <= 0}
                    aria-label={`Quitar una ${tipo.singular}`}
                  >
                    <Minus size={15} strokeWidth={2} />
                  </button>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    className={styles.stepperValue}
                    value={esp.cantidad_espacios}
                    onChange={(e) => onCantidadChange(i, clampCantidad(Number(e.target.value)))}
                    aria-label={`Cantidad de ${tipo.plural.toLowerCase()}`}
                  />
                  <button
                    type="button"
                    className={styles.stepperButton}
                    onClick={() => onCantidadChange(i, clampCantidad(esp.cantidad_espacios + 1))}
                    aria-label={`Agregar una ${tipo.singular}`}
                  >
                    <Plus size={15} strokeWidth={2} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {espaciosError && <span className={`${styles.fieldError} ${styles.espaciosError}`}>{espaciosError}</span>}
      </div>
    </>
  );
}
