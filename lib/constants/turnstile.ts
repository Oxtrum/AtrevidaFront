/**
 * Desactiva Cloudflare Turnstile solo en desarrollo local.
 * Requiere NEXT_PUBLIC_TURNSTILE_DISABLED=true y NODE_ENV distinto de "production",
 * así que un build de producción siempre mantiene la verificación activa.
 */
export const TURNSTILE_DISABLED =
  process.env.NODE_ENV !== 'production' &&
  process.env.NEXT_PUBLIC_TURNSTILE_DISABLED === 'true';

/** Token ficticio que el formulario envía al proxy cuando Turnstile está desactivado. */
export const TURNSTILE_DEV_TOKEN = 'turnstile-disabled-local';
