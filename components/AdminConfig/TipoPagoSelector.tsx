'use client';

import { CreditCard, Landmark, QrCode, WalletCards } from 'lucide-react';
import { TIPOS_PAGO, etiquetaTipoPago, type TipoPago } from '@/lib/utils/tipoPago';
import { ChoiceChips, type ChoiceOption } from './ChoiceChips';

const ICONO_TIPO_PAGO = {
  efectivo: WalletCards,
  tarjeta: CreditCard,
  qr: QrCode,
  transferencia: Landmark,
} satisfies Record<TipoPago, typeof WalletCards>;

interface TipoPagoSelectorProps<E extends string> {
  value: TipoPago | NoInfer<E>;
  onChange: (valor: TipoPago | NoInfer<E>) => void;
  /** Nombre del grupo para lectores de pantalla. */
  label?: string;
  /** fila = una sola fila a todo el ancho (por defecto); grid = dos columnas grandes; chips = botones sueltos. */
  variant?: 'fila' | 'grid' | 'chips';
  /** Opciones que van después de los cuatro métodos (p. ej. pagar con saldo o dejar a cuenta). */
  extras?: ChoiceOption<E>[];
}

/** Elige el metodo de pago: efectivo, tarjeta, QR o transferencia, más las opciones extra que pida quien lo usa. */
export function TipoPagoSelector<E extends string = never>({
  value,
  onChange,
  label = 'Método de pago',
  variant = 'fila',
  extras = [],
}: TipoPagoSelectorProps<E>) {
  const metodos: ChoiceOption<TipoPago | E>[] = TIPOS_PAGO.map((tipo) => {
    const Icono = ICONO_TIPO_PAGO[tipo];
    return { value: tipo, label: etiquetaTipoPago(tipo), icon: <Icono size={16} strokeWidth={1.8} /> };
  });
  return <ChoiceChips options={[...metodos, ...extras]} value={value} onChange={onChange} ariaLabel={label} variant={variant} />;
}
