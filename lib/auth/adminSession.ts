export interface AdminUserSession {
  username?: string;
  rol_codigo?: string;
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
