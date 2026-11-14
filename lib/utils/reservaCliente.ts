export interface ClienteDeReservaEntrada {
  /** Panel interno: es el único que trabaja con clientes registrados. */
  esAdmin: boolean;
  editando: boolean;
  /** Cliente con el que la reserva ya estaba enlazada (null si estaba por vincular o es nueva). */
  clienteIdOriginal: number | null;
  /** Cliente elegido ahora en el buscador. */
  clienteId: number | null;
}

/**
 * Error de la sección Cliente del formulario de reserva, o null si está bien. El cliente registrado es opcional: la
 * reserva queda por vincular si no se eligió uno (el nombre y el teléfono los exige validateReservationForm). Lo
 * único que no se permite es soltar de un cliente a una reserva que ya lo tenía: el servidor no la desvincula, así
 * que hay que volver a elegir uno.
 */
export function errorDeClienteDeReserva(e: ClienteDeReservaEntrada): string | null {
  if (!e.esAdmin) return null;
  if (e.editando && e.clienteIdOriginal != null && e.clienteId == null) return 'Elige un cliente de la lista o crea uno nuevo';
  return null;
}
