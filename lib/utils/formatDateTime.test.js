import { expect, test } from 'bun:test';
import { formatFecha } from './formatDateTime';

test('una noche en hora local no salta al dia siguiente', () => {
  // Se arma en hora local: 28/10/2026 21:30, sea cual sea la zona del equipo.
  const iso = new Date(2026, 9, 28, 21, 30).toISOString();
  expect(formatFecha(iso)).toBe('28/10/2026');
});

test('sin fecha o con fecha invalida muestra un guion', () => {
  expect(formatFecha(null)).toBe('—');
  expect(formatFecha(undefined)).toBe('—');
  expect(formatFecha('no es fecha')).toBe('—');
});
