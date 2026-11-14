import { expect, test } from 'bun:test';
import { cantidadTexto } from './cantidadTexto';

test('usa singular con uno y plural en el resto', () => {
  expect(cantidadTexto(1, 'atención', 'atenciones')).toBe('1 atención');
  expect(cantidadTexto(0, 'atención', 'atenciones')).toBe('0 atenciones');
  expect(cantidadTexto(12, 'atención', 'atenciones')).toBe('12 atenciones');
});

test('agrega la pagina solo cuando hay mas de una', () => {
  expect(cantidadTexto(50, 'atención', 'atenciones', 1)).toBe('50 atenciones');
  expect(cantidadTexto(50, 'atención', 'atenciones', 2)).toBe('50 atenciones · página 2');
});

test('separa los miles con el formato local', () => {
  expect(cantidadTexto(1200, 'registro', 'registros')).toContain('1');
  expect(cantidadTexto(1200, 'registro', 'registros')).toContain('registros');
});
