export interface AdminUserSession {
  username?: string;
  rol_codigo?: string;
  local_id?: number | string | null;
  nombre_local?: string | null;
  lugar_id?: number | string | null;
  nombre_lugar?: string | null;
}

export interface AdminWorkplace {
  local_id: number;
  nombre_local: string;
}

const ADMIN_LOGIN_PATH = '/atrevida-gestion/login';
const ADMIN_BASE_PATH = '/atrevida-gestion';

export interface AdminTokenClaims extends AdminUserSession {
  sub?: string;
  iat?: number;
  exp?: number;
}

export function getStoredAdminToken(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    return window.localStorage.getItem('adminToken');
  } catch {
    return null;
  }
}

export function getStoredAdminUser(): AdminUserSession | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem('adminUser');
    if (!raw) return null;
    return JSON.parse(raw) as AdminUserSession;
  } catch {
    return null;
  }
}

export function getStoredAdminTokenClaims(): AdminTokenClaims | null {
  if (typeof window === 'undefined') return null;
  try {
    const token = getStoredAdminToken();
    const payload = token?.split('.')[1];
    if (!payload) return null;

    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = window.atob(normalizedPayload.padEnd(Math.ceil(normalizedPayload.length / 4) * 4, '='));
    return JSON.parse(decoded) as AdminTokenClaims;
  } catch {
    return null;
  }
}

function getRoleFromToken(): string | null {
  return getStoredAdminTokenClaims()?.rol_codigo ?? null;
}

function normalizeLocalId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function normalizeOptionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function getStoredAdminRole(): string | null {
  if (typeof window === 'undefined') return null;

  if (!hasActiveAdminSession()) return null;

  return getStoredAdminUser()?.rol_codigo
    ?? window.localStorage.getItem('adminRole')
    ?? getRoleFromToken();
}

export function canViewAdminPayments(): boolean {
  const role = getStoredAdminRole();
  return role === 'admin_sys' || role === 'admin';
}

export function isAdminSys(): boolean {
  const role = getStoredAdminRole();
  return role === 'admin_sys';
}

export function getStoredAdminWorkplace(): AdminWorkplace | null {
  if (typeof window === 'undefined') return null;
  if (!hasActiveAdminSession()) return null;

  const storedUser = getStoredAdminUser();
  const tokenClaims = getStoredAdminTokenClaims();
  const localId = normalizeLocalId(
    storedUser?.local_id
    ?? storedUser?.lugar_id
    ?? tokenClaims?.local_id
    ?? tokenClaims?.lugar_id,
  );
  const nombreLocal = normalizeOptionalString(
    storedUser?.nombre_local
    ?? storedUser?.nombre_lugar
    ?? tokenClaims?.nombre_local
    ?? tokenClaims?.nombre_lugar,
  );

  if (localId === null || !nombreLocal) return null;
  return { local_id: localId, nombre_local: nombreLocal };
}

export function shouldScopeAdminToLocal(): boolean {
  return isAdminProtectedRoute() && !isAdminSys() && getStoredAdminWorkplace() !== null;
}

export function clearStoredAdminSession(): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.removeItem('adminToken');
    window.localStorage.removeItem('adminUser');
    window.localStorage.removeItem('adminRole');
  } catch {
    // Ignore storage errors; the redirect is still the important recovery path.
  }
}

export const clearAdminSession = clearStoredAdminSession;

export function isStoredAdminTokenExpired(bufferSeconds = 0): boolean {
  const claims = getStoredAdminTokenClaims();
  if (!claims?.exp) return false;

  return claims.exp <= Math.floor(Date.now() / 1000) + bufferSeconds;
}

export function hasActiveAdminSession(bufferSeconds = 0): boolean {
  const token = getStoredAdminToken();
  return Boolean(token) && !isStoredAdminTokenExpired(bufferSeconds);
}

export function getActiveAdminToken(bufferSeconds = 0): string | null {
  const token = getStoredAdminToken();
  if (!token || isStoredAdminTokenExpired(bufferSeconds)) return null;
  return token;
}

export function clearExpiredAdminSession(bufferSeconds = 0): boolean {
  if (!getStoredAdminToken() || !isStoredAdminTokenExpired(bufferSeconds)) return false;
  clearStoredAdminSession();
  return true;
}

export function isAdminProtectedRoute(): boolean {
  if (typeof window === 'undefined') return false;

  const { pathname } = window.location;
  return pathname !== ADMIN_LOGIN_PATH
    && (pathname === ADMIN_BASE_PATH || pathname.startsWith(`${ADMIN_BASE_PATH}/`));
}

export function getAdminTokenForCurrentRoute(bufferSeconds = 0): string | null {
  if (isAdminProtectedRoute()) return requireActiveAdminSession(bufferSeconds);

  if (clearExpiredAdminSession(bufferSeconds)) return null;
  return getActiveAdminToken(bufferSeconds);
}

export function requireActiveAdminSession(bufferSeconds = 0): string | null {
  const token = getStoredAdminToken();
  if (!token || isStoredAdminTokenExpired(bufferSeconds)) {
    expireAdminSessionAndRedirect();
    return null;
  }

  return token;
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function getResponseMessage(data: unknown): string {
  if (!data || typeof data !== 'object') return '';

  const response = data as {
    message?: unknown;
    mensaje?: unknown;
    error?: unknown;
  };

  return [response.message, response.mensaje, response.error]
    .filter((value): value is string => typeof value === 'string')
    .join(' ');
}

export function shouldRedirectToAdminLogin(status: number, data?: unknown): boolean {
  if (status === 401) return true;
  if (status < 400) return false;

  const message = normalizeText(getResponseMessage(data));
  return message.includes('token')
    && (
      message.includes('expir')
      || message.includes('vencid')
      || message.includes('caduc')
      || message.includes('invalid')
      || message.includes('invalido')
    );
}

let redirectingToLogin = false;

export function isRedirectingToAdminLogin(): boolean {
  return redirectingToLogin;
}

export function waitForAdminLoginRedirect<T = never>(): Promise<T> {
  return new Promise<T>(() => {});
}

export function expireAdminSessionAndRedirect(): void {
  if (typeof window === 'undefined') return;

  clearStoredAdminSession();

  if (redirectingToLogin || !isAdminProtectedRoute()) return;

  redirectingToLogin = true;
  window.location.replace(ADMIN_LOGIN_PATH);
}

export const redirectToAdminLogin = expireAdminSessionAndRedirect;

export function canViewFinancialReports(): boolean {
  return getStoredAdminRole() === 'admin_sys';
}
