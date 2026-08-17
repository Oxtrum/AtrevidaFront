'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PaginationMetadata } from '@/lib/api/pagination';

interface CursorPaginationState {
  history: string[];
  index: number;
  metadata?: PaginationMetadata;
  totalPages?: number;
  activeKey: string;
  requestRevision: number;
}

export function useCursorPagination(filterKey = '') {
  const filterKeyRef = useRef(filterKey);
  const totalNeededRef = useRef(true);

  useEffect(() => {
    filterKeyRef.current = filterKey;
    totalNeededRef.current = true;
  }, [filterKey]);

  const [state, setState] = useState<CursorPaginationState>({
    history: [''],
    index: 0,
    activeKey: filterKey,
    requestRevision: 0,
  });

  const isCurrent = state.activeKey === filterKey;
  const cursor = isCurrent ? (state.history[state.index] || undefined) : undefined;
  const page = isCurrent ? state.index + 1 : 1;

  const shouldIncludeTotal = useCallback(() => totalNeededRef.current, []);

  const updateMetadata = useCallback((value: PaginationMetadata | undefined) => {
    const currentKey = filterKeyRef.current;
    if (value?.total_paginas !== undefined) totalNeededRef.current = false;

    setState((current) => {
      if (current.activeKey !== currentKey) {
        return {
          history: [''],
          index: 0,
          metadata: value,
          totalPages: value?.total_paginas,
          activeKey: currentKey,
          requestRevision: current.requestRevision,
        };
      }
      return {
        ...current,
        metadata: value,
        totalPages: value?.total_paginas ?? current.totalPages,
      };
    });
  }, []);

  const resetToFirstPage = useCallback(() => {
    totalNeededRef.current = true;
    const currentKey = filterKeyRef.current;
    setState((current) => ({
      history: [''],
      index: 0,
      metadata: undefined,
      totalPages: undefined,
      activeKey: currentKey,
      requestRevision: current.requestRevision + 1,
    }));
  }, []);

  const next = useCallback(() => {
    const currentKey = filterKeyRef.current;
    setState((current) => {
      if (current.activeKey !== currentKey || !current.metadata?.next_cursor) return current;
      return {
        ...current,
        history: [...current.history.slice(0, current.index + 1), current.metadata.next_cursor],
        index: current.index + 1,
        metadata: undefined,
      };
    });
  }, []);

  const previous = useCallback(() => {
    setState((current) => ({
      ...current,
      index: Math.max(0, current.index - 1),
      metadata: undefined,
    }));
  }, []);

  return useMemo(() => ({
    cursor,
    page,
    hasNext: isCurrent ? (state.metadata?.has_more ?? false) : false,
    totalPages: isCurrent ? state.totalPages : undefined,
    requestRevision: state.requestRevision,
    shouldIncludeTotal,
    setMetadata: updateMetadata,
    reset: resetToFirstPage,
    resetAfterMutation: resetToFirstPage,
    next,
    previous,
  }), [cursor, page, isCurrent, state.metadata?.has_more, state.totalPages, state.requestRevision,
    shouldIncludeTotal, updateMetadata, resetToFirstPage, next, previous]);
}
