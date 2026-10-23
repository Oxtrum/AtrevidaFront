import type { PaqueteDetalle } from '@/lib/api/paquetes';

/**
 * La sección de paquetes de la página principal se muestra por defecto: solo
 * se oculta si el backend responde `mostrar_paquetes: false`. Si la consulta
 * falla no se esconde el catálogo por error.
 */
export function mostrarSeccionPaquetes(config: { mostrar_paquetes?: boolean } | null | undefined): boolean {
  return config?.mostrar_paquetes !== false;
}

/** Cuántos paquetes se ven en la página principal y cuántos están ocultos. */
export function resumenVisibilidad(paquetes: Pick<PaqueteDetalle, 'paquete'>[]): { visibles: number; ocultos: number } {
  const ocultos = paquetes.filter((p) => p.paquete.visible_publico === false).length;
  return { visibles: paquetes.length - ocultos, ocultos };
}
