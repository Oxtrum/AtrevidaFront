'use client';

import { useEffect, useState } from 'react';

/** Valor que se actualiza `ms` después del último cambio; para buscadores que consultan al servidor. */
export function useDebouncedValue<T>(value: T, ms = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}
