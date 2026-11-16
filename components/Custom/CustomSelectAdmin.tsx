import styles from './CustomSelectAdmin.module.css';
// ═══════════════════════════════════════════════════════════════════
// CustomSelect — reemplaza <select> nativo para control visual total
// ═══════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Search } from "lucide-react";
import { useSearchableSelect, type RenderOption } from "./useSearchableSelect";

interface SelectOption {
  value: string;
  label: string;
  /** Contexto secundario opcional, por ejemplo local y unidad de medida. */
  subtitle?: string;
  disabled?: boolean;
}

interface CustomSelectProps {
  value: string;
  onChange: (v: string) => void;
  options?: SelectOption[];
  groups?: { label: string; options: SelectOption[] }[];
  placeholder?: string;
  hasError?: boolean;
  id?: string;
  ariaLabelledBy?: string;
  /** false oculta el buscador aunque haya muchas opciones (p. ej. lista de semanas). */
  searchable?: boolean;
  /** true muestra el placeholder como opción seleccionable ("vaciar selección", p. ej. "Todos"). Por defecto no es seleccionable. */
  allowClear?: boolean;
  /** Altura reducida (36px) para filas de tablas/editores. */
  compact?: boolean;
  /** Muestra el buscador aunque todavía no haya opciones cargadas. */
  forceSearch?: boolean;
  /** Caracteres requeridos antes de mostrar resultados. */
  minSearchChars?: number;
  /** Útil cuando las opciones se consultan bajo demanda. */
  onSearchChange?: (query: string) => void;
  /** Coloca la búsqueda en el propio disparador, sin desplegar un panel vacío. */
  searchInTrigger?: boolean;
}

