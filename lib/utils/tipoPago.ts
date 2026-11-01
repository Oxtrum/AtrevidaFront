// Metodos con los que se cobra. Lista cerrada: debe coincidir con services.TiposPago del backend y con la
// restriccion chk_pagos_tipo_pago de la base.
export const TIPOS_PAGO = ['efectivo', 'tarjeta', 'qr', 'transferencia'] as const;

export type TipoPago = (typeof TIPOS_PAGO)[number];

const ETIQUETAS: Record<TipoPago, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  qr: 'QR',
  transferencia: 'Transferencia',
};

export function esTipoPago(valor: string): valor is TipoPago {
  return (TIPOS_PAGO as readonly string[]).includes(valor);
}

/** Texto de un metodo para tablas y reportes; tolera valores viejos o ausentes. */
export function etiquetaTipoPago(valor: string | null | undefined): string {
  const limpio = (valor ?? '').trim().toLowerCase();
  if (!limpio) return 'No definido';
  if (esTipoPago(limpio)) return ETIQUETAS[limpio];
  if (limpio === 'sin_tipo') return 'Sin tipo';
  return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}

export function opcionesTipoPago(): { value: TipoPago; label: string }[] {
  return TIPOS_PAGO.map((value) => ({ value, label: ETIQUETAS[value] }));
}
