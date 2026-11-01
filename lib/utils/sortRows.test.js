import { expect, test } from 'bun:test';
import { nextSort, sortKey, sortRows, sortToParams } from './sortRows';

const filas = [
  { id: 1, nombre: 'Cera', local: 'San Martin', precio: 30, stock: 5 },
  { id: 2, nombre: 'álcool', local: 'Paseo Aranjuez', precio: 120.5, stock: 0 },
  { id: 3, nombre: 'Anestesia', local: 'Paseo Aranjuez', precio: 30, stock: 12 },
  { id: 4, nombre: 'Aceite', local: null, precio: null, stock: 7 },
];

const ids = (rows) => rows.map((r) => r.id);

test('sin orden devuelve las filas tal como llegan', () => {
  expect(ids(sortRows(filas, null))).toEqual([1, 2, 3, 4]);
});

test('no modifica el arreglo original', () => {
  const copia = [...filas];
  sortRows(filas, { key: 'precio', dir: 'desc' });
  expect(filas).toEqual(copia);
});

test('ordena numeros por valor y no por texto', () => {
  expect(ids(sortRows(filas, { key: 'stock', dir: 'asc' }))).toEqual([2, 1, 4, 3]);
  expect(ids(sortRows(filas, { key: 'stock', dir: 'desc' }))).toEqual([3, 4, 1, 2]);
});

test('ordena texto ignorando mayusculas y acentos', () => {
  expect(ids(sortRows(filas, { key: 'nombre', dir: 'asc' }))).toEqual([4, 2, 3, 1]);
});

test('los valores vacios quedan al final en ambos sentidos', () => {
  expect(ids(sortRows(filas, { key: 'precio', dir: 'asc' })).at(-1)).toBe(4);
  expect(ids(sortRows(filas, { key: 'precio', dir: 'desc' })).at(-1)).toBe(4);
  expect(ids(sortRows(filas, { key: 'local', dir: 'asc' })).at(-1)).toBe(4);
});

test('empata de forma estable respetando el orden de llegada', () => {
  expect(ids(sortRows(filas, { key: 'precio', dir: 'asc' }))).toEqual([1, 3, 2, 4]);
  expect(ids(sortRows(filas, { key: 'precio', dir: 'desc' }))).toEqual([2, 1, 3, 4]);
});

test('ordena numeros dentro de texto de forma natural', () => {
  const filasCodigo = [{ id: 1, codigo: 'PAGO-10' }, { id: 2, codigo: 'PAGO-2' }, { id: 3, codigo: 'PAGO-1' }];
  expect(ids(sortRows(filasCodigo, { key: 'codigo', dir: 'asc' }))).toEqual([3, 2, 1]);
});

test('ordena fechas ISO cronologicamente', () => {
  const filasFecha = [
    { id: 1, creado_en: '2026-10-28T09:00:00Z' },
    { id: 2, creado_en: '2026-10-27T23:00:00Z' },
    { id: 3, creado_en: '2026-10-29T01:00:00Z' },
  ];
  expect(ids(sortRows(filasFecha, { key: 'creado_en', dir: 'desc' }))).toEqual([3, 1, 2]);
});

test('una columna inexistente no altera el orden', () => {
  expect(ids(sortRows(filas, { key: 'nada', dir: 'asc' }))).toEqual([1, 2, 3, 4]);
});

test('el primer click ordena ascendente y el siguiente alterna', () => {
  const uno = nextSort(null, 'nombre');
  expect(uno).toEqual({ key: 'nombre', dir: 'asc' });
  const dos = nextSort(uno, 'nombre');
  expect(dos).toEqual({ key: 'nombre', dir: 'desc' });
  expect(nextSort(dos, 'nombre')).toEqual({ key: 'nombre', dir: 'asc' });
});

test('al cambiar de columna empieza en el sentido inicial de esa columna', () => {
  const actual = { key: 'nombre', dir: 'desc' };
  expect(nextSort(actual, 'precio')).toEqual({ key: 'precio', dir: 'asc' });
  expect(nextSort(actual, 'creado_en', 'desc')).toEqual({ key: 'creado_en', dir: 'desc' });
});

test('sin orden pedido no se envian parametros de orden', () => {
  expect(sortToParams(null)).toEqual({});
  expect(sortToParams(undefined)).toEqual({});
});

test('el orden pedido se traduce a los parametros del backend', () => {
  expect(sortToParams({ key: 'total_final', dir: 'desc' })).toEqual({ ordenar_por: 'total_final', sentido: 'desc' });
  expect(sortToParams({ key: 'cliente_nombre', dir: 'asc' })).toEqual({ ordenar_por: 'cliente_nombre', sentido: 'asc' });
});

test('la clave de orden cambia con la columna y el sentido para reiniciar el paginador', () => {
  expect(sortKey(null)).toBe('');
  expect(sortKey({ key: 'precio', dir: 'asc' })).not.toBe(sortKey({ key: 'precio', dir: 'desc' }));
  expect(sortKey({ key: 'precio', dir: 'asc' })).not.toBe(sortKey({ key: 'nombre', dir: 'asc' }));
  expect(sortKey({ key: 'precio', dir: 'asc' })).toBe(sortKey({ key: 'precio', dir: 'asc' }));
});
