'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as Flags from 'country-flag-icons/react/3x2';
import { ChevronDown, Search } from 'lucide-react';
import { getCountries, getCountryCallingCode, type CountryCode } from 'libphonenumber-js/min';
import {
  DEFAULT_PHONE_COUNTRY,
  countryOptionLabel,
  parsePhoneInput,
  phoneValueFrom,
  type PhoneValue,
} from '@/lib/utils/phone';
import styles from './PhoneInput.module.css';

interface PhoneInputProps {
  value?: string | null;
  /** Si existe, gana sobre el valor histórico. */
  e164?: string | null;
  onChange: (value: PhoneValue) => void;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
  'aria-describedby'?: string;
}

function CountryFlag({ country }: { country: CountryCode }) {
  const Flag = Flags[country as keyof typeof Flags];
  return Flag
    ? <Flag className={styles.flag} aria-hidden="true" />
    : <span className={styles.flagFallback} aria-hidden="true">{country}</span>;
}

/** Selector internacional con menú propio y banderas SVG empaquetadas. */
export function PhoneInput({
  value,
  e164,
  onChange,
  id,
  placeholder = 'Número de teléfono',
  disabled = false,
  invalid = false,
  className,
  'aria-describedby': ariaDescribedBy,
}: PhoneInputProps) {
  const initial = phoneValueFrom(e164 || value);
  const [country, setCountry] = useState<CountryCode>(initial.country);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const resolved = phoneValueFrom(e164 || value, country);
  const selectedCountry = e164 ? resolved.country : country;
  const displayed = resolved.nationalNumber;
  const countries = useMemo(
    () => [...getCountries()].sort((a, b) => countryOptionLabel(a).localeCompare(countryOptionLabel(b), 'es')),
    [],
  );
  const visibleCountries = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('es');
    if (!normalizedQuery) return countries;
    return countries.filter((item) => {
      const searchable = `${countryOptionLabel(item)} +${getCountryCallingCode(item)} ${item}`.toLocaleLowerCase('es');
      return searchable.includes(normalizedQuery);
    });
  }, [countries, query]);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const selectCountry = (nextCountry: CountryCode) => {
    setCountry(nextCountry);
    onChange(parsePhoneInput(displayed, nextCountry));
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={rootRef} className={`${styles.root}${className ? ` ${className}` : ''}`}>
      <button
        type="button"
        className={`${styles.country}${open ? ` ${styles.countryOpen}` : ''}`}
        aria-label="País y prefijo telefónico"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => !disabled && setOpen((current) => !current)}
        disabled={disabled}
      >
        <CountryFlag country={selectedCountry} />
        <span className={styles.countryCode}>+{getCountryCallingCode(selectedCountry)}</span>
        <ChevronDown className={styles.chevron} size={16} aria-hidden="true" />
      </button>

      {open && (
        <div className={styles.menu} role="listbox" aria-label="Seleccionar país y prefijo">
          <label className={styles.search}>
            <Search size={15} aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar país o prefijo"
              aria-label="Buscar país o prefijo"
              autoFocus
            />
          </label>
          <div className={styles.options}>
            {visibleCountries.map((item) => (
              <button
                key={item}
                type="button"
                className={`${styles.option}${item === selectedCountry ? ` ${styles.optionActive}` : ''}`}
                role="option"
                aria-selected={item === selectedCountry}
                onClick={() => selectCountry(item)}
              >
                <CountryFlag country={item} />
                <span className={styles.optionLabel}>{countryOptionLabel(item)}</span>
              </button>
            ))}
            {visibleCountries.length === 0 && <p className={styles.empty}>No se encontró un país.</p>}
          </div>
        </div>
      )}

      <input
        id={id}
        className={`${styles.number}${invalid ? ` ${styles.invalid}` : ''}`}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        value={displayed}
        onChange={(event) => {
          const next = parsePhoneInput(event.target.value, selectedCountry);
          if (next.country !== selectedCountry) setCountry(next.country);
          onChange(next);
        }}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        aria-describedby={ariaDescribedBy}
      />
    </div>
  );
}

export { DEFAULT_PHONE_COUNTRY };
