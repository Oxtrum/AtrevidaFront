'use client';

import { useMemo, useState } from 'react';
import { sortKey, sortToParams } from '@/lib/utils/sortRows';
import type { SortState } from '@/lib/utils/sortRows';

/**
 * Orden de una tabla paginada que resuelve el servidor.
 *
 * `vista` es el orden que el servidor aplica por defecto (p. ej. fecha descendente): solo se muestra en el header,
 * no se envia. `params` lleva el orden pedido por el usuario y `key` se suma a la clave de filtros de
 * `useCursorPagination` para que cambiar el orden vuelva a la primera pagina.
 */
export function useServerSort(vista: SortState | null = null) {
  const [sort, setSort] = useState<SortState | null>(null);
  return useMemo(
    () => ({
      sort: sort ?? vista,
      onSortChange: setSort,
      params: sortToParams(sort),
      key: sortKey(sort),
    }),
    [sort, vista],
  );
}
