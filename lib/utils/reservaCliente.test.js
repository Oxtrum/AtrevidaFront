import { expect, test } from 'bun:test';
import { errorDeClienteDeReserva } from './reservaCliente';

const base = { esAdmin: true, editando: false, aprobando: false, clienteIdOriginal: null, clienteId: null, sinRegistrar: false, nombre: 'Maria' };

test('el panel exige elegir o crear un cliente al reservar', () => {
  expect(errorDeClienteDeReserva(base)).toBe('Elige un cliente de la lista o crea uno nuevo');
  expect(errorDeClienteDeReserva({ ...base, clienteId: 7 })).toBeNull();
});

test('un cliente de una sola visita se reserva sin registrar, solo con su nombre', () => {
  expect(errorDeClienteDeReserva({ ...base, sinRegistrar: true })).toBeNull();
  expect(errorDeClienteDeReserva({ ...base, sinRegistrar: true, nombre: '   ' })).toBe('Escribe el nombre del cliente');
});

test('tambien se puede aprobar una solicitud sin registrar al cliente', () => {
  expect(errorDeClienteDeReserva({ ...base, editando: true, aprobando: true, sinRegistrar: true })).toBeNull();
  expect(errorDeClienteDeReserva({ ...base, editando: true, aprobando: true })).toBe('Elige un cliente de la lista o crea uno nuevo');
});

test('editar una reserva vieja sin cliente no obliga a vincularlo', () => {
  expect(errorDeClienteDeReserva({ ...base, editando: true })).toBeNull();
});

test('si la reserva ya tenia cliente y se escribio encima, hay que volver a elegir uno', () => {
  expect(errorDeClienteDeReserva({ ...base, editando: true, clienteIdOriginal: 5 })).toBe('Elige un cliente de la lista o crea uno nuevo');
  expect(errorDeClienteDeReserva({ ...base, editando: true, clienteIdOriginal: 5, clienteId: 5 })).toBeNull();
});

test('el formulario publico no pide cliente registrado', () => {
  expect(errorDeClienteDeReserva({ ...base, esAdmin: false })).toBeNull();
});
