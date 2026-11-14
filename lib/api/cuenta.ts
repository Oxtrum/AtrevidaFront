import { apiClient } from './client';
import type { PaginationMetadata, PaginationParams } from './pagination';
import type { ApiResponse } from '@/types/reserva';
import type { EstadoCargo, TipoCargo } from '@/lib/utils/cuenta';
import type { TipoPago } from '@/lib/utils/tipoPago';

/**
 * Posicion de un cliente en dos numeros que no se mezclan: lo que tiene disponible (dinero recargado y no usado)
 * y lo que le falta pagar. La deuda es por pagar menos disponible y nunca es negativa.
 */
export interface SaldoCuenta {
  disponible: number;
  por_pagar: number;
  deuda: number;
}

export interface CargoCliente {
  id: number;
  cliente_id: number;
  local_id?: number;
  tipo: TipoCargo;
  concepto: string;
  monto: number;
  /** Insumo cobrado y su cantidad (solo cargos de tipo INSUMO). */
  item_id?: number;
  cantidad?: number;
  pagado: number;
  pendiente: number;
  estado: EstadoCargo;
  /** Cuando ocurrio lo que se cobra. */
  fecha_hecho: string;
  /** Momento real del registro (lo pone el servidor). */
  registrado_en: string;
  reserva_id?: number;
  /** Fecha y servicio de la reserva de la que nace el cargo: para saber cuando se uso. */
  reserva_fecha?: string;
  reserva_servicio?: string;
  plan_id?: number;
  plan_nombre?: string;
  anulado: boolean;
  motivo_anulacion?: string;
  /** Pagos que lo cubren, con su metodo; vacio si nada lo cubre. */
  pagos: PagoDeCargo[];
}

/** Lo que un pago cubre de un cargo. */
export interface PagoDeCargo {
  codigo_pago: string;
  tipo_pago: string;
  monto: number;
}

export interface AbonoCliente {
  codigo_pago: string;
  monto: number;
  tipo_pago: string;
  fecha_hecho: string;
  registrado_en: string;
  /** Cuanto de este abono ya cubrio de cargos. */
  aplicado: number;
  /** Lo que queda sin usar de este abono. */
  sin_aplicar: number;
}

export interface CuentaCliente {
  cliente_id: number;
  saldo: SaldoCuenta;
  total_cargos: number;
  total_abonos: number;
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
  /** Insumo que se cobra (tipo INSUMO): exige local_id y cantidad; baja el stock de ese local al crear el cargo. */
  item_id?: number;
  cantidad?: number;
}

/** Cobro de caja: los cargos marcados se pagan completos. */
export interface CobrarData {
  local_id: number;
  local_nombre: string;
  /** Cargos que se pagan completos; puede ir vacio si solo se recarga saldo. */
  cargo_ids: number[];
  /** true descuenta primero el saldo disponible; false si el cliente prefiere guardarlo. */
  usar_saldo: boolean;
  /** Dinero extra que queda como saldo disponible. */
  recarga?: number;
  /** Metodo del dinero nuevo; solo se exige si entra dinero nuevo. */
  tipo_pago?: TipoPago;
  /** YYYY-MM-DD; sin ella es ahora. No puede ser futura. */
  fecha_hecho?: string;
}

export interface CobroResultado {
  /** Codigo del dinero nuevo que entro; vacio si el saldo cubrio todo. */
  codigo_pago?: string;
  plan: {
    total: number;
    usa_saldo: number;
    falta: number;
    nuevo_pago: number;
  };
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

/** Crea varios cargos de un cliente en una sola transaccion (si uno falla no queda ninguno). Devuelve sus ids. */
export async function crearCargosLote(clienteId: number, cargos: CrearCargoData[]): Promise<number[]> {
  const res = await apiClient.post<ApiResponse<{ ids: number[] }>>(`/bd/clientes/${clienteId}/cargos/lote`, { cargos });
  return res.data.ids;
}

export async function anularCargo(cargoId: number, motivo: string): Promise<void> {
  await apiClient.post(`/bd/cargos/${cargoId}/anular`, { motivo });
}

export async function cobrarCliente(clienteId: number, data: CobrarData): Promise<CobroResultado> {
  const res = await apiClient.post<ApiResponse<CobroResultado>>(`/bd/clientes/${clienteId}/cobros`, data);
  return res.data;
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
