import { describe, expect, test } from 'bun:test';
import { esCobrable, etiquetaCobro, faltaPagar, ordenarCobrables } from './reservasCobrables';

const hoy = '2026-11-02';
const r = (extra) => ({ id: 1, fecha: hoy, hora_desde: '10:00', estado: 'AGENDADO', ...extra });

describe('reservas que se pueden cobrar desde caja', () => {
  test('una completada sin cobro, y una agendada sin paquete, se cobran', () => {
    expect(esCobrable(r({ estado: 'COMPLETADO', estado_cobro: 'POR_COBRAR' }))).toBe(true);
    expect(esCobrable(r({ estado: 'AGENDADO' }))).toBe(true);
  });
  test('no se cobran las ya cobradas, las cubiertas por paquete ni las pendientes o rechazadas', () => {
    expect(esCobrable(r({ estado: 'COMPLETADO', estado_cobro: 'COBRADA' }))).toBe(false);
    expect(esCobrable(r({ estado: 'COMPLETADO', estado_cobro: 'CUBIERTA_PAQUETE' }))).toBe(false);
    expect(esCobrable(r({ estado: 'AGENDADO', plan_id: 9 }))).toBe(false);
    expect(esCobrable(r({ estado: 'PENDIENTE' }))).toBe(false);
    expect(esCobrable(r({ estado: 'RECHAZADO' }))).toBe(false);
  });
  test('etiqueta: completada, de hoy, atrasada o adelantada', () => {
    expect(etiquetaCobro(r({ estado: 'COMPLETADO' }), hoy)).toBe('COMPLETADA');
    expect(etiquetaCobro(r({ fecha: hoy }), hoy)).toBe('HOY');
    expect(etiquetaCobro(r({ fecha: '2026-11-01' }), hoy)).toBe('ATRASADA');
    expect(etiquetaCobro(r({ fecha: '2026-11-09' }), hoy)).toBe('ADELANTADA');
  });
  test('ordena: completadas, hoy, atrasadas y adelantadas; dentro de cada grupo por fecha y hora', () => {
    const lista = [
      r({ id: 1, fecha: '2026-11-09', hora_desde: '09:00' }),
      r({ id: 2, fecha: hoy, hora_desde: '15:00' }),
      r({ id: 3, estado: 'COMPLETADO', fecha: '2026-10-30', hora_desde: '08:00' }),
      r({ id: 4, fecha: hoy, hora_desde: '09:00' }),
      r({ id: 5, fecha: '2026-11-01', hora_desde: '11:00' }),
    ];
    expect(ordenarCobrables(lista, hoy).map((x) => x.id)).toEqual([3, 4, 2, 5, 1]);
  });
  test('no modifica la lista original', () => {
    const lista = [r({ id: 1, fecha: '2026-11-09' }), r({ id: 2 })];
    ordenarCobrables(lista, hoy);
    expect(lista.map((x) => x.id)).toEqual([1, 2]);
  });
});

describe('todas las reservas de un cliente que faltan por pagar', () => {
  test('incluye agendadas (también olvidadas o futuras), pendientes y canceladas', () => {
    for (const estado of ['AGENDADO', 'PENDIENTE', 'RECHAZADO']) expect(faltaPagar(r({ estado }))).toBe(true);
    expect(faltaPagar(r({ estado: 'AGENDADO', fecha: '2026-10-01' }))).toBe(true);
  });
  test('incluye la completada sin cobro y excluye la ya cobrada o cubierta por paquete', () => {
    expect(faltaPagar(r({ estado: 'COMPLETADO', estado_cobro: 'POR_COBRAR' }))).toBe(true);
    expect(faltaPagar(r({ estado: 'COMPLETADO', estado_cobro: 'COBRADA' }))).toBe(false);
    expect(faltaPagar(r({ estado: 'COMPLETADO', estado_cobro: 'CUBIERTA_PAQUETE' }))).toBe(false);
    expect(faltaPagar(r({ estado: 'AGENDADO', plan_id: 3 }))).toBe(false);
  });
  test('etiqueta pendiente y cancelada, que van al final', () => {
    expect(etiquetaCobro(r({ estado: 'PENDIENTE' }), hoy)).toBe('PENDIENTE');
    expect(etiquetaCobro(r({ estado: 'RECHAZADO' }), hoy)).toBe('CANCELADA');
    const lista = [r({ id: 1, estado: 'RECHAZADO' }), r({ id: 2, estado: 'PENDIENTE' }), r({ id: 3, fecha: '2026-11-09' }), r({ id: 4, estado: 'COMPLETADO' })];
    expect(ordenarCobrables(lista, hoy).map((x) => x.id)).toEqual([4, 3, 2, 1]);
  });
});
