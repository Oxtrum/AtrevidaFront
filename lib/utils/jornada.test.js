import { expect, test } from 'bun:test';
import { agruparPorFranja, franjaDe, proximaReservaId } from './jornada';

test('franjaDe parte el dia en manana, tarde y noche', () => {
  expect(franjaDe('08:00')).toBe('MANANA');
  expect(franjaDe('11:59')).toBe('MANANA');
  expect(franjaDe('12:00')).toBe('TARDE');
  expect(franjaDe('17:30')).toBe('TARDE');
  expect(franjaDe('18:00')).toBe('NOCHE');
});

test('franjaDe no se rompe con una hora vacia o mal escrita', () => {
  expect(franjaDe('')).toBe('MANANA');
  expect(franjaDe('xx')).toBe('MANANA');
});

test('agruparPorFranja conserva el orden y omite las franjas vacias', () => {
  const filas = [
    { id: 1, hora_desde: '09:00' },
    { id: 2, hora_desde: '10:30' },
    { id: 3, hora_desde: '15:00' },
  ];
  const grupos = agruparPorFranja(filas);
  expect(grupos.map((g) => g.titulo)).toEqual(['Mañana', 'Tarde']);
  expect(grupos[0].filas.map((f) => f.id)).toEqual([1, 2]);
  expect(grupos[1].filas.map((f) => f.id)).toEqual([3]);
});

test('agruparPorFranja sin filas devuelve una lista vacia', () => {
  expect(agruparPorFranja([])).toEqual([]);
});

const fila = (reserva_id, hora_desde, hora_hasta, estado_operativo = 'PROGRAMADA') => ({ reserva_id, hora_desde, hora_hasta, estado_operativo });

test('proximaReservaId elige la primera programada que aun no termino', () => {
  const filas = [fila(1, '09:00', '10:00'), fila(2, '11:00', '12:00'), fila(3, '15:00', '16:00')];
  expect(proximaReservaId(filas, '10:30')).toBe(2);
  expect(proximaReservaId(filas, '08:00')).toBe(1);
});

test('proximaReservaId cuenta la que esta en curso', () => {
  const filas = [fila(1, '09:00', '10:00'), fila(2, '11:00', '12:00')];
  expect(proximaReservaId(filas, '09:30')).toBe(1);
});

test('proximaReservaId ignora las que no estan programadas y devuelve undefined si no queda ninguna', () => {
  const filas = [fila(1, '09:00', '10:00', 'ATENDIDA'), fila(2, '11:00', '12:00', 'CANCELADA')];
  expect(proximaReservaId(filas, '08:00')).toBeUndefined();
  expect(proximaReservaId([fila(3, '09:00', '10:00')], '18:00')).toBeUndefined();
});

test('proximaReservaId no depende del orden en que llegan', () => {
  const filas = [fila(3, '15:00', '16:00'), fila(1, '09:00', '10:00')];
  expect(proximaReservaId(filas, '08:00')).toBe(1);
});
