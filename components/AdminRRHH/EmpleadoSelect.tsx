'use client';

import { CustomSelect } from '@/components/Custom/CustomSelectAdmin';
import type { Empleado } from '@/types/rrhh';

interface EmpleadoSelectProps {
  empleados: Empleado[];
  /** id del empleado como string; '' = sin selección. */
  value: string;
  onChange: (value: string) => void;
  hasError?: boolean;
  ariaLabelledBy?: string;
}

/** Selector de empleado activo (el seleccionado se conserva aunque ya esté de baja). */
export function EmpleadoSelect({ empleados, value, onChange, hasError, ariaLabelledBy }: EmpleadoSelectProps) {
  return (
    <CustomSelect
      value={value}
      onChange={onChange}
      options={empleados
        .filter((e) => e.activo || String(e.id) === value)
        .map((e) => ({ value: String(e.id), label: `${e.nombre} ${e.apellido}${e.cargo ? ` · ${e.cargo}` : ''}` }))}
      placeholder="Seleccionar empleado…"
      hasError={hasError}
      ariaLabelledBy={ariaLabelledBy}
    />
  );
}
