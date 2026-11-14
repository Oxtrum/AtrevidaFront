import { planearCobro } from './cobro';
import type { TipoPago } from './tipoPago';

/** Cómo paga el cliente: uno de los cuatro métodos, con su saldo disponible, o lo deja a cuenta. */
export type MetodoCaja = TipoPago | 'saldo' | 'a_cuenta';

export interface EntradaTicket {
  /** Ventas nuevas del ticket, con el descuento ya aplicado. */
  ventas: number;
  /** Deudas anteriores del cliente que se pagan en este ticket. */
  cargosAnteriores: number;
  /** Dinero que el cliente deja como saldo disponible. */
  recarga: number;
  /** Saldo disponible del cliente (0 si no hay cliente). */
  disponible: number;
  metodo: MetodoCaja;
}

export interface ResumenTicket {
  /** Ventas más deudas anteriores; la recarga no entra aquí. */
  total: number;
  /** Lo que se descuenta del saldo del cliente. */
  usaSaldo: number;
  /** Dinero nuevo que entra: lo que falta del total más la recarga. */
  aPagarAhora: number;
  esACuenta: boolean;
  /** true si el ticket pasa por la cuenta del cliente (cargos y cobro) en lugar de ser una venta normal. */
  usaCuenta: boolean;
  /** Con saldo y dinero nuevo por pagar hay que elegir con qué se paga el resto. */
  requiereMetodoResto: boolean;
}

/**
 * Qué pasa con el dinero según cómo paga. Un método normal paga todo ahora y no toca la cuenta (venta de mostrador);
 * saldo descuenta primero lo disponible; a cuenta no mueve dinero y deja el total como deuda.
 */
export function resumenTicket(e: EntradaTicket): ResumenTicket {
  const total = Math.round((e.ventas + e.cargosAnteriores) * 100) / 100;
  const esACuenta = e.metodo === 'a_cuenta';
  const conSaldo = e.metodo === 'saldo';
  const plan = planearCobro(total, e.disponible, conSaldo, esACuenta ? 0 : e.recarga);
  return {
    total,
    usaSaldo: plan.usaSaldo,
    aPagarAhora: esACuenta ? 0 : plan.nuevoPago,
    esACuenta,
    usaCuenta: esACuenta || conSaldo || e.cargosAnteriores > 0 || e.recarga > 0,
    requiereMetodoResto: conSaldo && plan.nuevoPago > 0,
  };
}

interface ContextoMetodo {
  hayCliente: boolean;
  disponible: number;
  /** Ventas más deudas anteriores del ticket, sin la recarga. */
  total: number;
  cargosAnteriores: number;
  recarga: number;
}

/**
 * Saldo vale si hay cliente y su saldo cubre todo el total (sin recarga de por medio); a cuenta pide cliente y no vale
 * si el ticket paga deudas anteriores o recarga. Los cuatro métodos siempre valen.
 */
export function metodoValido(metodo: MetodoCaja, c: ContextoMetodo): boolean {
  if (metodo === 'saldo') return c.hayCliente && c.total > 0 && c.recarga <= 0 && Math.round(c.disponible * 100) >= Math.round(c.total * 100);
  if (metodo === 'a_cuenta') return c.hayCliente && c.cargosAnteriores <= 0 && c.recarga <= 0;
  return true;
}
