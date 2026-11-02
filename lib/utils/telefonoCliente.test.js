import { expect, test } from 'bun:test';
import { telefonosDistintos } from './telefonoCliente';

const reserva = { telefono_e164: '+59163639584', numero_telefono: '63639584' };

test('mismo telefono: no hay nada que actualizar', () => {
  expect(telefonosDistintos({ telefono_e164: '+59163639584', numero_telefono: '63639584' }, reserva)).toBe(false);
});

test('el formato no importa: se compara el numero completo', () => {
  expect(telefonosDistintos({ telefono_e164: null, numero_telefono: '63639584' }, reserva)).toBe(false);
});

test('telefonos distintos: se ofrece actualizar', () => {
  expect(telefonosDistintos({ telefono_e164: '+59171717171', numero_telefono: '71717171' }, reserva)).toBe(true);
});

test('un cliente sin telefono: se ofrece ponerle el de la reserva', () => {
  expect(telefonosDistintos({ telefono_e164: null, numero_telefono: '' }, reserva)).toBe(true);
});

test('una reserva sin telefono no ofrece nada', () => {
  expect(telefonosDistintos({ telefono_e164: '+59171717171', numero_telefono: '71717171' }, { telefono_e164: null, numero_telefono: '' })).toBe(false);
});
