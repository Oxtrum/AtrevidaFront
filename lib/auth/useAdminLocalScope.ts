'use client';

import { useMemo, useSyncExternalStore } from 'react';
import {
  getStoredAdminWorkplace,
  shouldScopeAdminToLocal,
  type AdminWorkplace,
} from '@/lib/auth/adminSession';

const EMPTY_SCOPE = '';
const PENDING_SCOPE = '__pending_admin_local_scope__';
const ADMIN_SESSION_EVENT = 'admin-session-changed';

function getLocalScopeSnapshot(): string {
  const workplace = shouldScopeAdminToLocal() ? getStoredAdminWorkplace() : null;
  return workplace ? JSON.stringify(workplace) : EMPTY_SCOPE;
}

function getServerLocalScopeSnapshot(): string {
  return PENDING_SCOPE;
}

function subscribeToAdminSession(onStoreChange: () => void) {
  if (typeof window === 'undefined') return () => {};

  window.addEventListener('storage', onStoreChange);
  window.addEventListener(ADMIN_SESSION_EVENT, onStoreChange);

  return () => {
    window.removeEventListener('storage', onStoreChange);
    window.removeEventListener(ADMIN_SESSION_EVENT, onStoreChange);
  };
}

export function notifyAdminSessionChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(ADMIN_SESSION_EVENT));
}

export function useAdminLocalScope(): AdminWorkplace | null {
  const snapshot = useSyncExternalStore(
    subscribeToAdminSession,
    getLocalScopeSnapshot,
    getServerLocalScopeSnapshot,
  );

  return useMemo(() => {
    if (!snapshot) return null;

    try {
      return JSON.parse(snapshot) as AdminWorkplace;
    } catch {
      return null;
    }
  }, [snapshot]);
}

export function useAdminLocalScopeState() {
  const snapshot = useSyncExternalStore(
    subscribeToAdminSession,
    getLocalScopeSnapshot,
    getServerLocalScopeSnapshot,
  );

  return useMemo(() => {
    if (snapshot === PENDING_SCOPE) {
      return { ready: false, workplace: null };
    }

    if (!snapshot) {
      return { ready: true, workplace: null };
    }

    try {
      return { ready: true, workplace: JSON.parse(snapshot) as AdminWorkplace };
    } catch {
      return { ready: true, workplace: null };
    }
  }, [snapshot]);
}
