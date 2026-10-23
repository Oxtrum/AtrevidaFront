import { expect, test } from 'bun:test';
import { mostrarSeccionPaquetes, resumenVisibilidad } from './visibilidadPublica';

test('la seccion de paquetes se muestra salvo que el backend diga false', () => {
  expect(mostrarSeccionPaquetes({ mostrar_paquetes: false })).toBe(false);
  expect(mostrarSeccionPaquetes({ mostrar_paquetes: true })).toBe(true);
});

test('si no hay respuesta o falta el dato no se oculta la seccion por error', () => {
  expect(mostrarSeccionPaquetes(null)).toBe(true);
  expect(mostrarSeccionPaquetes(undefined)).toBe(true);
  expect(mostrarSeccionPaquetes({})).toBe(true);
});

const p = (visible) => ({ paquete: { visible_publico: visible } });

test('resumen cuenta visibles y ocultos; un paquete sin dato cuenta como visible', () => {
  expect(resumenVisibilidad([p(true), p(false), p(undefined), p(false)])).toEqual({ visibles: 2, ocultos: 2 });
  expect(resumenVisibilidad([])).toEqual({ visibles: 0, ocultos: 0 });
});
