'use client';

import { useCallback, useMemo, useState } from 'react';
import type { PaginationMetadata } from '@/lib/api/pagination';

export function useCursorPagination(filterKey = '') {
  const [history, setHistory] = useState<string[]>(['']);
  const [index, setIndex] = useState(0);
  const [metadata, setMetadata] = useState<PaginationMetadata | undefined>();
	const [totalPages, setTotalPages] = useState<number | undefined>();
	const [activeKey, setActiveKey] = useState(filterKey);

	const isCurrent = activeKey === filterKey;
  const cursor = isCurrent ? (history[index] || undefined) : undefined;
	const page = isCurrent ? index + 1 : 1;
	const updateMetadata = useCallback((value: PaginationMetadata | undefined) => {
		if (activeKey !== filterKey) {
			setHistory(['']);
			setIndex(0);
			setActiveKey(filterKey);
			setTotalPages(value?.total_paginas);
		} else if (value?.total_paginas !== undefined) {
			setTotalPages(value.total_paginas);
		}
		setMetadata(value);
	}, [activeKey, filterKey]);
  const reset = useCallback(() => {
    setHistory(['']);
    setIndex(0);
    setMetadata(undefined);
	setTotalPages(undefined);
	setActiveKey(filterKey);
  }, [filterKey]);
  const next = useCallback(() => {
	if (!isCurrent) return;
    const value = metadata?.next_cursor;
    if (!value) return;
    setHistory((current) => [...current.slice(0, index + 1), value]);
    setIndex((current) => current + 1);
    setMetadata(undefined);
  }, [index, isCurrent, metadata?.next_cursor]);
  const previous = useCallback(() => {
    setIndex((current) => Math.max(0, current - 1));
    setMetadata(undefined);
  }, []);

  return useMemo(() => ({
    cursor,
	page,
    hasNext: isCurrent ? (metadata?.has_more ?? false) : false,
	totalPages: isCurrent ? totalPages : undefined,
	includeTotal: !isCurrent || totalPages === undefined,
    setMetadata: updateMetadata,
    reset,
    next,
    previous,
	}), [cursor, page, isCurrent, metadata?.has_more, totalPages, next, previous, reset, updateMetadata]);
}
