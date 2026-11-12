import { expect, test } from 'bun:test';
import { tituloSaludo } from './saludo';

test('el saludo lleva el nombre de quien entro, con la primera letra en mayuscula', () => {
  expect(tituloSaludo('Buenas noches', 'recepcion')).toEqual({ title: 'Buenas noches, Recepcion', accentWord: 'Recepcion' });
  expect(tituloSaludo('Buenos días', ' admin ')).toEqual({ title: 'Buenos días, Admin', accentWord: 'Admin' });
});

test('sin nombre saluda solo, sin inventar uno', () => {
  expect(tituloSaludo('Buenas tardes', null)).toEqual({ title: 'Buenas tardes', accentWord: 'Buenas tardes' });
  expect(tituloSaludo('Buenas tardes', '  ')).toEqual({ title: 'Buenas tardes', accentWord: 'Buenas tardes' });
});
