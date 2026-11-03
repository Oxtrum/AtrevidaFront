import type { CrearCargoData } from '@/lib/api/cuenta';
import type { DetalleServicio } from '@/lib/api/pagos';
import { conceptoInsumo } from './cargoForm';

const aCentavos = (v: number) => Math.round((v + Number.EPSILON) * 100);

/**
 * Reparte el descuento del pago entre sus líneas en proporción a su subtotal y devuelve el monto neto de cada una.
 * La última línea absorbe el redondeo, así que los netos suman siempre subtotal menos descuento (nunca menos de 0).
 */
export function prorratearDescuento(subtotales: number[], descuento: number): number[] {
  const centavos = subtotales.map(aCentavos);
  const total = centavos.reduce((a, b) => a + b, 0);
  const aDescontar = Math.min(Math.max(aCentavos(descuento), 0), total);
  if (total === 0 || aDescontar === 0) return centavos.map((c) => c / 100);

  let repartido = 0;
  const netos = centavos.map((c, i) => {
    const descuentoLinea = i === centavos.length - 1 ? aDescontar - repartido : Math.round((c * aDescontar) / total);
    repartido += descuentoLinea;
    return Math.max(c - descuentoLinea, 0);
  });
  return netos.map((c) => c / 100);
}

type LineaDetalle = Pick<DetalleServicio, 'servicio_id' | 'item_id' | 'servicio' | 'cantidad' | 'subtotal'>;

interface OpcionesCargos {
  descuento: number;
  localId: number;
  /** Reserva que se cobra: queda ligada al primer cargo de servicio. */
  reservaId?: number | null;
  /** Dice si la línea es un paquete (la caja los distingue por su nombre). */
  esPaquete: (linea: LineaDetalle) => boolean;
  /** Plan ya creado para cada línea de paquete, por el nombre de la línea. */
  planPorLinea?: Record<string, number>;
}

/**
 * Convierte el detalle del ticket en cargos para dejar a cuenta del cliente: insumo (baja stock), paquete (ligado a su
 * plan) o servicio. El descuento se reparte entre las líneas para que los cargos sumen lo mismo que el pago.
 */
export function cargosDesdeDetalle(lineas: LineaDetalle[], opciones: OpcionesCargos): CrearCargoData[] {
  const netos = prorratearDescuento(lineas.map((l) => l.subtotal), opciones.descuento);
  let reservaPendiente = opciones.reservaId ?? undefined;
  return lineas.map((linea, i) => {
    const monto = netos[i];
    const cantidadTexto = linea.cantidad > 1 ? ` ×${linea.cantidad}` : '';
    if (linea.item_id != null) {
      return {
        tipo: 'INSUMO' as const,
        concepto: conceptoInsumo(linea.servicio, linea.cantidad),
        monto,
        local_id: opciones.localId,
        item_id: linea.item_id,
        cantidad: linea.cantidad,
      };
    }
    if (opciones.esPaquete(linea)) {
      const plan = opciones.planPorLinea?.[linea.servicio];
      return { tipo: 'PAQUETE' as const, concepto: linea.servicio, monto, local_id: opciones.localId, ...(plan ? { plan_id: plan } : {}) };
    }
    const reserva = reservaPendiente;
    reservaPendiente = undefined;
    return {
      tipo: 'SERVICIO' as const,
      concepto: `${linea.servicio}${cantidadTexto}`,
      monto,
      local_id: opciones.localId,
      ...(reserva ? { reserva_id: reserva } : {}),
    };
  });
}
