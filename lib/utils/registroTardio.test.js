import { expect, test } from 'bun:test';
import { registradoOtroDia } from './registroTardio';

test('mismo dia no es registro tardio', () => {
  expect(registradoOtroDia('2026-10-28T10:00:00', '2026-10-28T21:30:00')).toBe(false);
});

test('otro dia si lo es, aunque pasen pocas horas', () => {
  expect(registradoOtroDia('2026-10-28T23:50:00', '2026-10-29T00:10:00')).toBe(true);
  expect(registradoOtroDia('2026-10-25T12:00:00', '2026-10-28T21:30:00')).toBe(true);
});

test('sin fecha de registro o con fechas invalidas no se avisa', () => {
  expect(registradoOtroDia('2026-10-28T10:00:00', undefined)).toBe(false);
  expect(registradoOtroDia('2026-10-28T10:00:00', null)).toBe(false);
  expect(registradoOtroDia('no es fecha', '2026-10-28T10:00:00')).toBe(false);
});
