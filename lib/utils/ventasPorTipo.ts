import type { VentaDetalleLinea } from '@/lib/api/pagos';

export type TipoLinea = VentaDetalleLinea['tipo_linea'];

/** Quita el número de orden que a veces antecede al nombre ("12 - Limpieza" → "Limpieza"). */
export function limpiarNombreVenta(value: string | null | undefined): string {
  if (!value) return 'Sin datos';
  return value
    .trim()
    .replace(/^\d+\s*[-–—:|]\s*/, '')
    .replace(/^#?\d+\s*[-–—:|]\s*/, '')
    .replace(/^#?\d+(?=[A-Za-zÁÉÍÓÚÜÑáéíóúüñ])/, '')
    .trim() || 'Sin datos';
}

/** Suma unidades y monto neto (subtotal menos el descuento que le toca) por nombre, solo de las líneas de un tipo. */
export function agruparVentasPorNombre(
  lineas: Pick<VentaDetalleLinea, 'servicio' | 'tipo_linea' | 'cantidad' | 'subtotal' | 'descuento_prorrateado'>[],
  tipo: TipoLinea,
): { nombre: string; cantidad: number; neto: number }[] {
  const porNombre = new Map<string, { cantidad: number; neto: number }>();
  for (const l of lineas) {
    if (l.tipo_linea !== tipo) continue;
    const nombre = limpiarNombreVenta(l.servicio);
    const acc = porNombre.get(nombre) ?? { cantidad: 0, neto: 0 };
    acc.cantidad += l.cantidad;
    acc.neto += l.subtotal - l.descuento_prorrateado;
    porNombre.set(nombre, acc);
  }
  return [...porNombre.entries()].map(([nombre, v]) => ({ nombre, cantidad: v.cantidad, neto: Math.round(v.neto * 100) / 100 }));
}
