import { expect, test } from 'bun:test';
import { TIPOS_PAGO, etiquetaTipoPago, opcionesTipoPago } from './tipoPago';

test('los metodos de cobro son cuatro y en este orden', () => {
  expect([...TIPOS_PAGO]).toEqual(['efectivo', 'tarjeta', 'qr', 'transferencia']);
});

test('cada metodo se nombra como lo lee el cajero', () => {
  expect(etiquetaTipoPago('efectivo')).toBe('Efectivo');
  expect(etiquetaTipoPago('tarjeta')).toBe('Tarjeta');
  expect(etiquetaTipoPago('qr')).toBe('QR');
  expect(etiquetaTipoPago('transferencia')).toBe('Transferencia');
});

test('un metodo desconocido o vacio no rompe los reportes', () => {
  expect(etiquetaTipoPago('sin_tipo')).toBe('Sin tipo');
  expect(etiquetaTipoPago('')).toBe('No definido');
  expect(etiquetaTipoPago('  QR ')).toBe('QR');
  expect(etiquetaTipoPago('cheque')).toBe('Cheque');
});

test('las opciones de un select salen de la misma lista', () => {
  expect(opcionesTipoPago()).toEqual([
    { value: 'efectivo', label: 'Efectivo' },
    { value: 'tarjeta', label: 'Tarjeta' },
    { value: 'qr', label: 'QR' },
    { value: 'transferencia', label: 'Transferencia' },
  ]);
});
