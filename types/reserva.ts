export type DiaSemana = 'LUNES' | 'MARTES' | 'MIÉRCOLES' | 'JUEVES' | 'VIERNES' | 'SÁBADO';

export type TipoReserva = 'm' | 'b' | 'M' | 'B' | 'feriado';
export type EstadoReserva = 'PENDIENTE' | 'AGENDADO' | 'RECHAZADO' | 'COMPLETADO';

export interface FechaDia {
  dia: number;
  mes: string;
  fecha: Date;
  esPasado: boolean;
}
export interface ReservasBDApiResponse {
  code: number;
  data: { reservas: ReservaBD[]; total: number };
  error: boolean;
  message: string | null;
  status: string;
}

export const SERVICIO_EVALUACION_GRATUITA = {
  value: 'evaluacion_gratuita',
  label: 'Evaluación gratuita',
  categoria: 'Reservas',
  duracion: '60 min',
  costo: '0 Bs',
  precio: 0,
  sucursal: 'ambos',
  requiere_evaluacion: false,
} as const;

export const SERVICIO_TRATAMIENTO_ESPECIALIZADO = {
  value: 'tratamiento_especializado',
  label: 'Tratamiento especializado',
  categoria: 'Reservas',
  duracion: '60 min',
  costo: 'Por definir',
  precio: 0,
  sucursal: 'ambos',
  requiere_evaluacion: true,
  nota: 'Indica qué tratamiento te interesa. El equipo validará si aplica antes de agendarlo.',
} as const;

export const SERVICIOS_ADMIN_DISPONIBLES = [
  SERVICIO_EVALUACION_GRATUITA,
  { value: 'ultracavitacion', label: 'Ultracavitación', categoria: 'Apartología', duracion: '50 min', costo: '70 Bs', precio: 70, sucursal: 'ambos', requiere_evaluacion: true },
  { value: 'radiofrecuencia', label: 'Radiofrecuencia', categoria: 'Apartología', duracion: '50 min', costo: '70 Bs', precio: 70, sucursal: 'ambos', requiere_evaluacion: true },
  { value: 'ondas_rusas', label: 'Ondas Rusas', categoria: 'Apartología', duracion: '50 min', costo: '70 Bs', precio: 70, sucursal: 'ambos', requiere_evaluacion: true },
  { value: 'lipolaser', label: 'Lipolaser', categoria: 'Apartología', duracion: '50 min', costo: '70 Bs', precio: 70, sucursal: 'ambos', requiere_evaluacion: true },
  { value: 'vacumterapia', label: 'Vacumterapia', categoria: 'Apartología', duracion: '50 min', costo: '70 Bs', precio: 70, sucursal: 'ambos', requiere_evaluacion: true },
  { value: 'criolipolisis', label: 'Criolipolisis', categoria: 'Apartología', duracion: '50 min', costo: '500 Bs', precio: 500, sucursal: 'ambos', requiere_evaluacion: true },
  { value: 'vacumterapia_premium', label: 'Vacumterapia Premium', categoria: 'Apartología', duracion: '50 min', costo: '70 Bs', precio: 70, sucursal: 'ARANJUEZ', requiere_evaluacion: true },
  { value: 'e_pulse_bike', label: 'E-Pulse Bike', categoria: 'Bicicleta', duracion: '30 min', costo: '70 Bs', precio: 70, sucursal: 'CENTRO', requiere_evaluacion: false },
  { value: 'maderoterapia', label: 'Maderoterapia', categoria: 'Manuales', duracion: '50 min', costo: '70 Bs', precio: 70, sucursal: 'ambos', requiere_evaluacion: true },
  { value: 'masaje_relajante_medio', label: 'Masaje Relajante Medio Cuerpo', categoria: 'Manuales', duracion: '35 min', costo: '70 Bs', precio: 70, sucursal: 'ambos', requiere_evaluacion: true },
  { value: 'masaje_relajante_entero', label: 'Masaje Relajante Cuerpo Entero', categoria: 'Manuales', duracion: '50 min', costo: '100 Bs', precio: 100, sucursal: 'ambos', requiere_evaluacion: true },
  { value: 'masaje_descontracturante_medio', label: 'Masaje Descontracturante Medio Cuerpo', categoria: 'Manuales', duracion: '35 min', costo: '70 Bs', precio: 70, sucursal: 'ambos', requiere_evaluacion: true },
  { value: 'masaje_descontracturante_entero', label: 'Masaje Descontracturante Cuerpo Entero', categoria: 'Manuales', duracion: '50 min', costo: '100 Bs', precio: 100, sucursal: 'ambos', requiere_evaluacion: true },
  { value: 'masaje_reductor', label: 'Masaje Reductor', categoria: 'Manuales', duracion: '25 min', costo: '50 Bs', precio: 50, sucursal: 'CENTRO', requiere_evaluacion: true },
  { value: 'limpieza_facial', label: 'Limpieza Facial', categoria: 'Limpieza Facial', duracion: '50 min', costo: '100 Bs', precio: 100, sucursal: 'ambos', requiere_evaluacion: false },
  { value: 'limpieza_facial_premium', label: 'Limpieza Facial Premium', categoria: 'Limpieza Facial', duracion: '90 min', costo: '150 Bs', precio: 150, sucursal: 'ambos', requiere_evaluacion: false },
  { value: 'meso', label: 'Mesoterapia', categoria: 'Apartología', duracion: '50 min', costo: '70 Bs', precio: 70, sucursal: 'ambos', requiere_evaluacion: true },
  { value: 'inyeccion_quemador_1', label: 'Quemador de Grasa + Ultradev + Masaje (1 sesión)', categoria: 'Inyecciones', duracion: '50 min', costo: '300 Bs', precio: 300, sucursal: 'ambos', requiere_evaluacion: true },
  { value: 'inyeccion_quemador_3', label: 'Quemador de Grasa + Ultradev + Masaje (3 sesiones)', categoria: 'Inyecciones', duracion: '50 min', costo: '750 Bs', precio: 750, sucursal: 'ambos', requiere_evaluacion: true },
  { value: 'inyeccion_quemador_5', label: 'Quemador de Grasa + Ultradev + Masaje (5 sesiones)', categoria: 'Inyecciones', duracion: '50 min', costo: '1250 Bs', precio: 1250, sucursal: 'ambos', requiere_evaluacion: true },
  { value: 'inyeccion_quemador_10', label: 'Quemador de Grasa + Ultradev + Masaje (10 sesiones)', categoria: 'Inyecciones', duracion: '50 min', costo: '2350 Bs', precio: 2350, sucursal: 'ambos', requiere_evaluacion: true },
  { value: 'inyeccion_dmae_1', label: 'DMAE + Radiofrecuencia + Masaje Tonif. (1 sesión)', categoria: 'Inyecciones', duracion: '50 min', costo: '350 Bs', precio: 350, sucursal: 'ambos', requiere_evaluacion: true },
  { value: 'inyeccion_dmae_3', label: 'DMAE + Radiofrecuencia + Masaje Tonif. (3 sesiones)', categoria: 'Inyecciones', duracion: '50 min', costo: '900 Bs', precio: 900, sucursal: 'ambos', requiere_evaluacion: true },
  { value: 'inyeccion_dmae_5', label: 'DMAE + Radiofrecuencia + Masaje Tonif. (5 sesiones)', categoria: 'Inyecciones', duracion: '50 min', costo: '1500 Bs', precio: 1500, sucursal: 'ambos', requiere_evaluacion: true },
  { value: 'inyeccion_dmae_10', label: 'DMAE + Radiofrecuencia + Masaje Tonif. (10 sesiones)', categoria: 'Inyecciones', duracion: '50 min', costo: '2900 Bs', precio: 2900, sucursal: 'ambos', requiere_evaluacion: true },
] as const;

