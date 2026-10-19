'use client';

import { CustomSelect } from '@/components/Custom/CustomSelectAdmin';
import { useLocales } from '@/lib/hooks/useLocales';

interface LocalSelectProps {
  /** id del local como string; '' = sin selección / opción vacía. */
  value: string;
  onChange: (value: string) => void;
  /** Texto de la opción vacía ("Todos los locales", "General (sin local)"…). Omitir = obligatoria. */
  emptyLabel?: string;
  hasError?: boolean;
  id?: string;
}

/**
 * Selector de local. `useLocales` ya limita a su local a usuarios no admin;
 * quien lo usa precarga `getAdminLocalScope()?.local_id` como valor inicial.
 */
export function LocalSelect({ value, onChange, emptyLabel, hasError, id }: LocalSelectProps) {
  const { locales } = useLocales();
  // La opción vacía ("General (sin local)", "Todos") ya es una opción real; el placeholder queda como título.
  const options = [
    ...(emptyLabel ? [{ value: '', label: emptyLabel }] : []),
    ...locales.map((l) => ({ value: String(l.id), label: l.nombre })),
  ];

  return (
    <CustomSelect
      id={id}
      value={value}
      onChange={onChange}
      options={options}
      placeholder="Seleccionar local…"
      hasError={hasError}
      searchable={false}
    />
  );
}
