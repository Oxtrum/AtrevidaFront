import { describe, expect, test } from 'bun:test';
import { horaDeMovimiento } from './horaMovimiento';

describe('hora que se muestra junto a la fecha de un movimiento', () => {
  const ts = '2026-11-02T15:30:00-04:00';
  test('las ventas muestran la hora', () => {
    expect(horaDeMovimiento('VENTA', ts)).toMatch(/^\d{2}:\d{2}$/);
  });
  test('los egresos y otros ingresos no: solo cuenta el día', () => {
    for (const origen of ['COMPRA', 'GASTO_FIJO', 'GASTO_VARIABLE', 'OTRO_INGRESO']) expect(horaDeMovimiento(origen, ts)).toBe('');
  });
  test('sin ts o con ts inválido no muestra nada', () => {
    expect(horaDeMovimiento('VENTA', undefined)).toBe('');
    expect(horaDeMovimiento('VENTA', 'no es una fecha')).toBe('');
  });
});
