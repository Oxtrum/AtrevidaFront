'use client';

import { useState } from 'react';
import { Ban, Plus } from 'lucide-react';
import { AdminButton, ConfirmDialog, DataTable, RowActionsMenu, StatusBadge } from '@/components/AdminConfig';
import type { BadgeTone, Column } from '@/components/AdminConfig';
import { toast } from '@/components/Shared/Toast';
import { anularAdelanto } from '@/lib/api/rrhh';
import { useConfiguracion } from '@/lib/hooks/useConfiguracion';
import { formatDateISO, formatMoney } from '@/lib/utils/format';
import type { Adelanto } from '@/types/rrhh';
import styles from './RRHHPanel.module.css';

type Row = Adelanto & Record<string, unknown>;

const estadoDe = (a: Adelanto): { label: string; tone: BadgeTone } => {
  if (a.anulado) return { label: 'Anulado', tone: 'danger' };
  if (a.planilla_id) return { label: 'Descontado', tone: 'success' };
  return { label: 'Pendiente', tone: 'warning' };
};

interface AdelantosPanelProps {
  adelantos: Adelanto[];
  loading: boolean;
  error: string | null;
  onReload: () => void;
  onNuevo: () => void;
}

/** Anticipos de sueldo: los pendientes se descuentan solos en la siguiente planilla del empleado. */
export function AdelantosPanel({ adelantos, loading, error, onReload, onNuevo }: AdelantosPanelProps) {
  const { moneda } = useConfiguracion();
  const [toCancel, setToCancel] = useState<Adelanto | null>(null);
  const [busy, setBusy] = useState(false);

  const handleCancel = async () => {
    if (!toCancel) return;
    setBusy(true);
    try {
      await anularAdelanto(toCancel.id);
      toast.success('Adelanto anulado');
      setToCancel(null);
      onReload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo anular');
    } finally {
      setBusy(false);
    }
  };

  const columns: Column<Row>[] = [
    { key: 'empleado_nombre', label: 'Empleado' },
    { key: 'fecha', label: 'Fecha', searchable: false, render: (v) => formatDateISO(v as string) },
    { key: 'monto', label: 'Monto', searchable: false, render: (v) => <strong className={styles.num}>{formatMoney(v as number, moneda)}</strong> },
    { key: 'motivo', label: 'Motivo', render: (v) => (v as string) || <span className={styles.muted}>—</span> },
    {
      key: 'estado',
      label: 'Estado',
      searchable: false,
      render: (_v, r) => {
        const e = estadoDe(r);
        return <StatusBadge tone={e.tone}>{e.label}</StatusBadge>;
      },
    },
    {
      key: 'acciones',
      label: '',
      searchable: false,
      render: (_v, row) =>
        row.planilla_id || row.anulado ? null : (
          <RowActionsMenu actions={[{ label: 'Anular', icon: <Ban size={12} strokeWidth={2} />, onClick: () => setToCancel(row), variant: 'danger' as const }]} />
        ),
    },
  ];

  return (
    <div className={styles.stack}>
      <div className={styles.actions}>
        <AdminButton onClick={onNuevo} icon={<Plus size={18} strokeWidth={2} />}>
          Registrar adelanto
        </AdminButton>
      </div>
      <DataTable<Row>
        columns={columns}
        data={adelantos as Row[]}
        loading={loading}
        error={error}
        onRefresh={onReload}
        getRowKey={(a) => a.id}
        searchPlaceholder="Buscar por empleado o motivo…"
        emptyMessage="No hay adelantos registrados"
      />
      <p className={styles.note}>
        Un adelanto se descuenta en la siguiente planilla del empleado, siempre que quepa en lo que le queda tras aportes y descuentos. Si no cabe, sigue pendiente para la próxima.
      </p>
      <ConfirmDialog
        isOpen={toCancel !== null}
        danger
        title="Anular adelanto"
        message={`¿Anular el adelanto de ${toCancel ? formatMoney(toCancel.monto, moneda) : ''} a ${toCancel?.empleado_nombre}? Ya no se descontará de su planilla.`}
        confirmLabel="Anular"
        loading={busy}
        onConfirm={handleCancel}
        onClose={() => setToCancel(null)}
      />
    </div>
  );
}
