import type { SaldoCuenta } from '@/lib/api/cuenta';
import { etiquetaSaldoTexto, tonoSaldo } from '@/lib/utils/cuenta';
import { formatMoney } from '@/lib/utils/format';
import styles from './SaldoCliente.module.css';

interface SaldoClienteProps {
  saldo: SaldoCuenta;
  /** md para celdas y listados; lg para encabezar la cuenta de un cliente. */
  size?: 'md' | 'lg';
}

/** Saldo de un cliente con su etiqueta escrita (A favor / Deuda / Al día) y el monto sin signo. */
export function SaldoCliente({ saldo, size = 'md' }: SaldoClienteProps) {
  return (
    <span className={`${styles.saldo} ${styles[size]} ${styles[tonoSaldo(saldo.etiqueta)]}`}>
      <span className={styles.etiqueta}>{etiquetaSaldoTexto(saldo.etiqueta)}</span>
      {saldo.etiqueta !== 'AL_DIA' && <span className={styles.monto}>{formatMoney(saldo.absoluto)}</span>}
    </span>
  );
}
