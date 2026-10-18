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

export default function InventarioPage() {
  const [tab, setTab] = useState<TabKey>('items');
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
      {tab === 'items' && <ItemsTab canManage={isAdminSys} canAdjust moneda={moneda} />}
      {tab === 'movimientos' && <MovimientosTab />}
      {tab === 'compras' && <ComprasTab canAnular={isAdminSys} moneda={moneda} />}
      {tab === 'alertas' && <AlertasTab />}
    </AdminPageShell>
  );
}
