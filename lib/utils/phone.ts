import {
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js/min';

export const DEFAULT_PHONE_COUNTRY: CountryCode = 'BO';

export interface PhoneValue {
  country: CountryCode;
  /** Valor legible y compatible con el campo histórico `numero_telefono`. */
  nationalNumber: string;
  /** E.164 únicamente si el número es válido. */
  e164: string | undefined;
}

const digitsOnly = (value: string) => value.replace(/\D/g, '');

export function phoneValueFrom(
  value: string | null | undefined,
  country: CountryCode = DEFAULT_PHONE_COUNTRY,
): PhoneValue {
  const raw = value?.trim() ?? '';
  const parsed = raw ? parsePhoneNumberFromString(raw, country) : undefined;
  const resolvedCountry = parsed?.country ?? country;
  const nationalNumber = parsed?.nationalNumber ?? digitsOnly(raw);
  return {
    country: resolvedCountry,
    // No reformatear el campo controlado mientras se escribe: en Bolivia los
    // números que empiezan con 4 se agrupan como fijos y React puede reinyectar
    // ese formato durante cada pulsación. El input conserva sólo sus dígitos.
    nationalNumber,
    e164: parsed?.isValid() ? parsed.number : undefined,
  };
}

/** Construye un valor de formulario a partir de texto nacional o E.164 pegado. */
export function parsePhoneInput(raw: string, country: CountryCode): PhoneValue {
  const trimmed = raw.trim();
  const parsed = trimmed
    ? parsePhoneNumberFromString(trimmed, country)
    : undefined;
  const resolvedCountry = parsed?.country ?? country;
  const nationalDigits = parsed?.nationalNumber ?? digitsOnly(trimmed);
  return {
    country: resolvedCountry,
    nationalNumber: nationalDigits,
    e164: parsed?.isValid() ? parsed.number : undefined,
  };
}

/** Convierte un número usable a E.164. Un legacy sin prefijo se asume BO sólo aquí. */
export function resolvePhoneE164(
  telefonoE164?: string | null,
  numeroTelefono?: string | null,
): string | undefined {
  if (telefonoE164) {
    const parsed = parsePhoneNumberFromString(telefonoE164);
    if (parsed?.isValid()) return parsed.number;
  }
  if (numeroTelefono) return phoneValueFrom(numeroTelefono).e164;
  return undefined;
}

export function formatPhoneForDisplay(
  telefonoE164?: string | null,
  numeroTelefono?: string | null,
): string {
  const resolved = resolvePhoneE164(telefonoE164, numeroTelefono);
  if (resolved) return parsePhoneNumberFromString(resolved)?.formatInternational() ?? resolved;
  return numeroTelefono?.trim() ?? '';
}

export function countryOptionLabel(country: CountryCode): string {
  const name = new Intl.DisplayNames(['es'], { type: 'region' }).of(country) ?? country;
  return `${name} (+${getCountryCallingCode(country)})`;
}
