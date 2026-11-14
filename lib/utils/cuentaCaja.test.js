import { describe, expect, test } from 'bun:test';
import { cargosDesdeDetalle, prorratearDescuento } from './cuentaCaja';

describe('descuento repartido entre las líneas', () => {
  test('sin descuento deja los subtotales como están', () => {
    expect(prorratearDescuento([100, 40], 0)).toEqual([100, 40]);
  });
  test('reparte en proporción al subtotal', () => {
    expect(prorratearDescuento([100, 300], 40)).toEqual([90, 270]);
  });
  test('la suma siempre cuadra con subtotal menos descuento, aunque no divida exacto', () => {
    const netos = prorratearDescuento([10, 10, 10], 10);
    expect(Math.round(netos.reduce((a, b) => a + b, 0) * 100) / 100).toBe(20);
    expect(netos.every((n) => n >= 0)).toBe(true);
  });
  test('un descuento mayor al subtotal deja todo en cero', () => {
    expect(prorratearDescuento([50, 50], 500)).toEqual([0, 0]);
  });
  test('subtotal cero no divide por cero', () => {
    expect(prorratearDescuento([0, 0], 10)).toEqual([0, 0]);
  });
});

describe('cargos a partir del detalle del pago', () => {
  const base = { descuento: 0, localId: 3 };
  const servicio = { servicio_id: 8, servicio: 'Limpieza facial', cantidad: 1, precio_unitario: 100, subtotal: 100 };
  const paquete = { servicio_id: null, servicio: 'Paquete: Relax', cantidad: 1, precio_unitario: 900, subtotal: 900 };

  test('cada línea es un cargo del tipo que le toca', () => {
    const cargos = cargosDesdeDetalle([servicio, paquete], { ...base, esPaquete: (l) => l.servicio.startsWith('Paquete: ') });
    expect(cargos.map((c) => c.tipo)).toEqual(['SERVICIO', 'PAQUETE']);
    expect(cargos.map((c) => c.monto)).toEqual([100, 900]);
  });
  test('el servicio con varias unidades lo dice en el concepto', () => {
    const [c] = cargosDesdeDetalle([{ ...servicio, cantidad: 3, subtotal: 300 }], { ...base, esPaquete: () => false });
    expect(c.concepto).toBe('Limpieza facial ×3');
  });
  test('un cargo de venta no se asocia a una reserva', () => {
    const cargos = cargosDesdeDetalle([servicio], { ...base, esPaquete: () => false });
    expect(cargos[0]).not.toHaveProperty('reserva_id');
  });
  test('el paquete se liga al plan ya creado para esa línea', () => {
    const [c] = cargosDesdeDetalle([paquete], { ...base, esPaquete: () => true, planPorLinea: { 'Paquete: Relax': 21 } });
    expect(c).toMatchObject({ tipo: 'PAQUETE', plan_id: 21, concepto: 'Paquete: Relax' });
  });
  test('el descuento baja los montos y la suma de cargos cuadra con el total del pago', () => {
    const cargos = cargosDesdeDetalle([servicio], { ...base, descuento: 14, esPaquete: () => false });
    const suma = Math.round(cargos.reduce((a, c) => a + c.monto, 0) * 100) / 100;
    expect(suma).toBe(86);
  });
});
