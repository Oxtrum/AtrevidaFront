import { expect, test } from 'bun:test';
import { hayFiltrosActivos } from './filtros';

test('sin valores o con todo vacio no hay filtros activos', () => {
  expect(hayFiltrosActivos([])).toBe(false);
  expect(hayFiltrosActivos(['', '  ', undefined, null, false])).toBe(false);
});

test('un solo valor con contenido activa el filtro', () => {
  expect(hayFiltrosActivos(['', 'ana'])).toBe(true);
  expect(hayFiltrosActivos([3])).toBe(true);
  expect(hayFiltrosActivos([true])).toBe(true);
});

test('el cero cuenta como un valor elegido', () => {
  expect(hayFiltrosActivos([0])).toBe(true);
});
