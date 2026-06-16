export interface AdminUserSession {
  username?: string;
  rol_codigo?: string;
}

export interface AdminTokenClaims extends AdminUserSession {
  sub?: string;
  iat?: number;
  exp?: number;
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
    const token = window.localStorage.getItem('adminToken');
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

export function getStoredAdminRole(): string | null {
  if (typeof window === 'undefined') return null;
  return getStoredAdminUser()?.rol_codigo
    ?? window.localStorage.getItem('adminRole')
    ?? getRoleFromToken();
}

export function clearStoredAdminSession() {
  if (typeof window === 'undefined') return;

  window.localStorage.removeItem('adminToken');
  window.localStorage.removeItem('adminUser');
  window.localStorage.removeItem('adminRole');
}

export function isStoredAdminTokenExpired(bufferSeconds = 0): boolean {
  const claims = getStoredAdminTokenClaims();
  if (!claims?.exp) return false;

  return claims.exp <= Math.floor(Date.now() / 1000) + bufferSeconds;
}

let redirectingToLogin = false;

export function expireAdminSessionAndRedirect() {
  if (typeof window === 'undefined') return;

  clearStoredAdminSession();

  if (redirectingToLogin || window.location.pathname === '/atrevida-gestion/login') return;

  redirectingToLogin = true;
  window.location.replace('/atrevida-gestion/login');
}

export function canViewAdminPayments(): boolean {
  const role = getStoredAdminRole();
  return role === 'admin_sys' || role === 'admin';
}

export function canViewFinancialReports(): boolean {
  return getStoredAdminRole() === 'admin_sys';
}
