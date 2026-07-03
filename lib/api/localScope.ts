import {
  getStoredAdminWorkplace,
  shouldScopeAdminToLocal,
} from '@/lib/auth/adminSession';

export function getAdminLocalScope() {
  if (!shouldScopeAdminToLocal()) return null;
  return getStoredAdminWorkplace();
}

export function withNombreLocalScope<T extends { local?: string }>(params: T): T {
  const workplace = getAdminLocalScope();
  if (!workplace) return params;

  return {
    ...params,
    local: workplace.nombre_local,
  };
}

export function withLocalIdScope<T extends { local_id?: number; local?: string; local_nombre?: string }>(params: T): T {
  const workplace = getAdminLocalScope();
  if (!workplace) return params;

  return {
    ...params,
    local: params.local !== undefined ? workplace.nombre_local : params.local,
    local_nombre: params.local_nombre !== undefined ? workplace.nombre_local : params.local_nombre,
    local_id: workplace.local_id,
  };
}
