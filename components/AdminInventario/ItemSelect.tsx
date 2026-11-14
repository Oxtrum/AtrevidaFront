'use client';

import { CustomSelect } from '@/components/Custom/CustomSelectAdmin';
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
}: ItemSelectProps) {
  const options = items
    .filter((i) => i.activo && (!excludeIds.includes(String(i.id)) || String(i.id) === value))
    .map((i) => ({ value: String(i.id), label: `${i.nombre} (${i.codigo})` }));

  return (
    <CustomSelect id={id} value={value} onChange={onChange} options={options} placeholder={placeholder} hasError={hasError} compact={compact} />
  );
}
