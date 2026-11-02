import { redirect } from 'next/navigation';

/** Paquetes activos ahora es la pestaña Paquetes de Clientes. */
export default function PaquetesActivosPage() {
  redirect('/atrevida-gestion/clientes?vista=paquetes');
}
