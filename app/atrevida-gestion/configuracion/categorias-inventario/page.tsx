'use client';

import { Boxes } from 'lucide-react';
import { AdminPageShell, CatalogManager, PageHeader } from '@/components/AdminConfig';
import { getCategoriasInventario, guardarCategoriaInventario } from '@/lib/api/inventario';
import { useAsyncData } from '@/lib/hooks/useAsyncData';
import type { CategoriaInventario } from '@/types/inventario';

const EMPTY: CategoriaInventario[] = [];

export default function CategoriasInventarioPage() {
  const { data, loading, error, reload } = useAsyncData(getCategoriasInventario, 'cats-inv');

  return (
    <AdminPageShell roles={['admin_sys']}>
      <PageHeader
        kicker="Configuración"
        kickerIcon={<Boxes size={14} strokeWidth={2} />}
        title="Categorías de Inventario"
        accentWord="Categorías"
        subtitle="Agrupan los productos e insumos de la trastienda"
        backHref="/atrevida-gestion/configuracion"
      />
      <CatalogManager
        noun="categoría"
        rows={data ?? EMPTY}
        loading={loading}
        error={error}
        onReload={reload}
        placeholder="Ej: Cremas y geles"
        onSave={(v, id) => guardarCategoriaInventario({ nombre: v.nombre, activo: v.activo }, id)}
      />
    </AdminPageShell>
  );
}
