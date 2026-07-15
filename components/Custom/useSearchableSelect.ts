'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

export interface SearchableOption {
  value: string;
  label: string;
  subtitle?: string;
  disabled?: boolean;
}

export interface SearchableGroup {
  label: string;
  options: SearchableOption[];
}

/** Opción lista para renderizar: lleva una key única (aunque haya `value` repetidos). */
export interface RenderOption extends SearchableOption {
  _key: string;
}

interface Params {
  options?: SearchableOption[];
  groups?: SearchableGroup[];
  value: string;
  open: boolean;
  onSelect: (value: string) => void;
  onClose: () => void;
  /** El buscador aparece si hay más de `threshold` opciones (0 = siempre). */
  threshold?: number;
}

const normalize = (v: string) =>
  v.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * Lógica compartida de buscador + navegación por teclado para los selects
 * personalizados (público y admin). Cada componente conserva su markup/portal.
 *
 * El resaltado se rastrea por una **key única de posición** (`_key`), no por
 * `value`: el catálogo tiene servicios distintos con el mismo `value` (mismo
 * nombre, distinto precio), así que comparar por `value` marcaría varias filas
 * a la vez y rompería las keys de React.
 */
export function useSearchableSelect({
  options = [],
  groups,
  value,
  open,
  onSelect,
  onClose,
  threshold = 6,
}: Params) {
  const [query, setQuery] = useState('');
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);

  const allOptions = useMemo(
    () => (groups ? groups.flatMap((g) => g.options) : options),
    [groups, options],
  );
  const showSearch = allOptions.length > threshold;

  const q = normalize(query.trim());

  // Filtra y etiqueta cada opción con una key única y estable (posición en el
  // recorrido). `nav` es la lista navegable (sin deshabilitadas).
  const built = useMemo(() => {
    const matches = (o: SearchableOption) =>
      q === '' ||
      normalize(o.label).includes(q) ||
      (o.subtitle ? normalize(o.subtitle).includes(q) : false);

    let i = 0;
    const tag = (o: SearchableOption): RenderOption => ({ ...o, _key: `o${i++}` });

    let visibleGroups: { label: string; options: RenderOption[] }[] | undefined;
    let visibleOptions: RenderOption[] = [];
    if (groups) {
      visibleGroups = groups
        .map((g) => ({ label: g.label, options: g.options.filter(matches).map(tag) }))
        .filter((g) => g.options.length > 0);
    } else {
      visibleOptions = options.filter(matches).map(tag);
    }

    const all = visibleGroups ? visibleGroups.flatMap((g) => g.options) : visibleOptions;
    const nav = all.filter((o) => !o.disabled);
    // Con `value` duplicados (mismo nombre, distinto precio), marcar como
    // seleccionada solo la PRIMERA coincidencia — evita resaltar varias filas.
    const selectedKey = all.find((o) => o.value === value)?._key ?? null;
    return { visibleGroups, visibleOptions, nav, selectedKey };
  }, [groups, options, q, value]);

  const isEmpty = built.visibleGroups
    ? built.visibleGroups.length === 0
    : built.visibleOptions.length === 0;

  // Al abrir: limpiar la búsqueda.
  useEffect(() => {
    if (open) setQuery('');
  }, [open]);

  // Resaltar la opción seleccionada (o la primera visible); mantener el
  // resaltado dentro de la lista filtrada al escribir.
  useEffect(() => {
    if (!open) return;
    setActiveKey((prev) => {
      if (built.nav.length === 0) return null;
      if (prev && built.nav.some((o) => o._key === prev)) return prev;
      const selected = built.nav.find((o) => o.value === value);
      return (selected ?? built.nav[0])._key;
    });
  }, [open, built.nav, value]);

  // Scroll del elemento activo a la vista.
  useEffect(() => {
    if (!open || !activeKey || !listboxRef.current) return;
    listboxRef.current
      .querySelector<HTMLElement>('[data-active="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [activeKey, open]);

  const move = (dir: 1 | -1) => {
    const { nav } = built;
    if (nav.length === 0) return;
    const idx = nav.findIndex((o) => o._key === activeKey);
    const next = idx === -1 ? 0 : (idx + dir + nav.length) % nav.length;
    setActiveKey(nav[next]._key);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      move(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      move(-1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const active = built.nav.find((o) => o._key === activeKey);
      if (active) onSelect(active.value);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return {
    query,
    setQuery,
    showSearch,
    visibleGroups: built.visibleGroups,
    visibleOptions: built.visibleOptions,
    isEmpty,
    selectedKey: built.selectedKey,
    activeKey,
    onKeyDown,
    searchInputRef,
    listboxRef,
  };
}
