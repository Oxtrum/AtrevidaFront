// Tipos del módulo Inventario (contrato: PLAN_TRASTIENDA_INVENTARIOS.md §4–§5)

export type UnidadMedida = 'UNIDAD' | 'ML' | 'GR' | 'CAJA';

export const UNIDADES_MEDIDA: { value: UnidadMedida; label: string }[] = [
  { value: 'UNIDAD', label: 'Unidad' },
  { value: 'ML', label: 'Mililitros (ml)' },
  { value: 'GR', label: 'Gramos (gr)' },
  { value: 'CAJA', label: 'Caja' },
];

export type MetodoPago = 'efectivo' | 'qr' | 'transferencia' | 'debito_automatico';

export const METODOS_PAGO: { value: MetodoPago; label: string }[] = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'qr', label: 'QR' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'debito_automatico', label: 'Débito automático' },
];

export type TipoMovimientoInventario =
  | 'ENTRADA_COMPRA'
  | 'SALIDA_SERVICIO'
  | 'REVERSION_SERVICIO'
  | 'AJUSTE_POSITIVO'
  | 'AJUSTE_NEGATIVO';

export const TIPOS_MOVIMIENTO_LABEL: Record<TipoMovimientoInventario, string> = {
  ENTRADA_COMPRA: 'Entrada por compra',
  SALIDA_SERVICIO: 'Salida por servicio',
  REVERSION_SERVICIO: 'Reversión de servicio',
  AJUSTE_POSITIVO: 'Ajuste (+)',
  AJUSTE_NEGATIVO: 'Ajuste (−)',
};

/** Movimientos que suman stock; el resto resta. */
export const TIPOS_MOVIMIENTO_ENTRADA: TipoMovimientoInventario[] = [
  'ENTRADA_COMPRA',
  'REVERSION_SERVICIO',
  'AJUSTE_POSITIVO',
];

export interface CategoriaInventario {
  id: number;
  nombre: string;
  activo: boolean;
}

export interface StockLocal {
  local_id: number;
  local_nombre: string;
  cantidad: number;
}

export interface InventarioItem {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  categoria_id?: number | null;
  categoria_nombre?: string | null;
  unidad_medida: UnidadMedida;
  costo_referencia?: number | null;
  stock_minimo: number;
  /** Stock del local consultado (o suma si no se filtra por local). */
  stock_actual: number;
  bajo_stock: boolean;
  imagen_url?: string | null;
  activo: boolean;
  /** Solo en el detalle. */
  stock_por_local?: StockLocal[];
}

export interface InventarioItemInput {
  nombre: string;
  descripcion?: string;
  categoria_id?: number | null;
  unidad_medida: UnidadMedida;
  costo_referencia?: number | null;
  stock_minimo: number;
  activo?: boolean;
}

export interface MovimientoInventario {
  id: number;
  item_id: number;
  item_nombre: string;
  local_id: number;
  local_nombre: string;
  tipo: TipoMovimientoInventario;
  cantidad: number;
  stock_resultante: number;
  costo_unitario?: number | null;
  reserva_id?: number | null;
  compra_id?: number | null;
  motivo?: string | null;
  usuario_nombre?: string | null;
  creado_en: string;
}

export interface AjusteInventarioInput {
  item_id: number;
  local_id: number;
  tipo: 'AJUSTE_POSITIVO' | 'AJUSTE_NEGATIVO';
  cantidad: number;
  motivo: string;
}

export interface GetInventarioItemsParams {
  q?: string;
  categoria_id?: number;
  local_id?: number;
  bajo_stock?: boolean;
  activo?: boolean;
  limit?: number;
}

export interface GetMovimientosParams {
  item_id?: number;
  local_id?: number;
  tipo?: TipoMovimientoInventario;
  fecha_desde?: string;
  fecha_hasta?: string;
  limit?: number;
}

/** Advertencia devuelta al crear/agendar una reserva sin stock suficiente (RN-12). */
export interface AdvertenciaInventario {
  item_id: number;
  item_nombre: string;
  requerido: number;
  disponible: number;
  unidad: string;
}

export interface AlertaReservaInventario {
  reserva_id: number;
  fecha: string;
  hora_desde: string;
  cliente: string;
  servicio: string;
  local: string;
  advertencias: AdvertenciaInventario[];
}

export interface AlertasInventario {
  items_bajo_stock: InventarioItem[];
  reservas_con_alerta: AlertaReservaInventario[];
}

/** Insumo que consume un servicio por sesión (RN-10). */
export interface ServicioInsumo {
  item_id: number;
  item_nombre?: string;
  unidad_medida?: UnidadMedida;
  cantidad_por_sesion: number;
}

// ── Compras ──
export interface CompraDetalleInput {
  item_id: number;
  cantidad: number;
  costo_unitario: number;
}

export interface CompraInput {
  local_id: number;
  proveedor?: string;
  fecha: string;
  notas?: string;
  metodo_pago?: MetodoPago;
  detalle: CompraDetalleInput[];
}

export interface CompraDetalle extends CompraDetalleInput {
  item_nombre: string;
  unidad_medida: UnidadMedida;
  subtotal: number;
}

export interface Compra {
  id: number;
  codigo: string;
  local_id: number;
  local_nombre: string;
  proveedor?: string | null;
  fecha: string;
  total: number;
  estado: 'REGISTRADA' | 'ANULADA';
  notas?: string | null;
  nombre_usuario?: string | null;
  detalle?: CompraDetalle[];
  movimiento_financiero_codigo?: string;
}
