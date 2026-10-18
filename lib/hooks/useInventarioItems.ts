'use client';

import { useAsyncData } from './useAsyncData';
import { getInventarioItems } from '@/lib/api/inventario';
import type { GetInventarioItemsParams, InventarioItem } from '@/types/inventario';

const EMPTY: InventarioItem[] = [];

/** Ítems de inventario (para tablas y selectores). Recarga al cambiar los params. */
export function useInventarioItems(params: GetInventarioItemsParams = {}) {
  const { data, loading, error, reload } = useAsyncData(() => getInventarioItems(params), JSON.stringify(params));
  return { items: data ?? EMPTY, loading, error, reload };
}
