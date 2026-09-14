import type { DetalleServicio } from '@/lib/api/pagos';

export type DetallePagoDraft = Omit<DetalleServicio, 'precio_unitario' | 'subtotal'> & {
  precio_unitario: number | string | null;
  subtotal: number | null;
};

const MAX_IMPORTE = 99999999.99;
const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function parsePrecioPago(value: number | string | null): number | null {
  if (value === null || (typeof value === 'string' && value.trim() === '')) return null;
  const precio = typeof value === 'number' ? value : Number(value.replace(',', '.'));
  if (!Number.isFinite(precio) || precio < 0 || precio > MAX_IMPORTE) return null;
  return roundMoney(precio);
}

export function subtotalDetallePago(cantidad: number, precio: number | string | null): number | null {
  const unitario = parsePrecioPago(precio);
  if (unitario === null || !Number.isInteger(cantidad) || cantidad < 1 || cantidad > 2147483647) return null;
  const subtotal = roundMoney(cantidad * unitario);
  return subtotal <= MAX_IMPORTE ? subtotal : null;
}

/** Solo construye el DTO si todas las lineas tienen un importe definido y valido. */
export function prepararDetallePago(draft: DetallePagoDraft[]): { detalle: DetalleServicio[]; errorIndex: number | null } {
  const detalle: DetalleServicio[] = [];
  for (const [index, item] of draft.entries()) {
    const precio = parsePrecioPago(item.precio_unitario);
    const subtotal = subtotalDetallePago(item.cantidad, item.precio_unitario);
    if (precio === null || subtotal === null) return { detalle: [], errorIndex: index };
    detalle.push({ ...item, precio_unitario: precio, subtotal });
  }
  return { detalle, errorIndex: null };
}
