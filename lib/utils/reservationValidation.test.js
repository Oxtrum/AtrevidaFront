import { expect, test } from 'bun:test';
import { validateReservationForm } from './reservationValidation';

// Como el cliente puede reservar sin estar registrado, el teléfono es lo único con lo que se le puede contactar.
const validar = (numeroTelefono, cliente = 'Maria') =>
  validateReservationForm('SAN MARTIN', '2030-05-14', cliente, numeroTelefono, 'Masaje', '10:00', '11:00', undefined, true);

test('el telefono es obligatorio en el panel, con o sin cliente registrado', () => {
  expect(validar('').numeroTelefono).toBe('Ingresa el teléfono del cliente');
  expect(validar('   ').numeroTelefono).toBe('Ingresa el teléfono del cliente');
});

test('el telefono necesita al menos 7 digitos', () => {
  expect(validar('123').numeroTelefono).toBe('Ingresa al menos 7 dígitos del teléfono');
  expect(validar('70011223').numeroTelefono).toBeUndefined();
});

test('el nombre tambien es obligatorio', () => {
  expect(validar('70011223', '  ').cliente).toBe('Ingresa el nombre del cliente');
});
