import { redirect } from 'next/navigation';

/** El historial de pagos vive al final de Cobros, por local. */
export default function HistorialDePagosPage() {
  redirect('/atrevida-gestion/caja');
}
