'use client';

import { useState } from 'react';
import { Pencil, Plus, Power } from 'lucide-react';
import { AdminButton, DataTable, RowActionsMenu, StatusBadge } from '@/components/AdminConfig';
import type { Column } from '@/components/AdminConfig';
import { toast } from '@/components/Shared/Toast';
import { cambiarEstadoTipoBono } from '@/lib/api/rrhh';
import type { TipoBono } from '@/types/rrhh';
import styles from './RRHHPanel.module.css';
import { TipoBonoFormModal } from './TipoBonoFormModal';

type Row = TipoBono & Record<string, unknown>;

interface TiposBonoPanelProps {
  tipos: TipoBono[];
  loading: boolean;
  error: string | null;
  onReload: () => void;
}

/** Catálogo de bonos: cada bono de una planilla elige uno de estos tipos, así se sabe por qué se paga. */
export function TiposBonoPanel({ tipos, loading, error, onReload }: TiposBonoPanelProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TipoBono | null>(null);

  const openForm = (t: TipoBono | null) => {
    setEditing(t);
    setFormOpen(true);
  };

  const toggleActivo = async (t: TipoBono) => {
    try {
      await cambiarEstadoTipoBono(t.id, !t.activo);
      toast.success(t.activo ? 'Tipo desactivado' : 'Tipo activado');
      onReload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo cambiar el estado');
    }
  };

  const columns: Column<Row>[] = [
    { key: 'nombre', label: 'Tipo de bono', render: (v, r) => <strong className={r.activo ? undefined : styles.inactivo}>{v as string}</strong> },
    { key: 'descripcion', label: 'Descripción', render: (v) => (v as string) || <span className={styles.muted}>—</span> },
    { key: 'activo', label: 'Estado', searchable: false, render: (v) => <StatusBadge tone={v ? 'success' : 'neutral'}>{v ? 'Activo' : 'Inactivo'}</StatusBadge> },
    {
      key: 'acciones',
      label: '',
      searchable: false,
      render: (_v, row) => (
        <RowActionsMenu
          actions={[
            { label: 'Editar', icon: <Pencil size={12} strokeWidth={2} />, onClick: () => openForm(row) },
            { label: row.activo ? 'Desactivar' : 'Activar', icon: <Power size={12} strokeWidth={2} />, onClick: () => toggleActivo(row) },
          ]}
        />
      ),
    },
  ];

  return (
    <div className={styles.stack}>
      <div className={styles.actions}>
        <AdminButton onClick={() => openForm(null)} icon={<Plus size={18} strokeWidth={2} />}>
          Nuevo tipo de bono
        </AdminButton>
      </div>
      <DataTable<Row>
        columns={columns}
        data={tipos as Row[]}
        loading={loading}
        error={error}
        onRefresh={onReload}
        getRowKey={(t) => t.id}
        searchPlaceholder="Buscar tipo de bono…"
        emptyMessage="Aún no hay tipos de bono"
      />
      <p className={styles.note}>
        Los tipos no se eliminan: se desactivan y dejan de ofrecerse en planillas nuevas. Las planillas ya cargadas conservan el bono con su nombre.
      </p>
      <TipoBonoFormModal isOpen={formOpen} tipo={editing} onClose={() => setFormOpen(false)} onSaved={onReload} />
    </div>
  );
}
