import type { DiaSemana } from '@/types/reserva';

interface ValoresFormulario {
  sucursal: string;
  dia: DiaSemana | null;
  servicio: string;
  cliente: string;
  numeroTelefono: string;
  telefonoE164: string | undefined;
  horaDesde: string;
  horaHasta: string;
}

const MIN_DIGITOS_TELEFONO = 7;

/**
 * Quita los errores de campos que ya se completaron, para que el aviso rojo
 * desaparezca al corregir sin esperar a otro envío. No inventa errores nuevos.
 */
export function filtrarErroresResueltos(
  errores: Record<string, string>,
  v: ValoresFormulario,
): Record<string, string> {
  const resuelto: Record<string, boolean> = {
    sucursal: Boolean(v.sucursal),
    fecha: Boolean(v.dia),
    servicio: Boolean(v.servicio),
    cliente: Boolean(v.cliente.trim()),
    numeroTelefono:
      v.numeroTelefono.replace(/\D/g, '').length >= MIN_DIGITOS_TELEFONO && Boolean(v.telefonoE164),
    horaDesde: Boolean(v.horaDesde && v.horaHasta),
    horaHasta: Boolean(v.horaDesde && v.horaHasta),
  };
  return Object.fromEntries(Object.entries(errores).filter(([campo]) => !resuelto[campo]));
}
