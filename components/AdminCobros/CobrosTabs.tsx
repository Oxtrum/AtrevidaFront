'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Banknote, CreditCard } from 'lucide-react';
import { Tabs } from '@/components/AdminConfig';
import type { TabItem } from '@/components/AdminConfig';
import { canViewAdminPayments } from '@/lib/auth/adminSession';
import { useMontado } from '@/lib/hooks/useMontado';

type Vista = 'caja' | 'pagos';

const RUTAS: Record<Vista, string> = {
  caja: '/atrevida-gestion/caja',
  pagos: '/atrevida-gestion/pagos',
};

/**
 * Pestañas de Cobros: registrar una venta (caja) e historial de pagos ya cobrados. Cada una sigue siendo su propia
 * ruta; las pestañas solo navegan entre ellas. El historial es solo para administradores.
 */
export function CobrosTabs() {
  const router = useRouter();
  const pathname = usePathname();
  // El rol vive en el navegador: hasta montar no se sabe, y el servidor no debe pintar la pestaña.
  const montado = useMontado();
  if (!montado || !canViewAdminPayments()) return null;

  const tabs: TabItem<Vista>[] = [
    { key: 'caja', label: 'Cobrar', icon: <Banknote size={14} strokeWidth={2} /> },
    { key: 'pagos', label: 'Historial de pagos', icon: <CreditCard size={14} strokeWidth={2} /> },
  ];

  return (
    <Tabs
      tabs={tabs}
      active={pathname.startsWith(RUTAS.pagos) ? 'pagos' : 'caja'}
      onChange={(vista) => router.push(RUTAS[vista])}
      ariaLabel="Secciones de Cobros"
    />
  );
}
