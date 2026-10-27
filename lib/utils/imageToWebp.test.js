import { expect, test } from 'bun:test';
import { calcularTamano, formatBytes } from './imageToWebp';

test('reduce proporcionalmente al lado mayor sin ampliar', () => {
  expect(calcularTamano(4000, 3000)).toEqual({ width: 1024, height: 768 });
  expect(calcularTamano(3000, 4000)).toEqual({ width: 768, height: 1024 });
  expect(calcularTamano(800, 600)).toEqual({ width: 800, height: 600 });
});

test('nunca devuelve lados en cero', () => {
  expect(calcularTamano(10000, 1)).toEqual({ width: 1024, height: 1 });
});

test('formatea el peso en B, KB y MB', () => {
  expect(formatBytes(512)).toBe('512 B');
  expect(formatBytes(2048)).toBe('2 KB');
  expect(formatBytes(3 * 1024 * 1024)).toBe('3.0 MB');
});
