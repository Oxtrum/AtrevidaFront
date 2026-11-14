'use client';

import { useEffect } from 'react';
import { armarVista, leerVista } from '@/lib/utils/vistaUrl';

/** Valores iniciales de una pestaña desde la URL (para el useState de cada filtro). Vacíos en el servidor. */
export function leerVistaCliente<K extends string>(vista: string, claves: readonly K[]): Record<K, string> {
  const search = typeof window === 'undefined' ? '' : window.location.search;
  return leerVista(search, vista, [...claves]) as Record<K, string>;
}

/** Mantiene los filtros de la pestaña en la URL para poder recargar o compartir el enlace. */
export function useVistaUrl(vista: string, valores: Record<string, string | number | boolean | null | undefined>) {
  const query = armarVista(vista, valores);
  useEffect(() => {
    window.history.replaceState(null, '', `${window.location.pathname}?${query}`);
  }, [query]);
}
