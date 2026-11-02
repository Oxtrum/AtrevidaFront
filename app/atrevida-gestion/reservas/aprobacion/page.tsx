import { redirect } from 'next/navigation';

/** Aprobación de reservas ahora es la pestaña Pendientes de Reservas. */
export default function AprobacionReservasPage() {
  redirect('/atrevida-gestion/reservas?vista=pendientes');
}
