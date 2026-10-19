// Tipos de Finanzas: egresos, otros ingresos, gastos fijos, reporte (PLAN §3.3–§3.5, §5.6)
import type { MetodoPago } from './inventario';

export type NaturalezaFinanciera = 'INGRESO' | 'EGRESO';
/** Una categoría puede servir solo a ingresos, solo a egresos, o a ambos. */
export type NaturalezaCategoria = NaturalezaFinanciera | 'AMBOS';

/** ¿La categoría se puede usar en un movimiento de esta naturaleza? */
export const categoriaSirvePara = (categoria: NaturalezaCategoria, naturaleza: NaturalezaFinanciera) =>
  categoria === 'AMBOS' || categoria === naturaleza;
export type ClaseEgreso = 'FIJO' | 'VARIABLE';
export type EstadoMovimiento = 'PENDIENTE' | 'PAGADO' | 'ANULADO';

export interface CategoriaFinanciera {
  id: number;
  nombre: string;
  naturaleza: NaturalezaCategoria;
  activo: boolean;
}

export interface MovimientoFinanciero {
  id: number;
  codigo: string;
  naturaleza: NaturalezaFinanciera;
  clase?: ClaseEgreso | null;
  categoria_id: number;
  categoria_nombre: string;
  gasto_fijo_id?: number | null;
  periodo?: string | null;
  compra_id?: number | null;
  local_id?: number | null;
  local_nombre?: string | null;
  fecha: string;
  monto: number;
  descripcion?: string | null;
  proveedor?: string | null;
  metodo_pago?: MetodoPago | null;
  estado: EstadoMovimiento;
  motivo_anulacion?: string | null;
  nombre_usuario?: string | null;
}

export interface MovimientoFinancieroInput {
  naturaleza: NaturalezaFinanciera;
  clase?: ClaseEgreso;
  categoria_id: number;
  /** null = gasto general de la empresa. */
  local_id: number | null;
  fecha: string;
  monto: number;
  descripcion?: string;
  proveedor?: string;
  metodo_pago?: MetodoPago;
  estado: Exclude<EstadoMovimiento, 'ANULADO'>;
}

export interface GetMovimientosFinancierosParams {
  naturaleza?: NaturalezaFinanciera;
  clase?: ClaseEgreso;
  categoria_id?: number;
  estado?: EstadoMovimiento;
  local_id?: number;
  fecha_desde?: string;
  fecha_hasta?: string;
}

export interface GastoFijo {
  id: number;
  nombre: string;
  categoria_id: number;
  categoria_nombre: string;
  monto: number;
  dia_cobro: number;
  local_id?: number | null;
  local_nombre?: string | null;
  metodo_pago?: MetodoPago | null;
  proveedor?: string | null;
  fecha_inicio: string;
  fecha_fin?: string | null;
  activo: boolean;
  notas?: string | null;
  proximo_cobro?: string | null;
}

export type GastoFijoInput = Omit<GastoFijo, 'id' | 'categoria_nombre' | 'local_nombre' | 'proximo_cobro'>;

export interface GastoFijoProximo {
  gasto_fijo_id: number;
  nombre: string;
  monto: number;
  fecha_cobro: string;
  dias_restantes: number;
  local_nombre?: string | null;
}

/** Egreso fijo ya vencido que aún no se generó (vista previa de "generar"). */
export interface GastoFijoPendiente {
  gasto_fijo_id: number;
  nombre: string;
  categoria: string;
  /** YYYY-MM */
  periodo: string;
  fecha_cobro: string;
  monto: number;
  local_nombre?: string | null;
}

// ── Flujo de caja unificado ──
export type FlujoOrigen = 'VENTA' | 'COMPRA' | 'GASTO_FIJO' | 'GASTO_VARIABLE' | 'OTRO_INGRESO';

export interface FlujoMovimiento {
  clave: string;
  fecha: string;
  origen: FlujoOrigen;
  codigo: string;
  naturaleza: NaturalezaFinanciera;
  categoria: string;
  detalle: string;
  local_id?: number | null;
  local_nombre?: string | null;
  monto: number;
  estado: EstadoMovimiento;
  /** Saldo acumulado del rango filtrado (solo cuentan los PAGADO). */
  saldo: number;
}

export interface FlujoTotales {
  ingresos: number;
  egresos: number;
  balance: number;
  por_cobrar: number;
  por_pagar: number;
  movimientos: number;
}

export interface FlujoLocal {
  local_id: number;
  local: string;
  ingresos: number;
  egresos: number;
  balance: number;
}

export interface FlujoFinancieroResponse {
  fecha_desde: string;
  fecha_hasta: string;
  movimientos: FlujoMovimiento[];
  truncado: boolean;
  totales: FlujoTotales;
  por_local: FlujoLocal[];
}

export interface GetFlujoFinancieroParams {
  fecha_desde?: string;
  fecha_hasta?: string;
  local_id?: number;
  origen?: FlujoOrigen;
  estado?: EstadoMovimiento;
  q?: string;
  limit?: number;
}

// ── Reporte financiero (§5.6) ──
export interface ReporteFinancieroResumen {
  ingresos_ventas: number;
  ingresos_otros: number;
  ingresos_total: number;
  egresos_fijos: number;
  egresos_variables: number;
  egresos_total: number;
  egresos_pendientes: number;
  utilidad_neta: number;
  margen_pct: number;
}

export interface EgresoPorCategoria {
  categoria: string;
  clase: ClaseEgreso;
  total: number;
}

export interface PuntoSerieFinanciera {
  periodo: string;
  ingresos: number;
  egresos: number;
  utilidad: number;
}

export interface DetalleLocalFinanciero {
  local: string;
  resumen: ReporteFinancieroResumen;
}

export interface ReporteFinancieroResponse {
  filtros: { fecha_desde: string; fecha_hasta: string; local: string };
  resumen: ReporteFinancieroResumen;
  egresos_por_categoria: EgresoPorCategoria[];
  serie: PuntoSerieFinanciera[];
  inventario: { valor_stock: number; items_bajo_stock: number; consumo_servicios: number };
  gastos_generales: number;
  detalle_por_local: DetalleLocalFinanciero[];
}

export interface GetReporteFinancieroParams {
  fecha_desde: string;
  fecha_hasta: string;
  local?: string;
  agrupar?: 'dia' | 'mes';
}

// ── Configuración (§3.5) ──
export interface ConfiguracionSistema {
  'inventario.politica_sin_stock': 'ADVERTIR' | 'BLOQUEAR';
  'inventario.descontar_en_estado': 'COMPLETADO' | 'AGENDADO';
  'inventario.permitir_stock_negativo': boolean;
  'inventario.considerar_comprometido': boolean;
  'finanzas.estado_gasto_fijo_generado': 'PENDIENTE' | 'PAGADO';
  'finanzas.dias_aviso_gasto_fijo': number;
  'finanzas.zona_horaria': string;
  'finanzas.moneda': string;
}
