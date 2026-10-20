'use client';

import { useState } from 'react';
import { HandCoins, Pencil, Plus, UserMinus } from 'lucide-react';
import { AdminButton, ConfirmDialog, DataTable, RowActionsMenu, StatusBadge } from '@/components/AdminConfig';
import type { Column } from '@/components/AdminConfig';
import { toast } from '@/components/Shared/Toast';
import { darDeBajaEmpleado } from '@/lib/api/rrhh';
import { useConfiguracion } from '@/lib/hooks/useConfiguracion';
import { formatDateISO, formatMoney } from '@/lib/utils/format';
import type { Empleado } from '@/types/rrhh';
import { EmpleadoFormModal } from './EmpleadoFormModal';
import styles from './RRHHPanel.module.css';

type Row = Empleado & Record<string, unknown>;

interface EmpleadosPanelProps {
  empleados: Empleado[];
  loading: boolean;
  error: string | null;
  onReload: () => void;
  /** Abre el formulario de adelanto con este empleado preseleccionado. */
  onAdelanto: (empleado: Empleado) => void;
}

/** Ficha del personal: sueldo, día de pago, aportes y estado. */
export function EmpleadosPanel({ empleados, loading, error, onReload, onAdelanto }: EmpleadosPanelProps) {
  const { moneda } = useConfiguracion();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Empleado | null>(null);
  const [toDeactivate, setToDeactivate] = useState<Empleado | null>(null);
  const [busy, setBusy] = useState(false);

  const openForm = (e: Empleado | null) => {
    setEditing(e);
    setFormOpen(true);
  };

  const handleDeactivate = async () => {
    if (!toDeactivate) return;
    setBusy(true);
    try {
      await darDeBajaEmpleado(toDeactivate.id);
      toast.success('Empleado dado de baja');
      setToDeactivate(null);
      onReload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo dar de baja');
    } finally {
      setBusy(false);
    }
  };

  const columns: Column<Row>[] = [
    {
      key: 'apellido',
      label: 'Empleado',
      render: (_v, r) => (
        <span className={r.activo ? undefined : styles.inactivo}>
          <strong>{r.nombre} {r.apellido}</strong>
          <span className={styles.sub}>{[r.cargo, r.local_nombre ?? 'General'].filter(Boolean).join(' · ')}</span>
        </span>
      ),
    },
    { key: 'sueldo_base', label: 'Sueldo base', searchable: false, render: (v) => <strong className={styles.num}>{formatMoney(v as number, moneda)}</strong> },
    {
      key: 'dia_pago_efectivo',
      label: 'Día de pago',
      searchable: false,
      render: (v, r) => (
        <span>
          Día {v as number}
          {!r.dia_pago && <span className={styles.sub}>por defecto</span>}
        </span>
      ),
    },
    {
      key: 'aplica_aportes',
      label: 'Aportes',
      searchable: false,
      render: (v) => <StatusBadge tone={v ? 'info' : 'neutral'}>{v ? 'Con aportes' : 'Sin aportes'}</StatusBadge>,
    },
    {
      key: 'adelantos_pendientes',
      label: 'Adelantos pendientes',
      searchable: false,
      render: (v) => ((v as number) > 0 ? <span className={`${styles.num} ${styles.salida}`}>{formatMoney(v as number, moneda)}</span> : <span className={styles.muted}>—</span>),
    },
    {
      key: 'fecha_ingreso',
      label: 'Ingreso',
      searchable: false,
      render: (v, r) => (
        <span>
          {formatDateISO(v as string)}
          {r.fecha_baja && <span className={styles.sub}>baja {formatDateISO(r.fecha_baja)}</span>}
        </span>
      ),
    },
    { key: 'activo', label: 'Estado', searchable: false, render: (v) => <StatusBadge tone={v ? 'success' : 'neutral'}>{v ? 'Activo' : 'Baja'}</StatusBadge> },
    {
      key: 'acciones',
      label: '',
      searchable: false,
      render: (_v, row) => (
        <RowActionsMenu
          actions={[
            { label: 'Editar', icon: <Pencil size={12} strokeWidth={2} />, onClick: () => openForm(row) },
            ...(row.activo
              ? [
                  { label: 'Registrar adelanto', icon: <HandCoins size={12} strokeWidth={2} />, onClick: () => onAdelanto(row) },
                  { label: 'Dar de baja', icon: <UserMinus size={12} strokeWidth={2} />, onClick: () => setToDeactivate(row), variant: 'danger' as const },
                ]
              : []),
          ]}
        />
      ),
    },
  ];

  return (
    <div className={styles.stack}>
      <div className={styles.actions}>
        <AdminButton onClick={() => openForm(null)} icon={<Plus size={18} strokeWidth={2} />}>
          Nuevo empleado
        </AdminButton>
      </div>
      <DataTable<Row>
        columns={columns}
        data={empleados as Row[]}
        loading={loading}
        error={error}
        onRefresh={onReload}
        getRowKey={(e) => e.id}
        searchPlaceholder="Buscar por nombre, cargo o local…"
        emptyMessage="Aún no registraste empleados"
      />
      <EmpleadoFormModal isOpen={formOpen} empleado={editing} onClose={() => setFormOpen(false)} onSaved={onReload} />
      <ConfirmDialog
        isOpen={toDeactivate !== null}
        danger
        title="Dar de baja al empleado"
        message={`¿Dar de baja a ${toDeactivate?.nombre} ${toDeactivate?.apellido}? Dejará de generarse su planilla. Las ya generadas y su historial se conservan.`}
        confirmLabel="Dar de baja"
        loading={busy}
        onConfirm={handleDeactivate}
        onClose={() => setToDeactivate(null)}
      />
    </div>
  );
}
