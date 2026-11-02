import { resolvePhoneE164 } from './phone';

interface ConTelefono {
  telefono_e164?: string | null;
  numero_telefono?: string | null;
}

/**
 * Si el telefono de la reserva difiere del que tiene el cliente, el cajero puede reemplazar el del cliente.
 * Una reserva sin telefono no ofrece nada; un cliente sin telefono si.
 */
export function telefonosDistintos(cliente: ConTelefono, reserva: ConTelefono): boolean {
  const deReserva = resolvePhoneE164(reserva.telefono_e164, reserva.numero_telefono);
  if (!deReserva) return false;
  return resolvePhoneE164(cliente.telefono_e164, cliente.numero_telefono) !== deReserva;
}
