'use client';

import { useState } from 'react';
import { CalendarClock, Pencil, Plus, Power } from 'lucide-react';
import { AdminButton, AdminPageShell, ConfirmDialog, DataTable, PageHeader, RowActionsMenu, StatusBadge } from '@/components/AdminConfig';
import type { Column } from '@/components/AdminConfig';
import { GastoFijoFormModal } from '@/components/AdminFinanzas/GastoFijoFormModal';
import { toast } from '@/components/Shared/Toast';
import { desactivarGastoFijo, getCategoriasFinancieras, getGastosFijos } from '@/lib/api/finanzas';
import { useAsyncData } from '@/lib/hooks/useAsyncData';
import { useConfiguracion } from '@/lib/hooks/useConfiguracion';
import { formatDateISO, formatMoney } from '@/lib/utils/format';
import type { CategoriaFinanciera, GastoFijo } from '@/types/finanzas';

type Row = GastoFijo & Record<string, unknown>;
const EMPTY: GastoFijo[] = [];
const EMPTY_CATS: CategoriaFinanciera[] = [];

export default function GastosFijosPage() {
  const { moneda } = useConfiguracion();
  const { data, loading, error, reload } = useAsyncData(getGastosFijos, 'gastos-fijos');
  const { data: cats } = useAsyncData(getCategoriasFinancieras, 'cats-fin');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<GastoFijo | null>(null);
  const [toDeactivate, setToDeactivate] = useState<GastoFijo | null>(null);
  const [busy, setBusy] = useState(false);

  const openForm = (g: GastoFijo | null) => {
    setEditing(g);
    setFormOpen(true);
  };

  const handleDeactivate = async () => {
    if (!toDeactivate) return;
    setBusy(true);
    try {
      await desactivarGastoFijo(toDeactivate.id);
      toast.success('Gasto fijo desactivado');
      setToDeactivate(null);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo desactivar');
    } finally {
      setBusy(false);
    }
  };

  const columns: Column<Row>[] = [
    { key: 'nombre', label: 'Gasto' },
    { key: 'categoria_nombre', label: 'Categoría' },
    { key: 'local_nombre', label: 'Local', render: (v) => (v as string) || 'General' },
    { key: 'monto', label: 'Monto', searchable: false, render: (v) => <strong>{formatMoney(v as number, moneda)}</strong> },
    { key: 'dia_cobro', label: 'Día de cobro', searchable: false, render: (v) => `Día ${v}` },
    { key: 'proximo_cobro', label: 'Próximo cobro', searchable: false, render: (v) => formatDateISO(v as string | null) },
    { key: 'fecha_fin', label: 'Vigencia', searchable: false, render: (_v, r) => `${formatDateISO(r.fecha_inicio)} → ${r.fecha_fin ? formatDateISO(r.fecha_fin) : 'sin fin'}` },
    { key: 'activo', label: 'Estado', searchable: false, render: (v) => <StatusBadge tone={v ? 'success' : 'neutral'}>{v ? 'Activo' : 'Inactivo'}</StatusBadge> },
    {
      key: 'acciones',
      label: '',
      searchable: false,
      render: (_v, row) => (
        <RowActionsMenu
          actions={[
            { label: 'Editar', icon: <Pencil size={12} strokeWidth={2} />, onClick: () => openForm(row) },
            ...(row.activo ? [{ label: 'Desactivar', icon: <Power size={12} strokeWidth={2} />, onClick: () => setToDeactivate(row), variant: 'danger' as const }] : []),
          ]}
        />
      ),
    },
  ];

  return (
    <AdminPageShell roles={['admin_sys']}>
      <PageHeader
        kicker="Configuración"
        kickerIcon={<CalendarClock size={14} strokeWidth={2} />}
        title="Gastos Fijos"
        accentWord="Fijos"
        subtitle="Alquiler, banco, sueldos y otros gastos que se generan solos cada mes"
        backHref="/atrevida-gestion/configuracion"
        actions={
          <AdminButton variant="primary" onClick={() => openForm(null)}>
            <Plus size={18} strokeWidth={2} />
            Nuevo gasto fijo
          </AdminButton>
        }
      />
      <DataTable<Row>
        columns={columns}
        data={(data ?? EMPTY) as Row[]}
        loading={loading}
        error={error}
        onRefresh={reload}
        getRowKey={(g) => g.id}
        searchPlaceholder="Buscar gasto o categoría…"
        emptyMessage="Aún no configuraste gastos fijos"
      />
      <GastoFijoFormModal isOpen={formOpen} gasto={editing} categorias={cats ?? EMPTY_CATS} onClose={() => setFormOpen(false)} onSaved={reload} />
      <ConfirmDialog
        isOpen={toDeactivate !== null}
        danger
        title="Desactivar gasto fijo"
        message={`¿Desactivar "${toDeactivate?.nombre}"? Dejará de generarse y se anularán sus egresos que sigan pendientes de pago. Los ya pagados se conservan.`}
        confirmLabel="Desactivar"
        loading={busy}
        onConfirm={handleDeactivate}
        onClose={() => setToDeactivate(null)}
      />
    </AdminPageShell>
  );
}
