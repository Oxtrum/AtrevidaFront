'use client';

import { useState } from 'react';
import { Pencil, Plus, Power, PowerOff } from 'lucide-react';
import { toast } from '@/components/Shared/Toast';
import { CustomSelect } from '@/components/Custom/CustomSelectAdmin';
import { ConfirmDialog } from './ConfirmDialog';
import { DataTable } from './DataTable';
import type { Column } from './DataTable';
import { FormField, FormSubmitError } from './FormField';
import { FormModal } from './FormModal';
import { RowActionsMenu } from './RowActionsMenu';
import { StatusBadge } from './StatusBadge';
import { AdminButton } from './AdminButton';

export type CatalogNaturaleza = 'INGRESO' | 'EGRESO' | 'AMBOS';

export interface CatalogRow {
  id: number;
  nombre: string;
  activo: boolean;
  naturaleza?: CatalogNaturaleza;
}

export interface CatalogValues {
  nombre: string;
  activo: boolean;
  naturaleza?: CatalogNaturaleza;
}

interface CatalogManagerProps {
  /** "categoría", "categoría de inventario"… (singular, minúscula). */
  noun: string;
  rows: CatalogRow[];
  loading: boolean;
  error: string | null;
  onReload: () => void;
  onSave: (values: CatalogValues, id?: number) => Promise<void>;
  /** Pide también la naturaleza (ingreso, egreso o ambos). */
  withNaturaleza?: boolean;
  placeholder?: string;
}

type Row = CatalogRow & Record<string, unknown>;

/** CRUD mínimo de catálogos nombre + activo (categorías de inventario y financieras). */
export function CatalogManager({ noun, rows, loading, error, onReload, onSave, withNaturaleza, placeholder }: CatalogManagerProps) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogRow | null>(null);
  const [nombre, setNombre] = useState('');
  const [toggling, setToggling] = useState<CatalogRow | null>(null);
  const [toggleBusy, setToggleBusy] = useState(false);
  const [naturaleza, setNaturaleza] = useState<CatalogNaturaleza>('EGRESO');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const openForm = (row: CatalogRow | null) => {
    setEditing(row);
    setNombre(row?.nombre ?? '');
    setNaturaleza(row?.naturaleza ?? 'EGRESO');
    setFormError('');
    setOpen(true);
  };

  const submit = async () => {
    if (!nombre.trim()) {
      setFormError('El nombre es obligatorio');
      return;
    }
    if (rows.some((r) => r.id !== editing?.id && r.nombre.trim().toLowerCase() === nombre.trim().toLowerCase())) {
      setFormError(`Ya existe una ${noun} con ese nombre`);
      return;
    }
    setSaving(true);
    try {
      await onSave({ nombre: nombre.trim(), activo: editing?.activo ?? true, ...(withNaturaleza && { naturaleza }) }, editing?.id);
      toast.success(editing ? 'Cambios guardados' : 'Creado correctamente');
      setOpen(false);
      onReload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const applyToggle = async (row: CatalogRow) => {
    setToggleBusy(true);
    try {
      await onSave({ nombre: row.nombre, activo: !row.activo, ...(withNaturaleza && { naturaleza: row.naturaleza }) }, row.id);
      toast.success(row.activo ? 'Desactivada' : 'Activada');
      setToggling(null);
      onReload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo cambiar el estado');
    } finally {
      setToggleBusy(false);
    }
  };

  const columns: Column<Row>[] = [
    { key: 'nombre', label: 'Nombre' },
    ...(withNaturaleza
      ? [{ key: 'naturaleza', label: 'Tipo', render: (v: unknown) => <StatusBadge tone={v === 'INGRESO' ? 'success' : v === 'AMBOS' ? 'neutral' : 'info'}>{v === 'INGRESO' ? 'Ingreso' : v === 'AMBOS' ? 'Ambos' : 'Egreso'}</StatusBadge> } as Column<Row>]
      : []),
    { key: 'activo', label: 'Estado', searchable: false, render: (v) => <StatusBadge tone={v ? 'success' : 'neutral'}>{v ? 'Activa' : 'Inactiva'}</StatusBadge> },
    {
      key: 'acciones',
      label: '',
      searchable: false,
      render: (_v, row) => (
        <RowActionsMenu
          actions={[
            { label: 'Editar', icon: <Pencil size={12} strokeWidth={2} />, onClick: () => openForm(row) },
            row.activo
              ? { label: 'Desactivar', icon: <PowerOff size={12} strokeWidth={2} />, variant: 'danger', onClick: () => setToggling(row) }
              : { label: 'Activar', icon: <Power size={12} strokeWidth={2} />, onClick: () => void applyToggle(row) },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <AdminButton variant="primary" onClick={() => openForm(null)}>
          <Plus size={18} strokeWidth={2} />
          Nueva {noun}
        </AdminButton>
      </div>

      <DataTable<Row>
        columns={columns}
        data={rows as Row[]}
        loading={loading}
        error={error}
        onRefresh={onReload}
        getRowKey={(r) => r.id}
        searchPlaceholder="Buscar por nombre…"
        emptyMessage={`Aún no hay ${noun}s`}
      />

      <FormModal isOpen={open} onClose={() => setOpen(false)} title={editing ? `Editar ${noun}` : `Nueva ${noun}`} onSubmit={submit} loading={saving} submitLabel={editing ? 'Guardar' : 'Crear'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <FormField label="Nombre" htmlFor="catalog-nombre" required>
            <input id="catalog-nombre" type="text" value={nombre} onChange={(e) => { setNombre(e.target.value); setFormError(''); }} placeholder={placeholder} autoFocus />
          </FormField>
          {withNaturaleza && (
            <FormField label="Tipo" labelId="catalog-nat-lbl" hint="Ambos: la categoría se podrá usar en ingresos y en egresos.">
              <CustomSelect
                value={naturaleza}
                onChange={(v) => setNaturaleza(v as CatalogNaturaleza)}
                options={[{ value: 'EGRESO', label: 'Egreso' }, { value: 'INGRESO', label: 'Ingreso' }, { value: 'AMBOS', label: 'Ambos (ingreso y egreso)' }]}
                searchable={false}
                ariaLabelledBy="catalog-nat-lbl"
              />
            </FormField>
          )}
        </div>
        <FormSubmitError message={formError} />
      </FormModal>

      <ConfirmDialog
        isOpen={!!toggling}
        title={`Desactivar ${noun}`}
        message={<>“{toggling?.nombre}” dejará de aparecer al crear registros nuevos. Los registros existentes no cambian y puedes volver a activarla cuando quieras.</>}
        confirmLabel="Desactivar"
        danger
        loading={toggleBusy}
        onConfirm={() => toggling && void applyToggle(toggling)}
        onClose={() => setToggling(null)}
      />
    </>
  );
}
