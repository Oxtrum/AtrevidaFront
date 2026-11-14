import { expect, test } from 'bun:test';
import { cargarReservaVinculada } from './reservaVinculada';

test('devuelve la reserva de la respuesta', async () => {
  const reserva = { id: 7, cliente: 'Ana' };
  const out = await cargarReservaVinculada(7, async (id) => ({ data: { reserva: { ...reserva, id } } }));
  expect(out).toEqual(reserva);
});

test('si la respuesta no trae reserva, falla con un mensaje claro', async () => {
  await expect(cargarReservaVinculada(9, async () => ({ data: undefined }))).rejects.toThrow('No se encontró la reserva vinculada.');
});
