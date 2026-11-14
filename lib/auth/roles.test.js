import { expect, test } from 'bun:test';
import { esRolGlobal, etiquetaRol } from './roles';

test('el rol gerencia se muestra como Recepción', () => {
  expect(etiquetaRol('gerencia')).toBe('Recepción');
  expect(etiquetaRol('Gerencia')).toBe('Recepción');
});

test('admin_sys y coordinacion no llevan local; gerencia si', () => {
  expect(esRolGlobal('admin_sys')).toBe(true);
  expect(esRolGlobal('Coordinacion')).toBe(true);
  expect(esRolGlobal('gerencia')).toBe(false);
  expect(esRolGlobal(null)).toBe(false);
});

test('los demas roles tienen su nombre y uno desconocido no rompe', () => {
  expect(etiquetaRol('admin_sys')).toBe('Administrador de sistema');
  expect(etiquetaRol('admin')).toBe('Administrador');
  expect(etiquetaRol('coordinacion')).toBe('Coordinadora');
  expect(etiquetaRol('auditor')).toBe('auditor');
  expect(etiquetaRol('')).toBe('Sin rol');
  expect(etiquetaRol(null)).toBe('Sin rol');
});
