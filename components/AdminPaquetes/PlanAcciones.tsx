'use client';

import { useState } from 'react';
import { CheckCircle, PlayCircle, XCircle } from 'lucide-react';
import { RowActionsMenu } from '@/components/AdminConfig';
import type { RowAction } from '@/components/AdminConfig';
import { toast } from '@/components/Shared/Toast';
import { cambiarEstadoPlan, type PlanItem } from '@/lib/api/planes';
import { useLocales } from '@/lib/hooks/useLocales';
import CobrarPlanModal from './CobrarPlanModal';

interface PlanAccionesProps {
  plan: PlanItem;
  /** El paquete cambio (estado o cobro): quien lo muestra debe recargar. */
  onCambio: () => void;
}

/**
 * Menu de tres puntos de un paquete segun su estado: reservado (cobrar, activar, cancelar) o activo (completar,
 * cancelar). Es el mismo en la lista de paquetes y en la ficha del cliente.
 */
export function PlanAcciones({ plan, onCambio }: PlanAccionesProps) {
  const { locales } = useLocales();
  const [cobrando, setCobrando] = useState(false);

  const cambiarEstado = async (estado: string) => {
    try {
      await cambiarEstadoPlan(plan.id, estado);
      toast.success(`Plan ${estado}`);
      onCambio();
    } catch {
      toast.error('No se pudo cambiar el estado.');
    }
  };

  const acciones: RowAction[] = [];
  if (plan.estado === 'RESERVADO') {
    acciones.push(
      { label: 'Cobrar', icon: <CheckCircle size={12} strokeWidth={2} />, onClick: () => setCobrando(true) },
      { label: 'Activar', icon: <PlayCircle size={12} strokeWidth={2} />, onClick: () => cambiarEstado('ACTIVO') },
      { label: 'Cancelar', icon: <XCircle size={12} strokeWidth={2} />, onClick: () => cambiarEstado('CANCELADO'), variant: 'danger' },
    );
  } else if (plan.estado === 'ACTIVO') {
    acciones.push(
      { label: 'Completar', icon: <CheckCircle size={12} strokeWidth={2} />, onClick: () => cambiarEstado('COMPLETADO') },
      { label: 'Cancelar', icon: <XCircle size={12} strokeWidth={2} />, onClick: () => cambiarEstado('CANCELADO'), variant: 'danger' },
    );
  }
  if (acciones.length === 0) return null;

  return (
    <>
      <RowActionsMenu ariaLabel={`Acciones del paquete ${plan.codigo}`} actions={acciones} />
      {cobrando && (
        <CobrarPlanModal plan={plan} locales={locales} onClose={() => setCobrando(false)} onCobrado={onCambio} />
      )}
    </>
  );
}
