'use client';

import { CustomSelect } from '@/components/Custom/CustomSelectAdmin';
import { getAdminLocalScope } from '@/lib/api/localScope';
import type { InventarioItem } from '@/types/inventario';

interface ItemSelectProps {
  items: InventarioItem[];
  value: string;
  onChange: (value: string) => void;
  /** ids ya elegidos en otras líneas, para no repetirlos. */
  excludeIds?: string[];
  hasError?: boolean;
  id?: string;
  placeholder?: string;
  compact?: boolean;
  selectedLabel?: string;
  selectedSubtitle?: string;
  onSearchChange?: (query: string) => void;
  minSearchChars?: number;
  localNameFallback?: string;
}

/** Selector buscable de ítems de inventario (solo activos). */
export function ItemSelect({
  items,
  value,
  onChange,
  excludeIds = [],
  hasError,
  id,
  placeholder = 'Seleccionar ítem…',
  compact,
  selectedLabel,
  selectedSubtitle,
  onSearchChange,
  minSearchChars,
  localNameFallback,
}: ItemSelectProps) {
  const localAsignado = getAdminLocalScope()?.nombre_local;
  const options = items
    .filter((i) => i.activo && (!excludeIds.includes(String(i.id)) || String(i.id) === value))
    .map((i) => ({
      value: String(i.id),
      label: `${i.nombre} (${i.codigo})`,
      subtitle: `${i.local_nombre ?? localNameFallback ?? localAsignado ?? 'Local no especificado'} · ${i.unidad_medida}`,
    }));

  if (value && selectedLabel && !options.some((option) => option.value === value)) {
    options.unshift({ value, label: selectedLabel, subtitle: selectedSubtitle ?? '' });
  }

  return (
    <CustomSelect
      id={id}
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      hasError={hasError}
      compact={compact}
      forceSearch={Boolean(onSearchChange)}
      minSearchChars={minSearchChars}
      onSearchChange={onSearchChange}
      searchInTrigger={Boolean(onSearchChange)}
    />
  );
}
