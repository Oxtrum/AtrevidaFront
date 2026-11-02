'use client';

import { todayISO } from '@/lib/utils/format';
import { FormField } from './FormField';

interface FechaHechoFieldProps {
  id: string;
  /** YYYY-MM-DD; vacío = ahora. */
  value: string;
  onChange: (value: string) => void;
  label?: string;
  error?: string;
  wide?: boolean;
}

/**
 * Fecha del hecho de un cargo, pago o consumo: cuándo ocurrió, no cuándo se digita. Sirve para pasar de noche lo
 * anotado en papel sin falsear el día. No permite fechas futuras; el servidor valida además el límite de días atrás.
 */
export function FechaHechoField({ id, value, onChange, label = 'Fecha del hecho', error, wide }: FechaHechoFieldProps) {
  return (
    <FormField
      label={label}
      htmlFor={id}
      error={error}
      wide={wide}
      hint="Vacía = ahora. Cámbiala si ocurrió otro día."
    >
      <input id={id} type="date" value={value} max={todayISO()} onChange={(e) => onChange(e.target.value)} />
    </FormField>
  );
}
