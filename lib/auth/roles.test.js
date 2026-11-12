import { expect, test } from 'bun:test';
import { etiquetaRol } from './roles';

test('el rol gerencia se muestra como Recepción', () => {
  expect(etiquetaRol('gerencia')).toBe('Recepción');
  expect(etiquetaRol('Gerencia')).toBe('Recepción');
});

test('los demas roles tienen su nombre y uno desconocido no rompe', () => {
  expect(etiquetaRol('admin_sys')).toBe('Administrador de sistema');
  expect(etiquetaRol('admin')).toBe('Administrador');
  expect(etiquetaRol('auditor')).toBe('auditor');
  expect(etiquetaRol('')).toBe('Sin rol');
  expect(etiquetaRol(null)).toBe('Sin rol');
});
