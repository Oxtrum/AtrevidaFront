import { expect, test } from 'bun:test';
import { diasDeSemana, lunesDe, moverDiaHabil, moverSemana, semanasEntre, sumarDias, tituloSemana } from './semana';

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

test('sumarDias mueve dias de calendario sin desfase de hora', () => {
  expect(sumarDias('2026-11-14', 1)).toBe('2026-11-15');
  expect(sumarDias('2026-11-01', -1)).toBe('2026-10-31');
  expect(sumarDias('2024-02-28', 2)).toBe('2024-03-01');
  expect(sumarDias('2026-03-29', 0)).toBe('2026-03-29');
});

test('lunesDe devuelve el lunes de la semana de cualquier dia', () => {
  expect(lunesDe('2026-11-14')).toBe('2026-11-09');
  expect(lunesDe('2026-11-09')).toBe('2026-11-09');
  expect(lunesDe('2026-11-15')).toBe('2026-11-09');
  expect(lunesDe('2027-01-01')).toBe('2026-12-28');
});

test('diasDeSemana lista los dias de lunes en adelante', () => {
  expect(diasDeSemana('2026-11-14', 6)).toEqual([
    '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14',
  ]);
  expect(diasDeSemana('2026-11-14')).toHaveLength(6);
});

test('tituloSemana usa el formato del selector de semanas', () => {
  expect(tituloSemana('2026-11-09')).toBe('9 AL 14 DE NOVIEMBRE DE 2026');
  expect(tituloSemana('2026-11-14')).toBe('9 AL 14 DE NOVIEMBRE DE 2026');
});

test('tituloSemana nombra los dos meses cuando la semana los cruza', () => {
  expect(tituloSemana('2026-11-30')).toBe('30 DE NOVIEMBRE AL 5 DE DICIEMBRE DE 2026');
  expect(tituloSemana('2026-12-28')).toBe('28 DE DICIEMBRE AL 2 DE ENERO DE 2027');
});

test('semanasEntre lista una opcion por semana, desde el lunes del minimo', () => {
  const semanas = semanasEntre('2026-11-04', '2026-11-24');
  expect(semanas.map((s) => s.inicio)).toEqual(['2026-11-02', '2026-11-09', '2026-11-16', '2026-11-23']);
  expect(semanas[1].titulo).toBe('9 AL 14 DE NOVIEMBRE DE 2026');
});

test('semanasEntre incluye la semana del maximo y no se cuelga con rangos invertidos', () => {
  expect(semanasEntre('2026-11-09', '2026-11-09')).toHaveLength(1);
  expect(semanasEntre('2026-11-23', '2026-11-09')).toEqual([]);
});

test('moverDiaHabil avanza un dia y salta el domingo', () => {
  expect(moverDiaHabil('2026-11-12', 1)).toBe('2026-11-13');
  expect(moverDiaHabil('2026-11-14', 1)).toBe('2026-11-16');
  expect(moverDiaHabil('2026-11-16', -1)).toBe('2026-11-14');
  expect(moverDiaHabil('2026-11-09', -1)).toBe('2026-11-07');
});

test('moverDiaHabil desde un domingo cae en el lunes o el sabado vecino', () => {
  expect(moverDiaHabil('2026-11-15', 1)).toBe('2026-11-16');
  expect(moverDiaHabil('2026-11-15', -1)).toBe('2026-11-14');
});