export function CustomSelect({
  value,
  onChange,
  options = [],
  groups,
  placeholder,
  hasError,
  id,
  ariaLabelledBy,
  searchable = true,
  allowClear = false,
  compact = false,
  forceSearch = false,
  minSearchChars = 0,
  onSearchChange,
  searchInTrigger = false,
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  // Posición fija del dropdown (se portaliza a body para no ser recortado por
  // contenedores con overflow: auto/hidden).
  const [coords, setCoords] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
    maxHeight: number;
    placement: 'top' | 'bottom';
  } | null>(null);
  const [portalTarget, setPortalTarget] = useState<Element | null>(null);

  // Manejo robusto de listeners globales y BFCache
  // Guardar referencias para poder remover/volver a añadir cuando el navegador
  // restaure la página desde el bfcache (pageshow/pagehide).
  const handlersRef = useRef<{
    m?: (e: MouseEvent) => void;
    k?: (e: KeyboardEvent) => void;
  }>({});

  const attachHandlers = () => {
    // Evitar re-attach
    if (handlersRef.current.m && handlersRef.current.k) return;

    const m = (e: MouseEvent) => {
      const target = e.target as Node;
      const inTrigger = ref.current?.contains(target);
      const inDropdown = dropdownRef.current?.contains(target);
      if (!inTrigger && !inDropdown) setOpen(false);
    };
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', m);
    document.addEventListener('keydown', k);
    handlersRef.current = { m, k };
  };

  const removeHandlers = () => {
    if (handlersRef.current.m) document.removeEventListener('mousedown', handlersRef.current.m);
    if (handlersRef.current.k) document.removeEventListener('keydown', handlersRef.current.k);
    handlersRef.current = {};
  };

  useEffect(() => {
    attachHandlers();

    const onPageShow = (ev: PageTransitionEvent) => {
      // Si la página fue restaurada desde BFCache (ev.persisted === true)
      // re-attach handlers y cerrar cualquier dropdown abierto para tener
      // un estado consistente.
      if (ev.persisted) {
        removeHandlers();
        attachHandlers();
        setOpen(false);
      }
    };

    const onPageHide = (ev: PageTransitionEvent) => {
      // Si el navegador va a guardar la página en BFCache, remover handlers
      // para evitar que el estado del listener quede corrupto cuando se restaure.
      if (ev.persisted) {
        removeHandlers();
      }
    };

    window.addEventListener('pageshow', onPageShow);
    window.addEventListener('pagehide', onPageHide);

    return () => {
      removeHandlers();
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, []);

  // Mientras está abierto: posicionar el dropdown bajo el trigger y mantenerlo
  // pegado ante scroll (de cualquier contenedor, por eso capture) o resize.
  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const el = triggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const gap = 6;
      const margin = 12;
      const desiredHeight = 280;
      const espacioAbajo = window.innerHeight - r.bottom - gap - margin;
      const espacioArriba = r.top - gap - margin;
      const abrirArriba = espacioAbajo < desiredHeight && espacioArriba > espacioAbajo;
      const maxHeight = Math.max(120, Math.min(desiredHeight, abrirArriba ? espacioArriba : espacioAbajo));
      setCoords({
        // Al abrir arriba se ancla el borde inferior al disparador. Así el
        // panel crece desde el campo según sus resultados reales, en vez de
        // reservar siempre sus 280px máximos y quedar flotando a media página.
        top: abrirArriba ? undefined : r.bottom + gap,
        bottom: abrirArriba ? window.innerHeight - r.top + gap : undefined,
        left: r.left,
        width: r.width,
        maxHeight,
        placement: abrirArriba ? 'top' : 'bottom',
      });
      // Portalizar dentro del scope [data-admin="true"] (donde viven las vars
      // --admin-*), no a document.body, o el dropdown pierde fondo/color/borde.
      // Sigue escapando el overflow del modal porque el root admin está por encima.
      setPortalTarget(el.closest('[data-admin="true"]') ?? document.body);
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open]);

  const listboxId = id ? `${id}-listbox` : undefined;
  const allOptions = groups ? groups.flatMap(g => g.options) : options;
  const selectedLabel = allOptions.find(o => o.value === value)?.label;

  const handleSelect = (val: string) => {
    onChange(val);
    setOpen(false);
  };

  const {
    query, setQuery, showSearch,
    visibleGroups, visibleOptions, isEmpty,
    selectedKey, activeKey, onKeyDown,
    searchInputRef, listboxRef,
  } = useSearchableSelect({
    options, groups, value, open,
    onSelect: handleSelect,
    onClose: () => setOpen(false),
    threshold: searchable ? undefined : Number.POSITIVE_INFINITY,
  });

  useEffect(() => {
    if (!open) return;
    onSearchChange?.('');
  }, [open, onSearchChange]);

  const puedeMostrarResultados = minSearchChars === 0 || query.trim().length >= minSearchChars;

  const renderOption = (opt: RenderOption) => (
    <div
      key={opt._key}
      className={`${styles.selectOption}
        ${opt._key === selectedKey ? styles.selectOptionActive : ''}
        ${opt._key === activeKey ? styles.selectOptionHighlight : ''}
        ${opt.disabled ? styles.selectOptionDisabled : ''}`}
      data-active={opt._key === activeKey ? 'true' : undefined}
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!opt.disabled) handleSelect(opt.value);
      }}
      role="option"
      aria-selected={opt._key === selectedKey}
    >
      <span className={styles.selectOptionText}>
        <span>{opt.label}</span>
        {opt.subtitle && <span className={styles.selectOptionSubtitle}>{opt.subtitle}</span>}
      </span>
    </div>
  );

  const dropdown = open && coords && portalTarget && (!searchInTrigger || puedeMostrarResultados)
    ? createPortal(
      <div
        ref={(el) => { dropdownRef.current = el; listboxRef.current = el; }}
        id={listboxId}
        className={styles.selectDropdown}
        role="listbox"
        aria-labelledby={ariaLabelledBy}
        data-placement={coords.placement}
        style={{
          position: 'fixed',
          // La hoja de estilos define `top` por defecto; usar `auto` aquí es
          // necesario al anclar hacia arriba para que no compita con `bottom`.
          top: coords.top ?? 'auto',
          bottom: coords.bottom ?? 'auto',
          left: coords.left,
          width: coords.width,
          maxHeight: coords.maxHeight,
          right: 'auto',
        }}
      >
        {!searchInTrigger && (showSearch || forceSearch) && (
          <div className={styles.selectSearch}>
            <Search size={15} strokeWidth={1.8} aria-hidden="true" />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                onSearchChange?.(e.target.value);
              }}
              onKeyDown={onKeyDown}
              onMouseDown={(e) => e.stopPropagation()}
              placeholder="Buscar..."
              aria-label="Buscar opción"
              autoFocus
            />
          </div>
        )}

        {/* Sin allowClear el placeholder no es una opción: se muestra como título de la lista. */}
        {puedeMostrarResultados && placeholder && !allowClear && !query && (
          <div className={styles.selectGroup} role="presentation">{placeholder}</div>
        )}

        {puedeMostrarResultados && placeholder && allowClear && !query && (
          <div
            className={`${styles.selectOption} ${!value ? styles.selectOptionActive : ''}`}
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleSelect(''); }}
            role="option"
            aria-selected={!value}
          >
            {placeholder}
          </div>
        )}

        {!puedeMostrarResultados ? (
          <div className={styles.selectEmpty}>Escribe al menos {minSearchChars} caracteres</div>
        ) : visibleGroups
          ? visibleGroups.map(g => (
            <div key={g.label}>
              <div className={styles.selectGroup}>{g.label}</div>
              {g.options.map(renderOption)}
            </div>
          ))
          : visibleOptions.map(renderOption)
        }

        {puedeMostrarResultados && isEmpty && (
          <div className={styles.selectEmpty}>Sin resultados</div>
        )}
      </div>,
      portalTarget,
    )
    : null;

  return (
    <div
      ref={ref}
      className={`${styles.customSelect} ${hasError ? styles.inputError : ''} ${open ? styles.customSelectOpen : ''}`}
    >
      <div
        ref={triggerRef}
        id={id}
        className={`${styles.customSelectTrigger} ${compact ? styles.customSelectCompact : ''}`}
        onMouseDown={(e) => {
          if (e.target instanceof HTMLInputElement) return;
          e.preventDefault();
          e.stopPropagation();
          setOpen(prev => !prev);
        }}
        tabIndex={0}
        onKeyDown={(e) => {
          if (!open) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(true); }
          } else {
            onKeyDown(e);
          }
        }}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-labelledby={ariaLabelledBy}
        aria-invalid={hasError || undefined}
      >
        {searchInTrigger && open ? (
          <input
            ref={searchInputRef}
            className={styles.customSelectSearchTrigger}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              onSearchChange?.(e.target.value);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              e.stopPropagation();
              onKeyDown(e);
            }}
            placeholder={minSearchChars > 0 ? `Buscar (mín. ${minSearchChars} caracteres)…` : 'Buscar...'}
            aria-label="Buscar opción"
            autoFocus
          />
        ) : (
          <span className={selectedLabel ? styles.customSelectValue : styles.customSelectPlaceholder}>
            {selectedLabel || placeholder || 'Seleccionar'}
          </span>
        )}
        <span className={`${styles.customSelectArrow} ${open ? styles.customSelectArrowOpen : ''}`}>
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true">
            <path d="M5 6L0 0H10L5 6Z" fill="currentColor" />
          </svg>
        </span>
      </div>

      {dropdown}
    </div>
  );
}
