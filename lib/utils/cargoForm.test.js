import { describe, expect, test } from 'bun:test';
import { conceptoInsumo, montoSugerido, parseCantidad } from './cargoForm';

describe('formulario de cargo', () => {
  test('el monto sugerido es precio por cantidad, sin decimales de más', () => {
    expect(montoSugerido(20, 2)).toBe('40');
    expect(montoSugerido(12.5, 3)).toBe('37.5');
    expect(montoSugerido(0.1, 3)).toBe('0.3');
  });
  test('sin precio o con cantidad inválida no sugiere monto', () => {
    expect(montoSugerido(null, 2)).toBe('');
    expect(montoSugerido(undefined, 2)).toBe('');
    expect(montoSugerido(20, 0)).toBe('');
    expect(montoSugerido(20, NaN)).toBe('');
  });
  test('un precio de cero sugiere cero (consumo sin cobro)', () => {
    expect(montoSugerido(0, 2)).toBe('0');
  });
  test('la cantidad acepta coma o punto y rechaza cero, negativos y texto', () => {
    expect(parseCantidad('2')).toBe(2);
    expect(parseCantidad('1,5')).toBe(1.5);
    expect(parseCantidad(' 0.25 ')).toBe(0.25);
    for (const v of ['', '0', '-1', 'abc']) expect(parseCantidad(v)).toBeNull();
  });
  test('el concepto del insumo lleva la cantidad', () => {
    expect(conceptoInsumo('Crema', 2)).toBe('Crema ×2');
    expect(conceptoInsumo('Gel', 1.5)).toBe('Gel ×1.5');
  });
});
