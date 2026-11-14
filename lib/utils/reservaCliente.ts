export interface ClienteDeReservaEntrada {
  /** Panel interno: es el único que trabaja con clientes registrados. */
  esAdmin: boolean;
  editando: boolean;
  aprobando: boolean;
  /** Cliente con el que la reserva ya estaba enlazada (null si estaba por vincular o es nueva). */
  clienteIdOriginal: number | null;
  /** Cliente elegido ahora en el buscador. */
  clienteId: number | null;
  /** Cliente de una sola visita: la reserva queda por vincular. */
  sinRegistrar: boolean;
  nombre: string;
}

const ELEGIR = 'Elige un cliente de la lista o crea uno nuevo';

/**
 * Error de la sección Cliente del formulario de reserva, o null si está bien. El panel exige un cliente registrado
 * al reservar y al aprobar, salvo que se marque sin registrar (solo hace falta el nombre). Al editar una reserva
 * vieja sin cliente no se obliga a vincularlo; si ya tenía uno y se escribió encima, hay que volver a elegir.
 */
export function errorDeClienteDeReserva(e: ClienteDeReservaEntrada): string | null {
  if (!e.esAdmin) return null;
  if (e.sinRegistrar) return e.nombre.trim() ? null : 'Escribe el nombre del cliente';
  const obliga = !e.editando || e.aprobando || e.clienteIdOriginal != null;
  return obliga && e.clienteId == null ? ELEGIR : null;
}
