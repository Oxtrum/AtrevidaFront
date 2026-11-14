import { expect, test } from 'bun:test';
import { errorDeClienteDeReserva } from './reservaCliente';

const base = { esAdmin: true, editando: false, clienteIdOriginal: null, clienteId: null };

test('el cliente registrado es opcional', () => {
  expect(errorDeClienteDeReserva(base)).toBeNull();
  expect(errorDeClienteDeReserva({ ...base, clienteId: 7 })).toBeNull();
});

test('editar una reserva sin cliente no obliga a vincularlo', () => {
  expect(errorDeClienteDeReserva({ ...base, editando: true })).toBeNull();
});

test('una reserva que ya tenia cliente no se desvincula: hay que volver a elegir uno', () => {
  expect(errorDeClienteDeReserva({ ...base, editando: true, clienteIdOriginal: 5 })).toBe('Elige un cliente de la lista o crea uno nuevo');
  expect(errorDeClienteDeReserva({ ...base, editando: true, clienteIdOriginal: 5, clienteId: 5 })).toBeNull();
});

test('el formulario publico no usa esta regla', () => {
  expect(errorDeClienteDeReserva({ ...base, esAdmin: false })).toBeNull();
});
