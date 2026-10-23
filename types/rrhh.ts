// Tipos de Recursos Humanos: empleados, adelantos y planillas de sueldo.
import type { MetodoPago } from './inventario';

export type EstadoPlanilla = 'PENDIENTE' | 'PAGADO' | 'ANULADO';
export type TipoPlanilla = 'SUELDO';

export interface Empleado {
  id: number;
  nombre: string;
  apellido: string;
  ci?: string | null;
  cargo?: string | null;
  telefono?: string | null;
  local_id?: number | null;
  local_nombre?: string | null;
  usuario_id?: number | null;
  sueldo_base: number;
  /** null = usa el día por defecto de Parámetros. */
  dia_pago?: number | null;
  dia_pago_efectivo: number;
  aplica_aportes: boolean;
  metodo_pago?: MetodoPago | null;
  fecha_ingreso: string;
  fecha_baja?: string | null;
  activo: boolean;
  notas?: string | null;
  adelantos_pendientes: number;
}

export interface EmpleadoInput {
  nombre: string;
  apellido: string;
  ci: string | null;
  cargo: string | null;
  telefono: string | null;
  local_id: number | null;
  sueldo_base: number;
  dia_pago: number | null;
  aplica_aportes: boolean;
  metodo_pago: MetodoPago | null;
  fecha_ingreso: string;
  fecha_baja: string | null;
  activo: boolean;
  notas: string | null;
}

export interface Adelanto {
  id: number;
  empleado_id: number;
  empleado_nombre: string;
  fecha: string;
  monto: number;
  motivo?: string | null;
  planilla_id?: number | null;
  anulado: boolean;
}

export interface AdelantoInput {
  empleado_id: number;
  fecha: string;
  monto: number;
  motivo: string | null;
}

export interface TipoBono {
  id: number;
  nombre: string;
  descripcion?: string | null;
  activo: boolean;
}

export interface TipoBonoInput {
  nombre: string;
  descripcion: string | null;
  activo?: boolean;
}

/** Una línea de bono de la planilla: de qué tipo es, cuánto y por qué. */
export interface PlanillaBono {
  id: number;
  tipo_bono_id: number;
  tipo_nombre: string;
  monto: number;
  nota?: string | null;
}

export interface BonoInput {
  tipo_bono_id: number;
  monto: number;
  nota: string | null;
}

export interface Planilla {
  id: number;
  empleado_id: number;
  empleado_nombre: string;
  cargo?: string | null;
  local_id?: number | null;
  local_nombre?: string | null;
  tipo: TipoPlanilla;
  /** Primer día del mes (YYYY-MM-DD). */
  periodo: string;
  fecha_pago: string;
  sueldo_base: number;
  /** Suma de las líneas de bonos_detalle. */
  bonos: number;
  bonos_detalle: PlanillaBono[];
  dias_falta: number;
  descuento_faltas: number;
  total_ganado: number;
  aporte_laboral: number;
  adelantos: number;
  otros_descuentos: number;
  neto_pagar: number;
  aporte_patronal: number;
  /** Lo que sale de la caja de la empresa: total ganado + aporte patronal. */
  costo_empresa: number;
  estado: EstadoPlanilla;
  motivo_anulacion?: string | null;
  notas?: string | null;
  movimiento_codigo?: string | null;
}

export interface PlanillaResumen {
  periodo: string;
  empleados: number;
  total_ganado: number;
  aporte_laboral: number;
  adelantos: number;
  descuentos: number;
  neto_pagar: number;
  aporte_patronal: number;
  costo_empresa: number;
  pagado: number;
  pendiente: number;
}

export interface PlanillasResponse {
  planillas: Planilla[];
  resumen: PlanillaResumen;
}

export interface PlanillaEdicion {
  /** Reemplaza todas las líneas de bono. */
  bonos_detalle?: BonoInput[];
  dias_falta?: number;
  otros_descuentos?: number;
  notas?: string | null;
}

export interface GetPlanillasParams {
  /** Mes YYYY-MM. */
  periodo?: string;
  empleado_id?: number;
  local_id?: number;
  estado?: EstadoPlanilla;
  tipo?: TipoPlanilla;
}
