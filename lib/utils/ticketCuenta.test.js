import { describe, expect, test } from 'bun:test';
import { metodoValido, resumenTicket } from './ticketCuenta';

const base = { ventas: 100, cargosAnteriores: 0, recarga: 0, disponible: 0 };

describe('resumen del ticket de caja', () => {
  test('con un método normal paga todo ahora y no toca la cuenta', () => {
    const r = resumenTicket({ ...base, disponible: 500, metodo: 'efectivo' });
    expect(r).toMatchObject({ total: 100, usaSaldo: 0, aPagarAhora: 100, esACuenta: false, usaCuenta: false, requiereMetodoResto: false });
  });
  test('con saldo suficiente no entra dinero nuevo', () => {
    const r = resumenTicket({ ...base, disponible: 500, metodo: 'saldo' });
    expect(r).toMatchObject({ usaSaldo: 100, aPagarAhora: 0, usaCuenta: true, requiereMetodoResto: false });
  });
  test('con saldo insuficiente el resto se paga con otro método', () => {
    const r = resumenTicket({ ...base, disponible: 30, metodo: 'saldo' });
    expect(r).toMatchObject({ usaSaldo: 30, aPagarAhora: 70, requiereMetodoResto: true });
  });
  test('a cuenta no mueve dinero ni saldo', () => {
    const r = resumenTicket({ ...base, disponible: 500, metodo: 'a_cuenta' });
    expect(r).toMatchObject({ usaSaldo: 0, aPagarAhora: 0, esACuenta: true, usaCuenta: true });
  });
  test('cobrar deudas anteriores suma al total y obliga a pasar por la cuenta', () => {
    const r = resumenTicket({ ...base, cargosAnteriores: 50, metodo: 'qr' });
    expect(r).toMatchObject({ total: 150, aPagarAhora: 150, usaCuenta: true });
  });
  test('la recarga es dinero nuevo aparte del total', () => {
    const r = resumenTicket({ ...base, ventas: 0, recarga: 200, metodo: 'efectivo' });
    expect(r).toMatchObject({ total: 0, aPagarAhora: 200, usaCuenta: true });
  });
  test('saldo con recarga: el saldo cubre el total y la recarga entra como dinero nuevo', () => {
    const r = resumenTicket({ ...base, disponible: 500, recarga: 40, metodo: 'saldo' });
    expect(r).toMatchObject({ usaSaldo: 100, aPagarAhora: 40, requiereMetodoResto: true });
  });
});

describe('qué métodos se pueden elegir', () => {
  const ctx = { hayCliente: true, disponible: 150, total: 100, cargosAnteriores: 0, recarga: 0 };
  test('los cuatro métodos siempre valen', () => {
    for (const m of ['efectivo', 'tarjeta', 'qr', 'transferencia']) expect(metodoValido(m, { ...ctx, hayCliente: false, disponible: 0 })).toBe(true);
  });
  test('saldo vale solo si el saldo cubre todo el total', () => {
    expect(metodoValido('saldo', ctx)).toBe(true);
    expect(metodoValido('saldo', { ...ctx, disponible: 100 })).toBe(true);
    expect(metodoValido('saldo', { ...ctx, disponible: 99.99 })).toBe(false);
    expect(metodoValido('saldo', { ...ctx, disponible: 0 })).toBe(false);
  });
  test('saldo pide cliente, un total por pagar y que no haya recarga', () => {
    expect(metodoValido('saldo', { ...ctx, hayCliente: false })).toBe(false);
    expect(metodoValido('saldo', { ...ctx, total: 0 })).toBe(false);
    expect(metodoValido('saldo', { ...ctx, recarga: 20 })).toBe(false);
  });
  test('a cuenta pide cliente y no vale con recarga ni con deudas anteriores', () => {
    expect(metodoValido('a_cuenta', ctx)).toBe(true);
    expect(metodoValido('a_cuenta', { ...ctx, hayCliente: false })).toBe(false);
    expect(metodoValido('a_cuenta', { ...ctx, recarga: 10 })).toBe(false);
    expect(metodoValido('a_cuenta', { ...ctx, cargosAnteriores: 10 })).toBe(false);
  });
});
