import { expect, test } from 'bun:test';
import { filtrarErroresResueltos } from './erroresResueltos';

const vacio = {
  sucursal: '', dia: null, servicio: '', cliente: '',
  numeroTelefono: '', telefonoE164: undefined, horaDesde: '', horaHasta: '',
};
const todos = {
  sucursal: 'Sucursal req', fecha: 'Elige el día', servicio: 'Selecciona un servicio',
  cliente: 'Ingresa el nombre', numeroTelefono: 'Ingresa el teléfono',
  horaDesde: 'Selecciona hora de inicio',
};

test('con los campos aún vacíos todos los errores se mantienen', () => {
  expect(filtrarErroresResueltos(todos, vacio)).toEqual(todos);
});

test('cada error desaparece al completar su campo', () => {
  const out = filtrarErroresResueltos(todos, {
    sucursal: 'Centro', dia: 'LUNES', servicio: 'x', cliente: ' Ana ',
    numeroTelefono: '77777777', telefonoE164: '+59177777777',
    horaDesde: '08:00', horaHasta: '09:00',
  });
  expect(out).toEqual({});
});

test('un teléfono incompleto sigue marcado; solo cae al ser válido', () => {
  const e = { numeroTelefono: 'x' };
  expect(filtrarErroresResueltos(e, { ...vacio, numeroTelefono: '123' })).toEqual(e);
  expect(filtrarErroresResueltos(e, { ...vacio, numeroTelefono: '7777777', telefonoE164: '+5917777777' })).toEqual({});
});

test('un nombre solo con espacios no resuelve el error', () => {
  const e = { cliente: 'x' };
  expect(filtrarErroresResueltos(e, { ...vacio, cliente: '   ' })).toEqual(e);
});
