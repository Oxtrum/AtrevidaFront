import { expect, test } from 'bun:test';
import { moverSemana } from './semana';

test('moverSemana avanza o retrocede de a siete dias', () => {
  expect(moverSemana('2026-11-13', 1)).toBe('2026-11-20');
  expect(moverSemana('2026-11-13', -1)).toBe('2026-11-06');
  expect(moverSemana('2026-11-13', 0)).toBe('2026-11-13');
});

test('moverSemana cruza meses y anios', () => {
  expect(moverSemana('2026-12-28', 1)).toBe('2027-01-04');
  expect(moverSemana('2027-01-03', -1)).toBe('2026-12-27');
  expect(moverSemana('2026-03-01', -1)).toBe('2026-02-22');
});

test('moverSemana no se desfasa en el cambio de hora ni en anios bisiestos', () => {
  expect(moverSemana('2024-02-26', 1)).toBe('2024-03-04');
  expect(moverSemana('2026-10-26', 1)).toBe('2026-11-02');
  expect(moverSemana('2026-03-25', 1)).toBe('2026-04-01');
});
