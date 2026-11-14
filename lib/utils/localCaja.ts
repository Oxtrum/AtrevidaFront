import { getStoredAdminWorkplace } from '@/lib/auth/adminSession';

/** Clave donde la caja recuerda el último local abierto. */
export const CAJA_LOCAL_STORAGE_KEY = 'atrevidaCajaLocal';

/**
 * Local con el que arrancan los formularios que piden uno: el del usuario si está limitado a un local, si no el último
 * que abrió la caja, y si solo existe uno, ese. Vacío si no hay manera de saberlo.
 */
export function idLocalInicial(locales: { id: number }[]): string {
  const propio = getStoredAdminWorkplace()?.local_id;
  if (propio) return String(propio);
  try {
    const guardado = JSON.parse(localStorage.getItem(CAJA_LOCAL_STORAGE_KEY) ?? 'null') as { id?: number } | null;
    if (guardado?.id && locales.some((l) => l.id === guardado.id)) return String(guardado.id);
  } catch {
    /* el valor guardado no se puede leer: se ignora */
  }
  return locales.length === 1 ? String(locales[0].id) : '';
}
