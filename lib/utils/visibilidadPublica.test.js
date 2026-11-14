import { expect, test } from 'bun:test';
import { mostrarSeccionPaquetes, textosVisibilidadPaquete } from './visibilidadPublica';

test('la seccion de paquetes se muestra salvo que el backend diga false', () => {
  expect(mostrarSeccionPaquetes({ mostrar_paquetes: false })).toBe(false);
  expect(mostrarSeccionPaquetes({ mostrar_paquetes: true })).toBe(true);
});

test('si no hay respuesta o falta el dato no se oculta la seccion por error', () => {
  expect(mostrarSeccionPaquetes(null)).toBe(true);
  expect(mostrarSeccionPaquetes(undefined)).toBe(true);
  expect(mostrarSeccionPaquetes({})).toBe(true);
});

test('los textos de visibilidad de un paquete explican el efecto de cada estado', () => {
  const visible = textosVisibilidadPaquete(true);
  expect(visible.chip).toBe('En página principal');
  expect(visible.accion).toBe('Ocultar de la página principal');
  expect(visible.ayuda).toContain('sigue disponible');

  const oculto = textosVisibilidadPaquete(false);
  expect(oculto.chip).toBe('Oculto al público');
  expect(oculto.accion).toBe('Mostrar en la página principal');
  expect(oculto.ayuda).toContain('no aparece');

  // Un paquete sin el dato (backend anterior) cuenta como visible.
  expect(textosVisibilidadPaquete(undefined).chip).toBe('En página principal');
});
