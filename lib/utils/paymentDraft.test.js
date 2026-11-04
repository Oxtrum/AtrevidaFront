import { describe, expect, test } from 'bun:test';
import { parsePrecioPago, prepararDetallePago, subtotalDetallePago } from './paymentDraft';

describe('precios del detalle de pago', () => {
  test('mezcla precios fijos, cero explicito y paquete sin cambiar sus importes', () => {
    const result = prepararDetallePago([
      { servicio_id: 1, servicio: 'Fijo', cantidad: 2, precio_unitario: 70, subtotal: 140 },
      { servicio_id: 2, servicio: 'Variable acordado en cero', cantidad: 1, precio_unitario: 0, subtotal: 0 },
      { servicio_id: null, servicio: 'Paquete', cantidad: 1, precio_unitario: 350, subtotal: 350 },
    ]);
    expect(result.errorIndex).toBeNull();
    expect(result.detalle.map(item => item.subtotal)).toEqual([140, 0, 350]);
    expect(result.detalle.reduce((total, item) => total + item.subtotal, 0)).toBe(490);
  });
  test('un precio pendiente bloquea el DTO completo y no altera las otras lineas', () => {
    const draft = [
      { servicio_id: 1, servicio: 'Fijo', cantidad: 1, precio_unitario: 70, subtotal: 70 },
      { servicio_id: 2, servicio: 'Variable', cantidad: 1, precio_unitario: null, subtotal: null },
    ];
    expect(prepararDetallePago(draft)).toEqual({ detalle: [], errorIndex: 1 });
    expect(draft[0].precio_unitario).toBe(70);
    expect(draft[1].precio_unitario).toBeNull();
  });
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
