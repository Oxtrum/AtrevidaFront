'use client';

import { Wallet } from 'lucide-react';
import { AdminPageShell, CatalogManager, PageHeader } from '@/components/AdminConfig';
import { getCategoriasFinancieras, guardarCategoriaFinanciera } from '@/lib/api/finanzas';
import { useAsyncData } from '@/lib/hooks/useAsyncData';
import type { CategoriaFinanciera } from '@/types/finanzas';

const EMPTY: CategoriaFinanciera[] = [];

export default function CategoriasFinancierasPage() {
  const { data, loading, error, reload } = useAsyncData(getCategoriasFinancieras, 'cats-fin');

  return (
    <AdminPageShell roles={['admin_sys']}>
      <PageHeader
        kicker="Configuración"
        kickerIcon={<Wallet size={14} strokeWidth={2} />}
        title="Categorías Financieras"
        accentWord="Categorías"
        subtitle="Clasifican egresos y otros ingresos en los reportes"
        backHref="/atrevida-gestion/configuracion"
      />
      <CatalogManager
        noun="categoría"
        rows={data ?? EMPTY}
        loading={loading}
        error={error}
        onReload={reload}
        withNaturaleza
        placeholder="Ej: Alquiler"
        onSave={(v, id) => guardarCategoriaFinanciera({ nombre: v.nombre, activo: v.activo, naturaleza: v.naturaleza ?? 'EGRESO' }, id)}
      />
    </AdminPageShell>
  );
}
