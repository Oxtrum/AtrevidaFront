// Calculo del cobro de caja. Es el mismo que hace el servidor (cuenta/cobro.go, PlanearCobro): la pantalla lo repite
// al escribir para mostrar el resultado al instante, pero el servidor siempre decide. Todo en centavos enteros.

const aCentavos = (monto: number): number => (Number.isFinite(monto) ? Math.round(monto * 100) : 0);
const desdeCentavos = (centavos: number): number => centavos / 100;

export interface ResumenCobro {
  /** Total de los cargos marcados. */
  total: number;
  /** Lo que se descuenta del saldo disponible del cliente. */
  usaSaldo: number;
  /** Lo que el cliente paga ahora con un metodo de pago. */
  falta: number;
  /** Dinero nuevo que entra: lo que falta mas la recarga. */
  nuevoPago: number;
  /** Solo se pide metodo de pago si entra dinero nuevo. */
  requiereMetodo: boolean;
}

/**
 * Cuanto sale del saldo, cuanto falta pagar y cuanto dinero nuevo entra. Si el cliente prefiere guardar su saldo,
 * `usarSaldo` es false y todo se paga con dinero nuevo.
 */
export function planearCobro(total: number, disponible: number, usarSaldo: boolean, recarga: number): ResumenCobro {
  const t = Math.max(0, aCentavos(total));
  const d = Math.max(0, aCentavos(disponible));
  const r = Math.max(0, aCentavos(recarga));
  const usa = usarSaldo ? Math.min(d, t) : 0;
  const falta = t - usa;
  const nuevo = falta + r;
  return {
    total: desdeCentavos(t),
    usaSaldo: desdeCentavos(usa),
    falta: desdeCentavos(falta),
    nuevoPago: desdeCentavos(nuevo),
    requiereMetodo: nuevo > 0,
  };
}

/** Suma lo pendiente de los cargos marcados. */
export function totalMarcado(cargos: { id: number; pendiente: number }[], marcados: ReadonlySet<number>): number {
  let centavos = 0;
  for (const c of cargos) {
    if (marcados.has(c.id)) centavos += aCentavos(c.pendiente);
  }
  return desdeCentavos(centavos);
}

interface CargoDeCuenta {
  id: number;
  pendiente: number;
  anulado: boolean;
  fecha_hecho: string;
}

/** Cargos que se pueden cobrar: vigentes y con algo pendiente, del mas antiguo al mas nuevo. */
export function cargosCobrables<T extends CargoDeCuenta>(cargos: readonly T[]): T[] {
  return cargos
    .filter((c) => !c.anulado && aCentavos(c.pendiente) > 0)
    .sort((a, b) => {
      const porFecha = new Date(a.fecha_hecho).getTime() - new Date(b.fecha_hecho).getTime();
      return porFecha !== 0 ? porFecha : a.id - b.id;
    });
}

/** Cuanto le falta recargar al cliente para poder pagar un cargo con su saldo disponible. */
export function faltaParaPagar(pendiente: number, disponible: number): number {
  return desdeCentavos(Math.max(0, aCentavos(pendiente) - Math.max(0, aCentavos(disponible))));
}
