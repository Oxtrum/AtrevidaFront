'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  expireAdminSessionAndRedirect,
  getStoredAdminTokenClaims,
  requireActiveAdminSession,
} from '@/lib/auth/adminSession';

const LOGIN_PATH = '/atrevida-gestion/login';
// setTimeout admite como máximo un delay de 32 bits (~24.8 días).
const MAX_TIMEOUT = 2_147_483_647;

/**
 * Guarda global del panel admin: si el token está ausente o vencido redirige al
 * login, programa el cierre automático cuando la sesión expire estando abierta y
 * revalida al volver a la pestaña. Se monta una sola vez en el layout admin.
 */
export default function AdminSessionGuard() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === LOGIN_PATH) return;

    const token = requireActiveAdminSession();
    if (!token) {
      return;
    }

    const exp = getStoredAdminTokenClaims()?.exp;
    const msUntilExpiry = exp ? exp * 1000 - Date.now() : null;

    let timer: number | undefined;
    if (msUntilExpiry !== null && msUntilExpiry > 0 && msUntilExpiry <= MAX_TIMEOUT) {
      timer = window.setTimeout(expireAdminSessionAndRedirect, msUntilExpiry);
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') requireActiveAdminSession();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (timer) window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [pathname]);

  return null;
}
