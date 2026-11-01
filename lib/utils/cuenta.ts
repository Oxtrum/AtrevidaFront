import type { BadgeTone } from '@/components/AdminConfig/StatusBadge';

export type EtiquetaSaldo = 'A_FAVOR' | 'DEUDA' | 'AL_DIA';
export type EstadoCargo = 'PENDIENTE' | 'PARCIAL' | 'PAGADO';
export type TipoCargo = 'PAQUETE' | 'SERVICIO' | 'INSUMO' | 'OTRO';

const TEXTO_SALDO: Record<EtiquetaSaldo, string> = { A_FAVOR: 'A favor', DEUDA: 'Deuda', AL_DIA: 'Al día' };
const TONO_SALDO: Record<EtiquetaSaldo, BadgeTone> = { A_FAVOR: 'success', DEUDA: 'danger', AL_DIA: 'neutral' };
const TEXTO_ESTADO: Record<EstadoCargo, string> = { PENDIENTE: 'Pendiente', PARCIAL: 'Parcial', PAGADO: 'Pagado' };
const TONO_ESTADO: Record<EstadoCargo, BadgeTone> = { PENDIENTE: 'danger', PARCIAL: 'warning', PAGADO: 'success' };

/** Tipos de cargo del backend (PAQUETE, SERVICIO, INSUMO, OTRO). */
export const TIPOS_CARGO: { value: TipoCargo; label: string }[] = [
  { value: 'PAQUETE', label: 'Paquete' },
  { value: 'SERVICIO', label: 'Servicio' },
  { value: 'INSUMO', label: 'Insumo' },
  { value: 'OTRO', label: 'Otro' },
];

export const etiquetaSaldoTexto = (e: EtiquetaSaldo): string => TEXTO_SALDO[e];
export const tonoSaldo = (e: EtiquetaSaldo): BadgeTone => TONO_SALDO[e];
export const estadoCargoTexto = (e: EstadoCargo): string => TEXTO_ESTADO[e];
export const tonoEstadoCargo = (e: EstadoCargo): BadgeTone => TONO_ESTADO[e];
export const tipoCargoTexto = (t: TipoCargo): string => TIPOS_CARGO.find((x) => x.value === t)?.label ?? t;

/** Lee un monto escrito a mano (acepta coma o punto). Devuelve null si esta vacio, es negativo o no es un numero. */
export function parseMonto(raw: string): number | null {
  const limpio = raw.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(limpio)) return null;
  return Math.round(Number(limpio) * 100) / 100;
}
