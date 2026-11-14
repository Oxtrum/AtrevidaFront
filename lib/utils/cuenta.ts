import type { BadgeTone } from '@/components/AdminConfig/StatusBadge';
import { etiquetaTipoPago } from './tipoPago';

export type EstadoCargo = 'PENDIENTE' | 'PARCIAL' | 'PAGADO';
export type TipoCargo = 'PAQUETE' | 'SERVICIO' | 'INSUMO' | 'OTRO';

const TEXTO_ESTADO: Record<EstadoCargo, string> = { PENDIENTE: 'Pendiente', PARCIAL: 'Parcial', PAGADO: 'Pagado' };
const TONO_ESTADO: Record<EstadoCargo, BadgeTone> = { PENDIENTE: 'danger', PARCIAL: 'warning', PAGADO: 'success' };

/** Tipos de cargo del backend (PAQUETE, SERVICIO, INSUMO, OTRO). */
export const TIPOS_CARGO: { value: TipoCargo; label: string }[] = [
  { value: 'PAQUETE', label: 'Paquete' },
  { value: 'SERVICIO', label: 'Servicio' },
  { value: 'INSUMO', label: 'Insumo' },
  { value: 'OTRO', label: 'Otro' },
];

// Textos del saldo. Se dice saldo disponible, nunca saldo a favor, y no existe la etiqueta Al día.
export const ETIQUETA_DISPONIBLE = 'Saldo disponible';
export const ETIQUETA_POR_PAGAR = 'Por pagar';
export const ETIQUETA_DEUDA = 'Deuda';

export const tonoDisponible = (disponible: number): BadgeTone => (disponible > 0 ? 'success' : 'neutral');
/** Por pagar es ambar si hay algo pendiente. El rojo es solo de la deuda, que se muestra aparte. */
export const tonoPorPagar = (porPagar: number): BadgeTone => (porPagar > 0 ? 'warning' : 'neutral');
export const estadoCargoTexto = (e: EstadoCargo): string => TEXTO_ESTADO[e];
export const tonoEstadoCargo = (e: EstadoCargo): BadgeTone => TONO_ESTADO[e];
export const tipoCargoTexto = (t: TipoCargo): string => TIPOS_CARGO.find((x) => x.value === t)?.label ?? t;

/** Metodos con los que se pago un cargo, sin repetir (por ejemplo Efectivo y QR). Vacio si nada lo cubre. */
export function metodoDeCargo(pagos: { tipo_pago: string }[] | undefined): string {
  const etiquetas = [...new Set((pagos ?? []).map((p) => etiquetaTipoPago(p.tipo_pago)))];
  return etiquetas.join(' y ');
}

/** Lee un monto escrito a mano (acepta coma o punto). Devuelve null si esta vacio, es negativo o no es un numero. */
export function parseMonto(raw: string): number | null {
  const limpio = raw.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(limpio)) return null;
  return Math.round(Number(limpio) * 100) / 100;
}
