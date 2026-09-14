import { describe, expect, test } from 'bun:test';
import { parsePrecioPago, prepararDetallePago, subtotalDetallePago } from './paymentDraft';

describe('precios del detalle de pago', () => {
  test('un precio pendiente no equivale a cero', () => {
    for (const value of [null, '', '   ']) expect(parsePrecioPago(value)).toBeNull();
    expect(parsePrecioPago('0')).toBe(0);
  });
  test('rechaza importes y cantidades invalidos', () => {
    for (const value of [-1, Infinity, NaN, 'abc', 100000000]) expect(parsePrecioPago(value)).toBeNull();
    expect(subtotalDetallePago(1.5, 10)).toBeNull();
    expect(subtotalDetallePago(2, 99999999)).toBeNull();
  });
  test('recalcula el DTO sin confiar en el subtotal del formulario', () => {
    const item = { servicio_id: 1, servicio: 'Servicio', cantidad: 2, precio_unitario: '70,25', subtotal: 0 };
    const result = prepararDetallePago([item]);
    expect(result.errorIndex).toBeNull();
    expect(result.detalle[0].precio_unitario).toBe(70.25);
    expect(result.detalle[0].subtotal).toBe(140.5);
    expect(prepararDetallePago([{ ...item, precio_unitario: '' }]).errorIndex).toBe(0);
  });
});
