import type { PaginationMetadata } from './pagination';

/** Filas por página al recorrer un listado completo: el máximo que acepta el servidor. */
export const PAGINA_COMPLETA = 100;

/**
 * Recorre un listado paginado por cursor y junta todas sus filas. Es para pantallas que necesitan el conjunto
 * entero (selectores, calendarios, totales) y no pueden quedarse con lo que el servidor corta sin avisar.
 * `maxPaginas` evita un ciclo infinito si el servidor nunca deja de ofrecer una página siguiente.
 */
export async function traerTodasLasPaginas<T>(
  pedir: (cursor?: string) => Promise<{ filas: T[]; paginacion?: PaginationMetadata }>,
  maxPaginas = 200,
): Promise<T[]> {
  const todas: T[] = [];
  let cursor: string | undefined;
  for (let pagina = 0; pagina < maxPaginas; pagina += 1) {
    const { filas, paginacion } = await pedir(cursor);
    todas.push(...filas);
    if (!paginacion?.has_more || !paginacion.next_cursor) return todas;
    cursor = paginacion.next_cursor;
  }
  throw new Error('El listado tiene demasiadas páginas');
}
