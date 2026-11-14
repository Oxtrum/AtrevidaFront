import { expect, test } from 'bun:test';
import { armarVista, leerVista } from './vistaUrl';

test('leerVista devuelve vacio para cada clave si la URL es de otra vista', () => {
  expect(leerVista('?vista=historial&q=ana', 'jornada', ['q', 'fecha'])).toEqual({ q: '', fecha: '' });
  expect(leerVista('', 'jornada', ['q'])).toEqual({ q: '' });
});

test('leerVista lee solo las claves pedidas de su propia vista', () => {
  const out = leerVista('?vista=jornada&q=ana&fecha=2026-11-14&otra=1', 'jornada', ['q', 'fecha', 'estado']);
  expect(out).toEqual({ q: 'ana', fecha: '2026-11-14', estado: '' });
});

test('armarVista pone la vista primero y omite lo vacio', () => {
  expect(armarVista('jornada', { fecha: '2026-11-14', q: '', local_id: undefined, estado: null, x: false }))
    .toBe('vista=jornada&fecha=2026-11-14');
  expect(armarVista('seguimiento', {})).toBe('vista=seguimiento');
});

test('armarVista conserva numeros y codifica texto', () => {
  expect(armarVista('historial', { local_id: 3, q: 'ana maria' })).toBe('vista=historial&local_id=3&q=ana+maria');
});

test('armarVista quita espacios sobrantes del texto', () => {
  expect(armarVista('historial', { q: '  ana  ' })).toBe('vista=historial&q=ana');
  expect(armarVista('historial', { q: '   ' })).toBe('vista=historial');
});
