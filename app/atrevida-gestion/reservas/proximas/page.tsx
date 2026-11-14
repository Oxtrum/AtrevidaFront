import { redirect } from 'next/navigation';

/** Citas próximas ahora es la tabla Hoy y mañana del Dashboard. */
export default function CitasProximasPage() {
  redirect('/atrevida-gestion/dashboard');
}