export const SERVICIOS_DISPONIBLES = [
  SERVICIO_EVALUACION_GRATUITA,
  ...SERVICIOS_ADMIN_DISPONIBLES.filter(
    (servicio) => !servicio.requiere_evaluacion && servicio.value !== SERVICIO_EVALUACION_GRATUITA.value,
  ),
  SERVICIO_TRATAMIENTO_ESPECIALIZADO,
];

export const SERVICIOS_ESPECIALIZADOS_DISPONIBLES = SERVICIOS_ADMIN_DISPONIBLES.filter(
  (servicio) => servicio.requiere_evaluacion,
);

export type ServicioValue = typeof SERVICIOS_DISPONIBLES[number]['value'];

export interface ReservaFormData {
  local: string;
  semana: string;
  dia: DiaSemana;
  fecha?: string;
  hora_desde: string;
  hora_hasta: string;
  tipo: 'm' | 'b';
  cliente: string;
  numero_telefono?: string;
  servicio: string;
  servicio_solicitado?: string | null;
  servicio_confirmado?: string | null;
  precio?: number;
  notas?: string;
  estado?: EstadoReserva;
}

export interface ReservaDetalle {
  tipo: TipoReserva;
  cliente?: string;
  servicio?: string;
  esFeriado?: boolean;
}

export interface ReservaPorHora {
  hora: string;
  dias: Partial<Record<DiaSemana, ReservaDetalle[]>>;
}

export interface SemanaData {
  titulo: string;
  reservas: ReservaPorHora[];
}

