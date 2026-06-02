import styles from './CustomSelect.module.css';
// ═══════════════════════════════════════════════════════════════════
// CustomSelect — reemplaza <select> nativo para control visual total
// ═══════════════════════════════════════════════════════════════════

import { useEffect, useId, useRef, useState } from "react";

interface SelectOption {
  value: string;
  label: string;
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
  const generatedId = useId();

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
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
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

  const allOptions = groups ? groups.flatMap(g => g.options) : options;
  const selectedLabel = allOptions.find(o => o.value === value)?.label;
  const triggerId = id ?? `${generatedId}-trigger`;
  const listboxId = `${triggerId}-listbox`;

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
      <span>{opt.label}</span>
      {opt.subtitle && (
        <span className={styles.selectOptionSubtitle}>{opt.subtitle}</span>
      )}
    </div>
  );

  return (
    <div
      ref={ref}
      className={`${styles.customSelect} ${hasError ? styles.inputError : ''} ${open ? styles.customSelectOpen : ''}`}
      aria-expanded={open}
    >
      <div
        id={triggerId}
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
            <path d="M5 6L0 0H10L5 6Z" fill="#EC008C" />
          </svg>
        </span>
      </div>

      {open && (
        <div id={listboxId} className={styles.selectDropdown} role="listbox" aria-labelledby={ariaLabelledBy}>
          {placeholder && (
            <div
              className={`${styles.selectOption} ${!value ? styles.selectOptionActive : ''}`}
              onClick={() => handleSelect('')}
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
                {g.options.map(renderOption)}
              </div>
            ))
            : options.map(renderOption)
          }
        </div>
      )}
    </div>
  );
}
