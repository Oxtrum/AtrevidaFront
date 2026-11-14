import { expect, test } from 'bun:test';
import { recortarConPrioridad } from './recortarConPrioridad';

const esPar = (n) => n % 2 === 0;

test('no recorta si la lista cabe', () => {
  expect(recortarConPrioridad([1, 2, 3], 3)).toEqual([1, 2, 3]);
  expect(recortarConPrioridad([1, 2], 5, esPar)).toEqual([1, 2]);
});

test('sin prioridad se queda con los primeros', () => {
  expect(recortarConPrioridad([1, 2, 3, 4, 5], 3)).toEqual([1, 2, 3]);
});

test('conserva los prioritarios aunque esten al final y completa con los primeros', () => {
  expect(recortarConPrioridad([1, 3, 5, 7, 2, 4], 4, esPar)).toEqual([1, 3, 2, 4]);
});

test('mantiene el orden original', () => {
  expect(recortarConPrioridad([2, 1, 4, 3, 6, 5], 3, esPar)).toEqual([2, 4, 6]);
});

test('si hay mas prioritarios que el maximo devuelve todos los prioritarios', () => {
  expect(recortarConPrioridad([2, 1, 4, 3, 6, 8], 2, esPar)).toEqual([2, 4, 6, 8]);
});

test('no modifica la lista original', () => {
  const lista = [1, 2, 3, 4];
  recortarConPrioridad(lista, 2, esPar);
  expect(lista).toEqual([1, 2, 3, 4]);
});
