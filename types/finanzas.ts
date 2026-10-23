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
  /** Egreso nacido de una planilla de sueldos: se gestiona desde Recursos Humanos. */
  planilla_id?: number | null;
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
  frecuencia: FrecuenciaGasto;
  /** Fecha de cobro del último egreso pagado (puede ser futura si se pagó por adelantado). */
  pagado_hasta?: string | null;
  /** Siguiente cobro aún sin pagar a partir de hoy (o de lo ya pagado por adelantado). */
  proximo_cobro?: string | null;
  /** Egresos pendientes cuya fecha ya pasó. */
  atrasados: number;
}

export type GastoFijoInput = Omit<
  GastoFijo,
  'id' | 'categoria_nombre' | 'local_nombre' | 'proximo_cobro' | 'pagado_hasta' | 'atrasados'
>;

export type FrecuenciaGasto =
  | 'DIARIA'
  | 'SEMANAL'
  | 'QUINCENAL'
  | 'MENSUAL'
  | 'BIMESTRAL'
  | 'TRIMESTRAL'
  | 'SEMESTRAL'
  | 'ANUAL';

/** `porDias`: cuenta desde la fecha de inicio cada N días y no usa "día de cobro". */
export const FRECUENCIAS: { value: FrecuenciaGasto; label: string; porDias?: number }[] = [
  { value: 'DIARIA', label: 'Diaria', porDias: 1 },
  { value: 'SEMANAL', label: 'Semanal', porDias: 7 },
  { value: 'QUINCENAL', label: 'Quincenal', porDias: 14 },
  { value: 'MENSUAL', label: 'Mensual' },
  { value: 'BIMESTRAL', label: 'Bimestral (cada 2 meses)' },
  { value: 'TRIMESTRAL', label: 'Trimestral (cada 3 meses)' },
  { value: 'SEMESTRAL', label: 'Semestral (cada 6 meses)' },
  { value: 'ANUAL', label: 'Anual' },
];

export const frecuenciaLabel = (f: FrecuenciaGasto) =>
  (FRECUENCIAS.find((x) => x.value === f)?.label ?? f).replace(/ \(.*\)$/, '');

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
  /** YYYY-MM-DD: clave del periodo (primer día del mes, o la fecha si la frecuencia es por días). */
  periodo: string;
  fecha_cobro: string;
  monto: number;
  local_nombre?: string | null;
  /** true si el cobro aún no vence (se ofrece para pagarlo por adelantado). */
  adelantado?: boolean;
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
  'rrhh.dia_pago_defecto': number;
  'rrhh.aporte_laboral_pct': number;
  'rrhh.aporte_patronal_pct': number;
  'rrhh.dias_mes_faltas': number;
  'publico.mostrar_paquetes': boolean;
}
