import { apiClient } from './client';
import type { PaginationMetadata, PaginationParams } from './pagination';
import type { ApiResponse } from '@/types/reserva';
import type { EstadoCargo, EtiquetaSaldo, TipoCargo } from '@/lib/utils/cuenta';

/** Saldo de un cliente: positivo = a favor, negativo = deuda. `absoluto` va sin signo para mostrarlo junto a la etiqueta. */
export interface SaldoCuenta {
  monto: number;
  absoluto: number;
  etiqueta: EtiquetaSaldo;
}

export interface CargoCliente {
  id: number;
  cliente_id: number;
  local_id?: number;
  tipo: TipoCargo;
  concepto: string;
  monto: number;
  pagado: number;
  pendiente: number;
  estado: EstadoCargo;
  /** Cuando ocurrio lo que se cobra. */
  fecha_hecho: string;
  /** Momento real del registro (lo pone el servidor). */
  registrado_en: string;
  reserva_id?: number;
  plan_id?: number;
  anulado: boolean;
  motivo_anulacion?: string;
}

export interface AbonoCliente {
  codigo_pago: string;
  monto: number;
  tipo_pago: string;
  fecha_hecho: string;
  registrado_en: string;
  aplicado: number;
  sin_aplicar: number;
}

export interface CuentaCliente {
  cliente_id: number;
  saldo: SaldoCuenta;
  total_cargos: number;
  total_abonos: number;
  /** Lo que los abonos no aplicaron todavia (saldo a favor sugerible al cobrar). */
  sin_aplicar: number;
  cargos: CargoCliente[];
  abonos: AbonoCliente[];
}

export interface CrearCargoData {
  tipo: TipoCargo;
  concepto: string;
  /** 0 registra un consumo que no se cobra. */
  monto: number;
  /** YYYY-MM-DD; sin ella es ahora. No puede ser futura. */
  fecha_hecho?: string;
  local_id?: number;
  reserva_id?: number;
  plan_id?: number;
}

export interface Reparto {
  cargo_id: number;
  monto: number;
}

export interface CrearAbonoData {
  local_id: number;
  local_nombre: string;
  monto: number;
  tipo_pago: 'qr' | 'efectivo';
  /** YYYY-MM-DD; sin ella es ahora. No puede ser futura. */
  fecha_hecho?: string;
  /** Lo que no se aplica queda como saldo a favor. */
  aplicaciones: Reparto[];
}

export async function getCuentaCliente(clienteId: number, incluirAnulados = false, signal?: AbortSignal): Promise<CuentaCliente> {
  const res = await apiClient.get<ApiResponse<{ cuenta: CuentaCliente }>>(`/bd/clientes/${clienteId}/cuenta`, {
    params: { incluir_anulados: incluirAnulados ? 'true' : undefined },
    signal,
  });
  return res.data.cuenta;
}

export async function crearCargo(clienteId: number, data: CrearCargoData): Promise<number> {
  const res = await apiClient.post<ApiResponse<{ id: number }>>(`/bd/clientes/${clienteId}/cargos`, data);
  return res.data.id;
}

export async function anularCargo(cargoId: number, motivo: string): Promise<void> {
  await apiClient.post(`/bd/cargos/${cargoId}/anular`, { motivo });
}

export async function crearAbono(clienteId: number, data: CrearAbonoData): Promise<string> {
  const res = await apiClient.post<ApiResponse<{ codigo_pago: string }>>(`/bd/clientes/${clienteId}/abonos`, data);
  return res.data.codigo_pago;
}

export async function aplicarAbono(clienteId: number, codigoPago: string, aplicaciones: Reparto[]): Promise<void> {
  await apiClient.post(`/bd/clientes/${clienteId}/abonos/${codigoPago}/aplicaciones`, { aplicaciones });
}

export interface DeudorCliente {
  cliente_id: number;
  nombre: string;
  apellido: string;
  numero_telefono: string;
  total_cargos: number;
  total_abonos: number;
  /** Lo que debe: siempre mayor a 0 en este listado. */
  deuda: number;
}

export interface GetDeudoresParams extends PaginationParams {
  busqueda?: string;
}

export interface DeudoresPage {
  deudores: DeudorCliente[];
  paginacion?: PaginationMetadata;
}

/** Clientes con deuda, con la mayor deuda primero salvo que se pida otro orden (ordenar_por + sentido). */
export async function getDeudores(params: GetDeudoresParams = {}, signal?: AbortSignal): Promise<DeudoresPage> {
  const res = await apiClient.get<ApiResponse<DeudoresPage>>('/bd/cuentas/deudores', {
    params: { ...params, include_total: params.include_total ? 'true' : undefined },
    signal,
  });
  return { deudores: res.data?.deudores ?? [], paginacion: res.data?.paginacion };
}
