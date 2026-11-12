import { expect, test } from 'bun:test';
import { validarRestablecerPassword } from './restablecerPassword';

test('exige la nueva contraseña y su confirmacion', () => {
  expect(validarRestablecerPassword('', '')).toEqual({ nueva: 'La nueva contraseña es obligatoria', confirmar: 'Confirma la nueva contraseña' });
  expect(validarRestablecerPassword('Nueva123', '')).toEqual({ confirmar: 'Confirma la nueva contraseña' });
});

test('las dos contraseñas deben coincidir', () => {
  expect(validarRestablecerPassword('Nueva123', 'Nueva124')).toEqual({ confirmar: 'Las contraseñas no coinciden' });
});

test('sin errores devuelve un objeto vacio', () => {
  expect(validarRestablecerPassword('Nueva123', 'Nueva123')).toEqual({});
});
