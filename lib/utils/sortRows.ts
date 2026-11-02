export type SortDirection = 'asc' | 'desc';

export interface SortState {
  key: string;
  dir: SortDirection;
}

const collator = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });

function estaVacio(valor: unknown): boolean {
  return valor === null || valor === undefined || valor === '';
}

function comparar(a: unknown, b: unknown): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b);
  return collator.compare(String(a), String(b));
}

/** Parametros de orden que espera el backend (`ordenar_por` y `sentido`). Sin orden pedido no se envia ninguno. */
export function sortToParams(sort: SortState | null | undefined): { ordenar_por?: string; sentido?: SortDirection } {
  if (!sort) return {};
  return { ordenar_por: sort.key, sentido: sort.dir };
}

/** Texto estable del orden, para sumarlo a la clave de filtros y que el paginador vuelva a la primera pagina. */
export function sortKey(sort: SortState | null | undefined): string {
  return sort ? `${sort.key}:${sort.dir}` : '';
}

/** Estado del orden tras hacer click en el header de `key`: misma columna alterna sentido, otra empieza en `primero`. */
export function nextSort(actual: SortState | null, key: string, primero: SortDirection = 'asc'): SortState {
  if (actual?.key === key) return { key, dir: actual.dir === 'asc' ? 'desc' : 'asc' };
  return { key, dir: primero };
}

/**
 * Ordena una copia de `rows` por `sort.key`. Los valores vacios quedan al final en ambos sentidos
 * y los empates conservan el orden de llegada. Sin `sort` devuelve las filas tal cual.
 */
export function sortRows<T extends Record<string, unknown>>(rows: T[], sort: SortState | null): T[] {
  if (!sort) return rows;
  const signo = sort.dir === 'asc' ? 1 : -1;
  return rows
    .map((row, indice) => ({ row, indice }))
    .sort((x, y) => {
      const a = x.row[sort.key];
      const b = y.row[sort.key];
      const aVacio = estaVacio(a);
      const bVacio = estaVacio(b);
      if (aVacio || bVacio) {
        if (aVacio && bVacio) return x.indice - y.indice;
        return aVacio ? 1 : -1;
      }
      return comparar(a, b) * signo || x.indice - y.indice;
    })
    .map(({ row }) => row);
}
