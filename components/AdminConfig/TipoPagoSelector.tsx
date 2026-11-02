'use client';

import { CreditCard, Landmark, QrCode, WalletCards } from 'lucide-react';
import { TIPOS_PAGO, etiquetaTipoPago, type TipoPago } from '@/lib/utils/tipoPago';
import styles from './TipoPagoSelector.module.css';

const ICONO_TIPO_PAGO = {
  efectivo: WalletCards,
  tarjeta: CreditCard,
  qr: QrCode,
  transferencia: Landmark,
} satisfies Record<TipoPago, typeof WalletCards>;

interface TipoPagoSelectorProps {
  value: TipoPago;
  onChange: (tipo: TipoPago) => void;
  /** Nombre del grupo para lectores de pantalla. */
  label?: string;
}

/** Elige el metodo de pago: efectivo, tarjeta, QR o transferencia. Unico selector de metodo de la app. */
export function TipoPagoSelector({ value, onChange, label = 'Método de pago' }: TipoPagoSelectorProps) {
  return (
    <div className={styles.grupo} role="group" aria-label={label}>
      {TIPOS_PAGO.map((tipo) => {
        const Icono = ICONO_TIPO_PAGO[tipo];
        return (
          <button
            key={tipo}
            type="button"
            className={value === tipo ? styles.activo : ''}
            aria-pressed={value === tipo}
            onClick={() => onChange(tipo)}
          >
            <Icono size={16} strokeWidth={1.8} />
            {etiquetaTipoPago(tipo)}
          </button>
        );
      })}
    </div>
  );
}