export interface LocalData {
  local: string;
  semanas: SemanaData[];
}

export interface FiltrosReserva {
  local?: string;
  semana?: string | number;
  dia?: string;
  tipo?: string;
  cliente?: string;
  reservados?: boolean;
}

export interface ReservasData {
  reservas: LocalData[];
  filtros: FiltrosReserva;
  total_locales: number;
}

export interface ApiResponse<T = ReservasData> {
  code: number;
  data: T;
  error: boolean;
  message: string | null;
  status: string;
}

export interface ReservasResponse {
  reservas: LocalData[];
  filtros: FiltrosReserva;
  total_locales: number;
}

export interface TimeSlotInfo {
  hora: string;
  horaFin: string;
  dia: DiaSemana;
  fecha: Date;
  reservado: boolean;
  esPasado: boolean;
  reservas: ReservaDetalle[];
}

export const SUCURSALES = [
  { value: 'PASEO ARANJUEZ', label: 'Paseo Aranjuez' },
  //  { value: 'CENTRO', label: 'Centro' },
  { value: 'SAN MARTIN', label: 'San Martin' },
] as const;

export type SucursalValue = typeof SUCURSALES[number]['value'];

export function getServiciosPorSucursal(sucursal: string) {
  // San Martín uses the same services as Centro
  const normalizedSucursal = sucursal === 'SAN MARTIN' ? 'CENTRO' : sucursal;
  return SERVICIOS_DISPONIBLES.filter(
    s => s.sucursal === 'ambos' || s.sucursal === normalizedSucursal
  );
}

export type ServicioInfo = typeof SERVICIOS_DISPONIBLES[number];
export type ServicioAdminInfo = typeof SERVICIOS_ADMIN_DISPONIBLES[number];

export function getServiciosPorCategoria(servicios: readonly ServicioInfo[]) {
  const categorias: Record<string, ServicioInfo[]> = {};
  for (const s of servicios) {
    if (!categorias[s.categoria]) {
      categorias[s.categoria] = [];
    }
    categorias[s.categoria]!.push(s);
  }
  return categorias;
}

export function getServiciosAdminPorSucursal(sucursal: string) {
  const normalizedSucursal = sucursal === 'SAN MARTIN' ? 'CENTRO' : sucursal;
  return SERVICIOS_ADMIN_DISPONIBLES.filter(
    s => s.sucursal === 'ambos' || s.sucursal === normalizedSucursal
  );
}

export function getServiciosAdminPorCategoria(servicios: readonly ServicioAdminInfo[]) {
  const categorias: Record<string, ServicioAdminInfo[]> = {};
  for (const s of servicios) {
    if (!categorias[s.categoria]) {
      categorias[s.categoria] = [];
    }
    categorias[s.categoria]!.push(s);
  }
  return categorias;
}

export function getTipoFromServicio(servicioValue?: string): string {
  const servicio = SERVICIOS_ADMIN_DISPONIBLES.find(s => s.value === servicioValue);
  if (servicio?.categoria === 'Bicicleta') {
    return 'B';
  }
  return 'M';
}

/**
 * Devuelve el `tipo` tal como lo espera la API (`mesa` | `bicicleta`).
 * Úsalo siempre al armar payloads para `/bd/reservas`.
 */
export function getTipoBackendFromServicio(servicioValue?: string): 'M' | 'B' {
  return getTipoFromServicio(servicioValue) === 'B' ? 'B' : 'M';
}

export function getTipoColor(tipo: string): { bg: string; border: string; accent: string } {
  switch (tipo) {
    case 'b':
      return { bg: 'rgba(20, 174, 239, 0.15)', border: 'rgba(20, 174, 239, 0.4)', accent: '#14AEEF' };
    case 'm':
      return { bg: 'rgba(255, 230, 0, 0.15)', border: 'rgba(255, 230, 0, 0.4)', accent: '#FFE600' };
    case 'feriado':
      return { bg: 'rgba(255, 230, 0, 0.1)', border: 'rgba(255, 230, 0, 0.3)', accent: '#FFE600' };
    default:
      return { bg: 'rgba(146, 39, 143, 0.15)', border: 'rgba(236, 0, 140, 0.3)', accent: '#F5F5F5' };
  }
}

export function getTipoColor2(tipo: string): { bg: string; border: string; accent: string } {
  switch (tipo) {
    case 'b':
      return {
        bg: 'rgba(20, 174, 239, 0.12)',
        border: 'rgba(20, 174, 239, 0.38)',
        accent: '#14AEEF',
      };
    case 'm':
      return {
        bg: 'rgba(236, 0, 140, 0.12)',
        border: 'rgba(236, 0, 140, 0.38)',
        accent: '#EC008C',
      };
    case 'feriado':
      return {
        bg: 'rgba(255, 230, 0, 0.12)',
        border: 'rgba(255, 230, 0, 0.35)',
        accent: '#FFE600',
      };
    default:
      return {
        bg: 'rgba(146, 39, 143, 0.12)',
        border: 'rgba(146, 39, 143, 0.35)',
        accent: '#92278F',
      };
  }
}

