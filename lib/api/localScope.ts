import {
  getStoredAdminWorkplace,
  shouldScopeAdminToLocal,
} from '@/lib/auth/adminSession';

export function getAdminLocalScope() {
  if (!shouldScopeAdminToLocal()) return null;
  return getStoredAdminWorkplace();
}

export function withNombreLocalScope<T extends { local?: string }>(params: T): T {
  if (params.local) return params;

  const workplace = getAdminLocalScope();
  if (!workplace) return params;

  return {
    ...params,
    local: workplace.nombre_local,
  };
}

export function withLocalIdScope<T extends { local_id?: number }>(params: T): T {
  if (params.local_id !== undefined) return params;

  const workplace = getAdminLocalScope();
  if (!workplace) return params;

  return {
    ...params,
    local_id: workplace.local_id,
  };
}
