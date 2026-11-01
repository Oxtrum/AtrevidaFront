import { expect, test } from 'bun:test';
import {
  ETIQUETA_DEUDA,
  ETIQUETA_DISPONIBLE,
  ETIQUETA_POR_PAGAR,
  estadoCargoTexto,
  parseMonto,
  tonoDisponible,
  tonoEstadoCargo,
  tonoPorPagar,
  TIPOS_CARGO,
} from './cuenta';

test('el saldo se nombra con texto, no solo con color', () => {
  expect(ETIQUETA_DISPONIBLE).toBe('Saldo disponible');
  expect(ETIQUETA_POR_PAGAR).toBe('Por pagar');
  expect(ETIQUETA_DEUDA).toBe('Deuda');
});

test('nunca se usan los terminos descartados', () => {
  const textos = [ETIQUETA_DISPONIBLE, ETIQUETA_POR_PAGAR, ETIQUETA_DEUDA].join(' ').toLowerCase();
  expect(textos).not.toContain('a favor');
  expect(textos).not.toContain('al día');
  expect(textos).not.toContain('aplica');
});

test('el saldo disponible solo destaca cuando hay dinero', () => {
  expect(tonoDisponible(150)).toBe('success');
  expect(tonoDisponible(0)).toBe('neutral');
});

test('por pagar es alerta solo si el saldo disponible no lo cubre', () => {
  expect(tonoPorPagar(250, 100)).toBe('danger');
  expect(tonoPorPagar(250, 0)).toBe('warning');
  expect(tonoPorPagar(0, 0)).toBe('neutral');
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
