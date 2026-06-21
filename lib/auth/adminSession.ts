export interface AdminUserSession {
  username?: string;
  rol_codigo?: string;
}

const ADMIN_LOGIN_PATH = '/atrevida-gestion/login';

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

function getRoleFromToken(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    const token = window.localStorage.getItem('adminToken');
    const payload = token?.split('.')[1];
    if (!payload) return null;

    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = window.atob(normalizedPayload.padEnd(Math.ceil(normalizedPayload.length / 4) * 4, '='));
    const claims = JSON.parse(decoded) as { rol_codigo?: string };
    return claims.rol_codigo ?? null;
  } catch {
    return null;
  }
}

export function getStoredAdminRole(): string | null {
  if (typeof window === 'undefined') return null;
  return getStoredAdminUser()?.rol_codigo
    ?? window.localStorage.getItem('adminRole')
    ?? getRoleFromToken();
}

export function canViewAdminPayments(): boolean {
  const role = getStoredAdminRole();
  return role === 'admin_sys' || role === 'admin';
}

export function clearAdminSession(): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.removeItem('adminToken');
    window.localStorage.removeItem('adminUser');
    window.localStorage.removeItem('adminRole');
  } catch {
    // Ignore storage errors; the redirect is still the important recovery path.
  }
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

export function redirectToAdminLogin(): void {
  if (typeof window === 'undefined') return;

  clearAdminSession();

  if (window.location.pathname === ADMIN_LOGIN_PATH) return;
  window.location.assign(ADMIN_LOGIN_PATH);
}
