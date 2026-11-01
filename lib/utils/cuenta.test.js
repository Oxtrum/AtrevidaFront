import { expect, test } from 'bun:test';
import { estadoCargoTexto, etiquetaSaldoTexto, parseMonto, tonoEstadoCargo, tonoSaldo, TIPOS_CARGO } from './cuenta';

test('el saldo se nombra con texto, no solo con color', () => {
  expect(etiquetaSaldoTexto('A_FAVOR')).toBe('A favor');
  expect(etiquetaSaldoTexto('DEUDA')).toBe('Deuda');
  expect(etiquetaSaldoTexto('AL_DIA')).toBe('Al día');
});

test('el tono del saldo distingue deuda, a favor y al dia', () => {
  expect(tonoSaldo('A_FAVOR')).toBe('success');
  expect(tonoSaldo('DEUDA')).toBe('danger');
  expect(tonoSaldo('AL_DIA')).toBe('neutral');
});

test('estados de cargo con texto y tono', () => {
  expect(estadoCargoTexto('PENDIENTE')).toBe('Pendiente');
  expect(estadoCargoTexto('PARCIAL')).toBe('Parcial');
  expect(estadoCargoTexto('PAGADO')).toBe('Pagado');
  expect(tonoEstadoCargo('PENDIENTE')).toBe('danger');
  expect(tonoEstadoCargo('PARCIAL')).toBe('warning');
  expect(tonoEstadoCargo('PAGADO')).toBe('success');
});

test('los tipos de cargo coinciden con los del backend', () => {
  expect(TIPOS_CARGO.map((t) => t.value)).toEqual(['PAQUETE', 'SERVICIO', 'INSUMO', 'OTRO']);
});

test('parseMonto acepta coma o punto y rechaza lo invalido', () => {
  expect(parseMonto('1000')).toBe(1000);
  expect(parseMonto('12,5')).toBe(12.5);
  expect(parseMonto(' 30.25 ')).toBe(30.25);
  expect(parseMonto('0')).toBe(0);
  expect(parseMonto('')).toBeNull();
  expect(parseMonto('abc')).toBeNull();
  expect(parseMonto('-5')).toBeNull();
  expect(parseMonto('1e3')).toBeNull();
});

test('parseMonto redondea a centavos', () => {
  expect(parseMonto('10.999')).toBe(11);
  expect(parseMonto('0.1')).toBe(0.1);
});
