import { expect, test } from 'bun:test';
import { ATENCION_ESTADO, estadoDeAtencion, estadoDeJornada, estadoDeResultado, estadoDeSeguimiento } from './atencionEstado';

test('cada estado tiene etiqueta corta y tono', () => {
  for (const meta of Object.values(ATENCION_ESTADO)) {
    expect(meta.label.length).toBeGreaterThan(0);
    expect(['success', 'warning', 'danger', 'info', 'neutral']).toContain(meta.tone);
  }
});

test('jornada: la cancelacion por inasistencia es su propio estado', () => {
  expect(estadoDeJornada({ estado_operativo: 'PROGRAMADA' })).toBe('PROGRAMADA');
  expect(estadoDeJornada({ estado_operativo: 'CANCELADA' })).toBe('CANCELADA');
  expect(estadoDeJornada({ estado_operativo: 'CANCELADA', motivo_cancelacion_tipo: 'INASISTENCIA' })).toBe('INASISTENCIA');
  expect(estadoDeJornada({ estado_operativo: 'PENDIENTE_CIERRE' })).toBe('PENDIENTE_CIERRE');
});

test('seguimiento: cada tipo cae en un estado comun', () => {
  expect(estadoDeSeguimiento('DEDUCCION_PENDIENTE')).toBe('STOCK_PENDIENTE');
  expect(estadoDeSeguimiento('CANCELACION')).toBe('CANCELADA');
  expect(estadoDeSeguimiento('INASISTENCIA')).toBe('INASISTENCIA');
  expect(estadoDeSeguimiento('PENDIENTE_CIERRE')).toBe('PENDIENTE_CIERRE');
});

test('atencion hecha: con stock pendiente se avisa, si no es atendida', () => {
  expect(estadoDeAtencion({ insumos_pendientes: 2 })).toBe('STOCK_PENDIENTE');
  expect(estadoDeAtencion({ insumos_pendientes: 0 })).toBe('ATENDIDA');
});

test('un estado desconocido no rompe la fila', () => {
  expect(estadoDeJornada({ estado_operativo: 'RARO' })).toBe('RARO');
  expect(ATENCION_ESTADO.RARO).toBeUndefined();
});

test('historial: el resultado de una atencion cerrada cae en un estado comun', () => {
  expect(estadoDeResultado({ resultado: 'ATENDIDA' })).toBe('ATENDIDA');
  expect(estadoDeResultado({ resultado: 'CANCELADA' })).toBe('CANCELADA');
  expect(estadoDeResultado({ resultado: 'CANCELADA', motivo_cancelacion_tipo: 'INASISTENCIA' })).toBe('INASISTENCIA');
});
