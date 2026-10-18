'use client';

import { useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { toast } from '@/components/Shared/Toast';
import { CustomSelect } from '@/components/Custom/CustomSelectAdmin';
import { DataTable } from './DataTable';
import type { Column } from './DataTable';
import { FormField, FormSubmitError } from './FormField';
import { FormModal } from './FormModal';
import { RowActionsMenu } from './RowActionsMenu';
import { StatusBadge } from './StatusBadge';
import { AdminButton } from './AdminButton';

export interface CatalogRow {
  id: number;
  nombre: string;
  activo: boolean;
  naturaleza?: 'INGRESO' | 'EGRESO';
}

export interface CatalogValues {
  nombre: string;
  activo: boolean;
  naturaleza?: 'INGRESO' | 'EGRESO';
}

interface CatalogManagerProps {
  /** "categoría", "categoría de inventario"… (singular, minúscula). */
  noun: string;
  rows: CatalogRow[];
  loading: boolean;
  error: string | null;
  onReload: () => void;
  onSave: (values: CatalogValues, id?: number) => Promise<void>;
  /** Pide también la naturaleza (ingreso/egreso). Solo se elige al crear. */
  withNaturaleza?: boolean;
  placeholder?: string;
}

type Row = CatalogRow & Record<string, unknown>;

/** CRUD mínimo de catálogos nombre + activo (categorías de inventario y financieras). */
export function CatalogManager({ noun, rows, loading, error, onReload, onSave, withNaturaleza, placeholder }: CatalogManagerProps) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogRow | null>(null);
  const [nombre, setNombre] = useState('');
  const [activo, setActivo] = useState(true);
  const [naturaleza, setNaturaleza] = useState<'INGRESO' | 'EGRESO'>('EGRESO');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const openForm = (row: CatalogRow | null) => {
    setEditing(row);
    setNombre(row?.nombre ?? '');
    setActivo(row?.activo ?? true);
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
      await onSave({ nombre: nombre.trim(), activo, ...(withNaturaleza && { naturaleza }) }, editing?.id);
      toast.success(editing ? 'Cambios guardados' : 'Creado correctamente');
      setOpen(false);
      onReload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<Row>[] = [
    { key: 'nombre', label: 'Nombre' },
    ...(withNaturaleza
      ? [{ key: 'naturaleza', label: 'Tipo', render: (v: unknown) => <StatusBadge tone={v === 'INGRESO' ? 'success' : 'info'}>{v === 'INGRESO' ? 'Ingreso' : 'Egreso'}</StatusBadge> } as Column<Row>]
      : []),
    { key: 'activo', label: 'Estado', searchable: false, render: (v) => <StatusBadge tone={v ? 'success' : 'neutral'}>{v ? 'Activa' : 'Inactiva'}</StatusBadge> },
    {
      key: 'acciones',
      label: '',
      searchable: false,
      render: (_v, row) => <RowActionsMenu actions={[{ label: 'Editar', icon: <Pencil size={12} strokeWidth={2} />, onClick: () => openForm(row) }]} />,
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
            <FormField label="Tipo" labelId="catalog-nat-lbl" hint={editing ? 'No se puede cambiar una vez creada.' : undefined}>
              <CustomSelect
                value={naturaleza}
                onChange={(v) => setNaturaleza(v as 'INGRESO' | 'EGRESO')}
                options={[{ value: 'EGRESO', label: 'Egreso' }, { value: 'INGRESO', label: 'Ingreso' }]}
                searchable={false}
                ariaLabelledBy="catalog-nat-lbl"
              />
            </FormField>
          )}
          {editing && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
              <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} style={{ accentColor: 'var(--admin-accent-primary)' }} />
              Activa
            </label>
          )}
        </div>
        <FormSubmitError message={formError} />
      </FormModal>
    </>
  );
}