export function getTipoLabel(tipo: string): string {
  switch (tipo) {
    case 'b': return 'Bicicleta';
    case 'm': return 'Mesa';
    case 'feriado': return 'Feriado';
    default: return tipo;
  }
}

export function normalizeTipo(tipo: string | undefined): TipoReserva {
  if (!tipo) return 'm';
  const t = tipo.toLowerCase();
  if (t === 'bicicleta' || t === 'b') return 'b';
  if (t === 'mesa' || t === 'm') return 'm';
  if (t === 'feriado') return 'feriado';
  return 'm';
}

export function getFechaManana(): Date {
  const manana = new Date();
  manana.setDate(manana.getDate() + 1);
  manana.setHours(0, 0, 0, 0);
  return manana;
}

export function esFechaPasada(fecha: Date): boolean {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fechaComparar = new Date(fecha);
  fechaComparar.setHours(0, 0, 0, 0);
  return fechaComparar < hoy;
}

export function generarSemanas(cantidad: number = 6): { valor: string; titulo: string; fechaInicio: Date }[] {
  const semanas: { valor: string; titulo: string; fechaInicio: Date }[] = [];
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  // Obtener el lunes de la semana ACTUAL
  const diaActual = hoy.getDay();
  const offsetLunes = diaActual === 0 ? -6 : 1 - diaActual;
  const lunesActual = new Date(hoy);
  lunesActual.setDate(hoy.getDate() + offsetLunes);
  lunesActual.setHours(0, 0, 0, 0);

  // Si hoy es lunes o después, empezar desde ESTE lunes
  // Si hoy es domingo o antes, empezar desde el próximo lunes
  let fechaInicioSemana: Date;
  if (diaActual === 0) {
    // Es domingo, empezar desde el próximo lunes
    fechaInicioSemana = new Date(lunesActual);
    fechaInicioSemana.setDate(fechaInicioSemana.getDate() + 7);
  } else {
    fechaInicioSemana = new Date(lunesActual);
  }

  const MESES_ES = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];

  for (let i = 0; i < cantidad; i++) {
    const fechaInicio = new Date(fechaInicioSemana);
    fechaInicio.setDate(fechaInicioSemana.getDate() + (i * 7));

    const fechaFin = new Date(fechaInicio);
    fechaFin.setDate(fechaInicio.getDate() + 5);

    const diaInicio = fechaInicio.getDate();
    const diaFin = fechaFin.getDate();
    const mesInicio = MESES_ES[fechaInicio.getMonth()];
    const mesFin = MESES_ES[fechaFin.getMonth()];

    let titulo: string;
    if (mesInicio === mesFin) {
      titulo = `SEMANA ${diaInicio} AL ${diaFin} DE ${mesInicio}`;
    } else {
      titulo = `SEMANA ${diaInicio} DE ${mesInicio} AL ${diaFin} DE ${mesFin}`;
    }

    semanas.push({
      valor: titulo,
      titulo,
      fechaInicio,
    });
  }

  return semanas;
}

export function getFechasDeSemana(fechaInicio: Date): Map<DiaSemana, FechaDia> {
  const dias: DiaSemana[] = ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];
  const resultado = new Map<DiaSemana, FechaDia>();
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const MESES_ES_CORTO = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  dias.forEach((dia, index) => {
    const fecha = new Date(fechaInicio);
    fecha.setDate(fechaInicio.getDate() + index);

    const esPasado = fecha < hoy;

    resultado.set(dia, {
      dia: fecha.getDate(),
      mes: MESES_ES_CORTO[fecha.getMonth()],
      fecha,
      esPasado,
    });
  });

  return resultado;
}

// ── Tipos para BD API (backend /bd/reservas) ─────────────────────
export interface ReservaBD {
  id: number;
  local: string;
  tipo: string;
  fecha: string; // "2025-04-04"
  hora_desde: string; // "8:00"
  hora_hasta: string; // "9:30"
  cliente: string;
  numero_telefono?: string;
  servicio: string;
  servicio_solicitado?: string | null;
  servicio_confirmado?: string | null;
  precio?: number;
  plan_id?: number;
  notas?: string;
  estado?: EstadoReserva;
  notificado?: boolean;
  creado_en?: string;
  actualizado_en?: string;
}

export interface ReservasBDResponse {
  reservas: ReservaBD[];
  total: number;
}
