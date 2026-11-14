import type { ApiResponse, ReservaBD } from '@/types/reserva';
import { getReservaByID } from './reservas';

type LeerReserva = (id: number) => Promise<ApiResponse<{ reserva: ReservaBD }>>;

/** Reserva de una atención o fila de jornada. Un solo mensaje de error para todas las vistas. */
export async function cargarReservaVinculada(id: number, leer: LeerReserva = getReservaByID): Promise<ReservaBD> {
  const respuesta = await leer(id);
  if (!respuesta.data?.reserva) throw new Error('No se encontró la reserva vinculada.');
  return respuesta.data.reserva;
}
