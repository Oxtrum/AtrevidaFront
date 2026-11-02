import { expect, test } from 'bun:test';
import { horasFinDisponibles, horasInicioDisponibles } from './horasReserva';

test('el inicio solo ofrece bloques de 30 minutos antes del cierre', () => {
  const horas = horasInicioDisponibles('15:00');
  expect(horas[0]).toBe('08:00');
  expect(horas[horas.length - 1]).toBe('14:30');
  expect(horas.every((h) => h.endsWith(':00') || h.endsWith(':30'))).toBe(true);
});

test('un dia cerrado no ofrece horas', () => {
  expect(horasInicioDisponibles(null)).toEqual([]);
  expect(horasFinDisponibles('10:00', null)).toEqual([]);
});

test('el fin va despues del inicio y puede llegar hasta el cierre', () => {
  const horas = horasFinDisponibles('18:30', '20:00');
  expect(horas).toEqual(['19:00', '19:30', '20:00']);
});

test('una hora fuera de la rejilla ya guardada se conserva para no perderla', () => {
  expect(horasInicioDisponibles('20:00', '12:10')).toContain('12:10');
  expect(horasInicioDisponibles('20:00', '12:10').indexOf('12:10')).toBe(horasInicioDisponibles('20:00', '12:10').indexOf('12:00') + 1);
  expect(horasFinDisponibles('12:00', '20:00', '13:33')).toContain('13:33');
});

test('no duplica una hora que ya esta en la rejilla', () => {
  const horas = horasInicioDisponibles('20:00', '12:30');
  expect(horas.filter((h) => h === '12:30')).toHaveLength(1);
});
