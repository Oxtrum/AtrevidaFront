'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getAtencion, type Atencion } from '@/lib/api/atenciones';
import { cargarReservaVinculada } from '@/lib/api/reservaVinculada';
import type { ReservaBD } from '@/types/reserva';
import { toast } from '@/components/Shared/Toast';
import { ReservaDetailModal } from '@/components/AdminReservas/ReservaDetailModal';
import { CancelarReservaModal } from '@/components/AdminReservas/CancelarReservaModal';
import { AtencionDetalleModal } from './AtencionDetalleModal';
import { AtencionFormModal } from './AtencionFormModal';

interface ReservaYAtencion {
  reserva: ReservaBD;
  atencion: Atencion;
}

/**
 * Todo lo que se abre desde una fila de Atenciones: ver reserva, ver o editar la atención, atender y cancelar.
 * Cada pestaña llama `useAtencionModales(recargar)`, pasa el resultado a las filas y pinta `<AtencionModales>` una vez.
 */
export function useAtencionModales(onCambio: () => void) {
  const cambioRef = useRef(onCambio);
  useEffect(() => { cambioRef.current = onCambio; });

  const [reserva, setReserva] = useState<ReservaBD | null>(null);
  const [detalle, setDetalle] = useState<ReservaYAtencion | null>(null);
  const [formulario, setFormulario] = useState<{ reserva: ReservaBD; atencion?: Atencion } | null>(null);
  const [cancelacion, setCancelacion] = useState<ReservaBD | null>(null);

  const intentar = useCallback(async (accion: () => Promise<void>, mensaje: string) => {
    try {
      await accion();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : mensaje);
    }
  }, []);

  const conAtencion = useCallback(
    async (atencionId: number, reservaId: number): Promise<ReservaYAtencion> => {
      const [atencion, reserva] = await Promise.all([getAtencion(atencionId), cargarReservaVinculada(reservaId)]);
      return { atencion, reserva };
    },
    [],
  );

  return {
    reserva, detalle, formulario, cancelacion,
    cerrarReserva: () => setReserva(null),
    cerrarDetalle: () => setDetalle(null),
    cerrarFormulario: () => setFormulario(null),
    cerrarCancelacion: () => setCancelacion(null),
    notificarCambio: () => cambioRef.current(),
    verReserva: (reservaId: number) => intentar(async () => setReserva(await cargarReservaVinculada(reservaId)), 'No fue posible cargar la reserva.'),
    atender: (reservaId: number) => intentar(async () => setFormulario({ reserva: await cargarReservaVinculada(reservaId) }), 'No fue posible cargar la reserva.'),
    cancelar: (reservaId: number) => intentar(async () => setCancelacion(await cargarReservaVinculada(reservaId)), 'No fue posible cargar la reserva.'),
    verAtencion: (atencionId: number, reservaId: number) => intentar(async () => setDetalle(await conAtencion(atencionId, reservaId)), 'No fue posible cargar la atención.'),
    editar: (atencionId: number, reservaId: number) => intentar(async () => setFormulario(await conAtencion(atencionId, reservaId)), 'No fue posible cargar la atención.'),
  };
}

export type AtencionCtrl = ReturnType<typeof useAtencionModales>;

/** Los cuatro modales de una fila de Atenciones. Se pinta una sola vez por pestaña. */
export function AtencionModales({ ctrl }: { ctrl: AtencionCtrl }) {
  return (
    <>
      <ReservaDetailModal
        reserva={ctrl.reserva}
        onClose={ctrl.cerrarReserva}
        onEdit={() => undefined}
        onDelete={() => undefined}
        readOnly
      />
      <AtencionDetalleModal reserva={ctrl.detalle?.reserva ?? null} atencion={ctrl.detalle?.atencion ?? null} onClose={ctrl.cerrarDetalle} />
      <AtencionFormModal
        reserva={ctrl.formulario?.reserva ?? null}
        atencion={ctrl.formulario?.atencion ?? null}
        onClose={ctrl.cerrarFormulario}
        onSaved={() => { ctrl.cerrarFormulario(); ctrl.notificarCambio(); }}
      />
      <CancelarReservaModal reserva={ctrl.cancelacion} onClose={ctrl.cerrarCancelacion} onCancelled={ctrl.notificarCambio} />
    </>
  );
}
