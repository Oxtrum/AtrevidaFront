import { redirect } from 'next/navigation';

/** Cuentas por cobrar ahora es la pestaña Con deuda de Clientes. */
export default function CuentasPorCobrarPage() {
  redirect('/atrevida-gestion/clientes?vista=deuda');
}
