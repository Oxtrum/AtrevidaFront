import { expect, test } from 'bun:test';
import { formatCostoReserva, formatCostoServicio } from './serviceCost';

test('un costo variable no se presenta como gratuito', () => {
  expect(formatCostoServicio({ costo: 0, costo_variable: true })).toBe('Variable');
  expect(formatCostoServicio({ costo: 0, costo_variable: false })).toBe('Gratis');
});

test('la reserva usa su modalidad historica y no el catalogo', () => {
  expect(formatCostoReserva({ precio: null, costo_variable: true })).toBe('Variable');
  expect(formatCostoReserva({ precio: 70, costo_variable: true })).toBe('Variable');
  expect(formatCostoReserva({ precio: null })).toBe('—');
});
