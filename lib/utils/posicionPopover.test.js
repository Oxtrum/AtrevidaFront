import { describe, expect, test } from 'bun:test';
import { posicionPopover } from './posicionPopover';

const pantalla = { width: 1200, height: 800 };
const pop = { width: 336, height: 200 };
const ancla = (left, top) => ({ left, right: left + 120, top, bottom: top + 24 });

describe('posicionPopover', () => {
  test('sale debajo del nombre, alineado a su borde izquierdo', () => {
    expect(posicionPopover(ancla(100, 100), pop, pantalla)).toEqual({ left: 100, top: 132, lugar: 'abajo' });
  });

  test('sube cuando abajo no hay lugar y arriba si', () => {
    const r = posicionPopover(ancla(100, 700), pop, pantalla);
    expect(r.lugar).toBe('arriba');
    expect(r.top).toBe(700 - 8 - 200);
  });

  test('no se sale por la derecha', () => {
    const r = posicionPopover(ancla(1100, 100), pop, pantalla);
    expect(r.left).toBe(1200 - 336 - 12);
  });

  test('no se sale por la izquierda', () => {
    expect(posicionPopover(ancla(2, 100), pop, pantalla).left).toBe(12);
  });

  test('si no cabe ni arriba ni abajo, usa el lado con mas espacio sin salirse de la pantalla', () => {
    const baja = { width: 1200, height: 300 };
    const r = posicionPopover(ancla(100, 140), { width: 336, height: 280 }, baja);
    expect(r.top).toBeGreaterThanOrEqual(12);
    expect(['abajo', 'arriba']).toContain(r.lugar);
  });
});
