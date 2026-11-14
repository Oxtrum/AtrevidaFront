'use client';

import { ClipboardList, Eye, Pencil, Trash2 } from 'lucide-react';
import { RowActionsMenu } from '@/components/AdminConfig';
import type { Atencion } from '@/lib/api/atenciones';

interface AtencionAccionesProps {
  atencion: Atencion;
  onEdit: () => void;
  onVerReserva: () => void;
  onVerAtencion: () => void;
  onDesactivar: () => void;
}

export function AtencionAcciones({ atencion, onEdit, onVerReserva, onVerAtencion, onDesactivar }: AtencionAccionesProps) {
  const puedeEditar = atencion.insumos_pendientes > 0;
  return (
    <RowActionsMenu
      ariaLabel={`Acciones de atención ${atencion.id}`}
      actions={[
        { label: 'Editar atención', icon: <Pencil size={14} />, onClick: onEdit, disabled: !puedeEditar },
        { label: 'Ver reserva', icon: <Eye size={14} />, onClick: onVerReserva },
        { label: 'Ver atención', icon: <ClipboardList size={14} />, onClick: onVerAtencion },
        { label: 'Desactivar atención', icon: <Trash2 size={14} />, variant: 'danger', onClick: onDesactivar },
      ]}
    />
  );
}
