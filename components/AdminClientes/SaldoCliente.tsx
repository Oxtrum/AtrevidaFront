import type { SaldoCuenta } from '@/lib/api/cuenta';
import { ETIQUETA_DEUDA, ETIQUETA_DISPONIBLE, ETIQUETA_POR_PAGAR, tonoDisponible, tonoPorPagar } from '@/lib/utils/cuenta';
import { formatMoney } from '@/lib/utils/format';
import styles from './SaldoCliente.module.css';

interface SaldoClienteProps {
  saldo: SaldoCuenta;
  /** md para celdas y listados; lg para encabezar la cuenta de un cliente. */
  size?: 'md' | 'lg';
}

/** Saldo de un cliente en dos numeros, con etiqueta escrita: saldo disponible y por pagar; la deuda solo si existe. */
export function SaldoCliente({ saldo, size = 'md' }: SaldoClienteProps) {
  return (
    <span className={`${styles.saldo} ${styles[size]}`}>
      <span className={`${styles.grupo} ${styles[tonoDisponible(saldo.disponible)]}`}>
        <span className={styles.etiqueta}>{ETIQUETA_DISPONIBLE}</span>
        <span className={styles.monto}>{formatMoney(saldo.disponible)}</span>
      </span>
      <span className={`${styles.grupo} ${styles[tonoPorPagar(saldo.por_pagar)]}`}>
        <span className={styles.etiqueta}>{ETIQUETA_POR_PAGAR}</span>
        <span className={styles.monto}>{formatMoney(saldo.por_pagar)}</span>
      </span>
      {saldo.deuda > 0 && (
        <span className={`${styles.grupo} ${styles.danger}`}>
          <span className={styles.etiqueta}>{ETIQUETA_DEUDA}</span>
          <span className={styles.monto}>{formatMoney(saldo.deuda)}</span>
        </span>
      )}
    </span>
  );
}

/** Solo la deuda de un cliente, para listados de quienes deben. */
export function DeudaCliente({ monto, size = 'md' }: { monto: number; size?: 'md' | 'lg' }) {
  return (
    <span className={`${styles.saldo} ${styles[size]}`}>
      <span className={`${styles.grupo} ${styles.danger}`}>
        <span className={styles.etiqueta}>{ETIQUETA_DEUDA}</span>
        <span className={styles.monto}>{formatMoney(monto)}</span>
      </span>
    </span>
  );
}
