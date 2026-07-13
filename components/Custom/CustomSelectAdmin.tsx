import styles from './CustomSelectAdmin.module.css';
// ═══════════════════════════════════════════════════════════════════
// CustomSelect — reemplaza <select> nativo para control visual total
// ═══════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface SelectOption {
  value: string;
  label: string;
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
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  // Posición fija del dropdown (se portaliza a body para no ser recortado por
  // contenedores con overflow: auto/hidden).
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);
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
      setCoords({ top: r.bottom + 6, left: r.left, width: r.width });
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

  const renderOption = (opt: SelectOption) => (
    <div
      key={opt.value}
      className={`${styles.selectOption}
        ${opt.value === value ? styles.selectOptionActive : ''}
        ${opt.disabled ? styles.selectOptionDisabled : ''}`}
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!opt.disabled) handleSelect(opt.value);
      }}
      role="option"
      aria-selected={opt.value === value}
    >
      {opt.label}
    </div>
  );

  const dropdown = open && coords && portalTarget
    ? createPortal(
      <div
        ref={dropdownRef}
        id={listboxId}
        className={styles.selectDropdown}
        role="listbox"
        aria-labelledby={ariaLabelledBy}
        style={{ position: 'fixed', top: coords.top, left: coords.left, width: coords.width, right: 'auto' }}
      >
        {placeholder && (
          <div
            className={`${styles.selectOption} ${!value ? styles.selectOptionActive : ''}`}
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleSelect(''); }}
            role="option"
            aria-selected={!value}
          >
            {placeholder}
          </div>
        )}

        {groups
          ? groups.map(g => (
            <div key={g.label}>
              <div className={styles.selectGroup}>{g.label}</div>
              {g.options.map((opt, idx) => (
                <div
                  key={`${g.label}-${opt.value}-${idx}`}
                  className={`${styles.selectOption}
                    ${opt.value === value ? styles.selectOptionActive : ''}
                    ${opt.disabled ? styles.selectOptionDisabled : ''}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!opt.disabled) handleSelect(opt.value);
                  }}
                  role="option"
                  aria-selected={opt.value === value}
                >
                  {opt.label}
                </div>
              ))}
            </div>
          ))
          : options.map(renderOption)
        }
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
        className={styles.customSelectTrigger}
        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(prev => !prev); }}
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(prev => !prev); } }}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-labelledby={ariaLabelledBy}
        aria-invalid={hasError || undefined}
      >
        <span className={selectedLabel ? styles.customSelectValue : styles.customSelectPlaceholder}>
          {selectedLabel || placeholder || 'Seleccionar'}
        </span>
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
