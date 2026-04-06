import styles from './CustomSelect.module.css';
// ═══════════════════════════════════════════════════════════════════
// CustomSelect — reemplaza <select> nativo para control visual total
// ═══════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from "react";

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
}

export function CustomSelect({ value, onChange, options = [], groups, placeholder, hasError }: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Cerrar al hacer click afuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Cerrar con Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

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
      onClick={() => !opt.disabled && handleSelect(opt.value)}
      role="option"
      aria-selected={opt.value === value}
    >
      {opt.label}
    </div>
  );

  return (
    <div
      ref={ref}
      className={`${styles.customSelect} ${hasError ? styles.inputError : ''} ${open ? styles.customSelectOpen : ''}`}
      role="combobox"
      aria-expanded={open}
    >
      <div
        className={styles.customSelectTrigger}
        onClick={() => setOpen(prev => !prev)}
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(prev => !prev); } }}
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
        <div className={styles.selectDropdown} role="listbox">
          {placeholder && (
            <div
              className={`${styles.selectOption} ${!value ? styles.selectOptionActive : ''}`}
              onClick={() => handleSelect('')}
              role="option"
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
