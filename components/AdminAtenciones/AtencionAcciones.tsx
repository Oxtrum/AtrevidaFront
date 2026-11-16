'use client';

import { ClipboardCheck, ClipboardList, Eye, Pencil, RotateCcw, Trash2, XCircle } from 'lucide-react';
import { AdminButton, RowActionsMenu } from '@/components/AdminConfig';
import type { RowAction } from '@/components/AdminConfig';
import type { AtencionCtrl } from './AtencionModales';

/** Qué puede hacerse con la fila. Lo decide el servidor; la fila solo lo muestra. */
export interface PermisosAtencion {
  atender?: boolean;
  cancelar?: boolean;
  verAtencion?: boolean;
  editar?: boolean;
}

interface AtencionAccionesProps {
  ctrl: AtencionCtrl;
  reservaId: number;
  atencionId?: number | null;
  puede: PermisosAtencion;
  /** Desactiva Atención; desde Jornada se presenta como reapertura. */
  onDesactivar?: () => void;
  accionReabrir?: boolean;
}

/**
 * Acciones de cualquier fila de Atenciones: un botón para lo principal (Atender) y un menú con el resto.
 * Es el único lugar que decide qué acciones existen y cómo se ven.
 */
export function AtencionAcciones({ ctrl, reservaId, atencionId, puede, onDesactivar, accionReabrir = false }: AtencionAccionesProps) {
  const acciones: RowAction[] = [
    ...(puede.verAtencion && atencionId ? [{ label: 'Ver atención', icon: <ClipboardList size={14} />, onClick: () => void ctrl.verAtencion(atencionId, reservaId) }] : []),
    ...(puede.editar && atencionId ? [{ label: 'Editar atención', icon: <Pencil size={14} />, onClick: () => void ctrl.editar(atencionId, reservaId) }] : []),
    { label: 'Ver reserva', icon: <Eye size={14} />, onClick: () => void ctrl.verReserva(reservaId) },
    ...(puede.cancelar ? [{ label: 'Cancelar reserva', icon: <XCircle size={14} />, variant: 'danger' as const, onClick: () => void ctrl.cancelar(reservaId) }] : []),
    ...(onDesactivar ? [{
      label: accionReabrir ? 'Reabrir reserva' : 'Desactivar atención',
      icon: accionReabrir ? <RotateCcw size={14} /> : <Trash2 size={14} />,
      variant: accionReabrir ? 'warning' as const : 'danger' as const,
      onClick: onDesactivar,
    }] : []),
  ];
  return (
    <>
      {puede.atender && (
        <AdminButton size="xs" icon={<ClipboardCheck size={13} />} onClick={() => void ctrl.atender(reservaId)}>Atender</AdminButton>
      )}
      <RowActionsMenu ariaLabel={`Acciones de la reserva ${reservaId}`} actions={acciones} />
    </>
  );
}
