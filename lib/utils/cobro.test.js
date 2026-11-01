import { expect, test } from 'bun:test';
import { cargosCobrables, faltaParaPagar, planearCobro, totalMarcado } from './cobro';

// Mismos casos que cuenta/cobro_test.go: la pantalla recalcula al escribir y el servidor decide lo mismo.
const CASOS_PLAN = [
  ['saldo parcial y complemento', 250, 150, true, 0, { usaSaldo: 150, falta: 100, nuevoPago: 100 }],
  ['saldo que alcanza', 250, 400, true, 0, { usaSaldo: 250, falta: 0, nuevoPago: 0 }],
  ['saldo que alcanza mas recarga', 250, 400, true, 50, { usaSaldo: 250, falta: 0, nuevoPago: 50 }],
  ['sin saldo', 250, 0, true, 0, { usaSaldo: 0, falta: 250, nuevoPago: 250 }],
  ['el cliente guarda su saldo', 250, 150, false, 0, { usaSaldo: 0, falta: 250, nuevoPago: 250 }],
  ['guarda su saldo y recarga', 250, 150, false, 100, { usaSaldo: 0, falta: 250, nuevoPago: 350 }],
  ['complemento mas recarga', 250, 150, true, 40, { usaSaldo: 150, falta: 100, nuevoPago: 140 }],
  ['centavos', 0.1 + 0.2, 0.1, true, 0, { usaSaldo: 0.1, falta: 0.2, nuevoPago: 0.2 }],
];

for (const [nombre, total, disponible, usarSaldo, recarga, esperado] of CASOS_PLAN) {
  test(`planearCobro: ${nombre}`, () => {
    const got = planearCobro(total, disponible, usarSaldo, recarga);
    expect(got.usaSaldo).toBe(esperado.usaSaldo);
    expect(got.falta).toBe(esperado.falta);
    expect(got.nuevoPago).toBe(esperado.nuevoPago);
  });
}

test('planearCobro pide metodo de pago solo si entra dinero nuevo', () => {
  expect(planearCobro(250, 400, true, 0).requiereMetodo).toBe(false);
  expect(planearCobro(250, 150, true, 0).requiereMetodo).toBe(true);
  expect(planearCobro(250, 400, true, 20).requiereMetodo).toBe(true);
  expect(planearCobro(0, 400, true, 0).requiereMetodo).toBe(false);
});

test('planearCobro ignora montos negativos o invalidos', () => {
  expect(planearCobro(-5, -10, true, -1)).toMatchObject({ total: 0, usaSaldo: 0, falta: 0, nuevoPago: 0 });
  expect(planearCobro(Number.NaN, 100, true, Number.NaN)).toMatchObject({ total: 0, usaSaldo: 0, nuevoPago: 0 });
});

test('totalMarcado suma solo los cargos marcados, en centavos', () => {
  const cargos = [
    { id: 1, pendiente: 100.1 },
    { id: 2, pendiente: 0.2 },
    { id: 3, pendiente: 400 },
  ];
  expect(totalMarcado(cargos, new Set([1, 2]))).toBe(100.3);
  expect(totalMarcado(cargos, new Set())).toBe(0);
  expect(totalMarcado(cargos, new Set([99]))).toBe(0);
});

test('cargosCobrables deja los que tienen algo pendiente, del mas antiguo al mas nuevo', () => {
  const cuenta = [
    { id: 3, concepto: 'C', monto: 50, pendiente: 50, anulado: false, fecha_hecho: '2026-10-03T12:00:00Z' },
    { id: 1, concepto: 'A', monto: 100, pendiente: 0, anulado: false, fecha_hecho: '2026-10-01T12:00:00Z' },
    { id: 2, concepto: 'B', monto: 80, pendiente: 80, anulado: true, fecha_hecho: '2026-10-02T12:00:00Z' },
    { id: 4, concepto: 'D', monto: 0, pendiente: 0, anulado: false, fecha_hecho: '2026-10-04T12:00:00Z' },
    { id: 5, concepto: 'E', monto: 70, pendiente: 70, anulado: false, fecha_hecho: '2026-10-03T12:00:00Z' },
  ];
  expect(cargosCobrables(cuenta).map((c) => c.id)).toEqual([3, 5]);
});

test('faltaParaPagar dice cuanto debe recargar el cliente para cubrir un cargo', () => {
  expect(faltaParaPagar(1000, 400)).toBe(600);
  expect(faltaParaPagar(1000, 1000)).toBe(0);
  expect(faltaParaPagar(1000, 1500)).toBe(0);
  expect(faltaParaPagar(0.3, 0.1)).toBe(0.2);
});
