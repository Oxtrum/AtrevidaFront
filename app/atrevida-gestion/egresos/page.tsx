import { redirect } from 'next/navigation';

/** Egresos se fusionó con Finanzas: un solo lugar para ver y registrar el dinero del negocio. */
export default function EgresosPage() {
  redirect('/atrevida-gestion/finanzas');
}
