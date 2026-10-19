'use client';

import { useState } from 'react';
import { AlertTriangle, ArrowLeftRight, Package, ShoppingCart } from 'lucide-react';
import { AdminPageShell, PageHeader, Tabs } from '@/components/AdminConfig';
import type { TabItem } from '@/components/AdminConfig';
import { AlertasTab } from '@/components/AdminInventario/AlertasTab';
import { ComprasTab } from '@/components/AdminInventario/ComprasTab';
import { ItemsTab } from '@/components/AdminInventario/ItemsTab';
import { MovimientosTab } from '@/components/AdminInventario/MovimientosTab';
import { getAlertasInventario } from '@/lib/api/inventario';
import { getStoredAdminRole } from '@/lib/auth/adminSession';
import { useAsyncData } from '@/lib/hooks/useAsyncData';
import { useConfiguracion } from '@/lib/hooks/useConfiguracion';

type TabKey = 'items' | 'movimientos' | 'compras' | 'alertas';

// Gerencia opera su local (ajustes, compras); crear/editar ítems y anular compras es de admin_sys (§7).
const ROLES = ['admin_sys', 'gerencia'];

const TAB_KEYS: TabKey[] = ['items', 'movimientos', 'compras', 'alertas'];

/** Enlaces directos (p. ej. desde las notificaciones): ?tab=items&q=Gel&local_id=2. */
function readDeepLink() {
  if (typeof window === 'undefined') return { tab: 'items' as TabKey, q: '', localId: '' };
  const params = new URLSearchParams(window.location.search);
  const tab = params.get('tab') as TabKey | null;
  return {
    tab: tab && TAB_KEYS.includes(tab) ? tab : ('items' as TabKey),
    q: params.get('q') ?? '',
    localId: params.get('local_id') ?? '',
  };
}

export default function InventarioPage() {
  const [link] = useState(readDeepLink);
  const [tab, setTab] = useState<TabKey>(link.tab);
  const { moneda } = useConfiguracion();
  const { data: alertas } = useAsyncData(getAlertasInventario, 'alertas-count');
  // Rol leído en render: la página solo se monta tras el guard de AdminPageShell.
  const isAdminSys = typeof window !== 'undefined' && getStoredAdminRole() === 'admin_sys';

  const tabs: TabItem<TabKey>[] = [
    { key: 'items', label: 'Ítems', icon: <Package size={15} /> },
    { key: 'movimientos', label: 'Movimientos', icon: <ArrowLeftRight size={15} /> },
    { key: 'compras', label: 'Compras', icon: <ShoppingCart size={15} /> },
    {
      key: 'alertas',
      label: 'Alertas',
      icon: <AlertTriangle size={15} />,
      count: (alertas?.items_bajo_stock.length ?? 0) + (alertas?.reservas_con_alerta.length ?? 0),
    },
  ];

  return (
    <AdminPageShell roles={ROLES}>
      <PageHeader
        kicker="Trastienda"
        kickerIcon={<Package size={14} strokeWidth={2} />}
        title="Inventario"
        accentWord="Inventario"
        subtitle="Productos e insumos por local, movimientos de stock y compras"
      />
      <Tabs tabs={tabs} active={tab} onChange={setTab} ariaLabel="Secciones de inventario" />
      {tab === 'items' && <ItemsTab canManage={isAdminSys} canAdjust moneda={moneda} initialQ={link.q} initialLocalId={link.localId} />}
      {tab === 'movimientos' && <MovimientosTab />}
      {tab === 'compras' && <ComprasTab canAnular={isAdminSys} moneda={moneda} />}
      {tab === 'alertas' && <AlertasTab />}
    </AdminPageShell>
  );
}
