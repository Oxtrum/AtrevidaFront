import { describe, expect, test } from 'bun:test';
import { desajusteDuracion } from './slotRange';

describe('aviso de duración distinta a la del servicio', () => {
  test('no avisa cuando el rango dura lo que el servicio', () => {
    expect(desajusteDuracion(1, '08:30', '09:00')).toBeNull();
    expect(desajusteDuracion(2, '08:30', '09:30')).toBeNull();
  });
  test('avisa de un rango mucho más largo: 30 min en 10 h 30 min', () => {
    expect(desajusteDuracion(1, '08:30', '19:00')).toEqual({
      horaDesde: '08:30',
      horaHasta: '19:00',
      duracionServicio: '30 min',
      duracionElegida: '10 h 30 min',
      esMasLargo: true,
      bloquesDiferencia: 20,
    });
  });
  test('avisa de un rango más corto', () => {
    const aviso = desajusteDuracion(3, '10:00', '11:00');
    expect(aviso?.esMasLargo).toBe(false);
    expect(aviso?.bloquesDiferencia).toBe(1);
  });
  test('sin horas completas no avisa', () => {
    expect(desajusteDuracion(1, '', '09:00')).toBeNull();
    expect(desajusteDuracion(1, '09:00', '')).toBeNull();
    expect(desajusteDuracion(1, '10:00', '09:00')).toBeNull();
  });
});
