import { expect, test } from 'bun:test';
import { fechaDelDia, horarioHabilitado } from './diaSeleccion';

const lunes = new Date(2026, 10, 23);
const fechas = new Map([['LUNES', { fecha: lunes }]]);

test('sin dia elegido no hay fecha, aunque la semana tenga fechas', () => {
  expect(fechaDelDia(fechas, null)).toBeNull();
  expect(fechaDelDia(null, 'LUNES')).toBeNull();
  expect(fechaDelDia(fechas, 'MARTES')).toBeNull();
});

test('con dia elegido devuelve la fecha de esa semana', () => {
  expect(fechaDelDia(fechas, 'LUNES')).toBe(lunes);
});

test('el horario solo se habilita con sucursal y dia elegidos', () => {
  expect(horarioHabilitado('LUNES', 'Centro')).toBe(true);
  expect(horarioHabilitado(null, 'Centro')).toBe(false);
  expect(horarioHabilitado('LUNES', '')).toBe(false);
});
