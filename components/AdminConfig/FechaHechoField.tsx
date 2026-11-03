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
  /** Omite la ayuda "Vacía = ahora." (modales compactos). */
  sinAyuda?: boolean;
}

/**
 * Fecha del hecho de un cargo, pago o consumo: cuándo ocurrió, no cuándo se digita. Sirve para pasar de noche lo
 * anotado en papel sin falsear el día. No permite fechas futuras; el servidor valida además el límite de días atrás.
 */
export function FechaHechoField({ id, value, onChange, label = 'Fecha del hecho', error, wide, sinAyuda }: FechaHechoFieldProps) {
  return (
    <FormField
      label={label}
      htmlFor={id}
      error={error}
      wide={wide}
      hint={sinAyuda ? undefined : 'Vacía = ahora.'}
    >
      <input id={id} type="date" value={value} max={todayISO()} onChange={(e) => onChange(e.target.value)} />
    </FormField>
  );
}
