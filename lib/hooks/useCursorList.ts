'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { PAGE_LIMIT, type PaginationMetadata, type PaginationParams } from '@/lib/api/pagination';
import { useCursorPagination } from './useCursorPagination';

type Consulta<F, R> = (params: F & PaginationParams, signal: AbortSignal) => Promise<R>;

/**
 * Lista del panel con filtros de servidor y paginación por cursor.
 * Cancela la consulta anterior, ignora respuestas viejas y vuelve a la página 1 cuando cambian los filtros.
 * Cada pestaña solo dice qué filtros usa y qué función consulta.
 */
export function useCursorList<F extends object, R extends { paginacion?: PaginationMetadata }>(
  filters: F,
  consultar: Consulta<F, R>,
  mensajeError: string,
) {
  const pagination = useCursorPagination(JSON.stringify(filters));
  const { cursor, requestRevision, shouldIncludeTotal, setMetadata } = pagination;

  const [data, setData] = useState<R | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const consultarRef = useRef(consultar);
  useEffect(() => { consultarRef.current = consultar; });

  const load = useCallback(async () => {
    void requestRevision;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const id = ++requestRef.current;
    setLoading(true);
    setError(null);
    try {
      const res = await consultarRef.current(
        { ...filters, limit: PAGE_LIMIT, cursor, include_total: shouldIncludeTotal() },
        controller.signal,
      );
      if (id !== requestRef.current) return;
      setData(res);
      setMetadata(res.paginacion);
    } catch (err) {
      if (controller.signal.aborted || id !== requestRef.current) return;
      setError(err instanceof Error ? err.message : mensajeError);
    } finally {
      if (id === requestRef.current) setLoading(false);
    }
    // filters se compara por contenido (la clave de useCursorPagination), no por identidad.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters), cursor, requestRevision, shouldIncludeTotal, setMetadata, mensajeError]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => () => {
    requestRef.current += 1;
    controllerRef.current?.abort();
  }, []);

  return { data, loading, error, load, pagination };
}
