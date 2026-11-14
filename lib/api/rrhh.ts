import { apiClient } from './client';
import { subirAUrlFirmada } from './storage';
import type { ApiResponse } from '@/types/reserva';
import type {
  Adelanto,
  AdelantoInput,
  Empleado,
  EmpleadoInput,
  GetPlanillasParams,
  Planilla,
  PlanillaEdicion,
  PeriodoReporte,
  PlanillasResponse,
  ReporteAtencionesRRHH,
  TipoBono,
  TipoBonoInput,
} from '@/types/rrhh';
import type { MetodoPago } from '@/types/inventario';

// ── Empleados ──

export async function getEmpleados(): Promise<Empleado[]> {
  const res = await apiClient.get<ApiResponse<{ empleados: Empleado[] }>>('/bd/rrhh/empleados');
  return res.data?.empleados ?? [];
}

/** Crea o edita la ficha y devuelve el empleado (con su id, necesario para subir la foto). */
export async function guardarEmpleado(data: EmpleadoInput, id?: number): Promise<Empleado> {
  const res = id
    ? await apiClient.patch<ApiResponse<{ empleado: Empleado }>>(`/bd/rrhh/empleados/${id}`, data)
    : await apiClient.post<ApiResponse<{ empleado: Empleado }>>('/bd/rrhh/empleados', data);
  return res.data.empleado;
}

interface EmpleadoFotoUpload {
  upload_url: string;
  foto_key: string;
  /** Headers firmados en la URL: el PUT debe enviarlos exactamente. */
  headers?: Record<string, string>;
}

/** Sube la foto (ya en WebP) a una carpeta privada y devuelve una URL de lectura temporal. */
export async function subirFotoEmpleado(id: number, foto: Blob): Promise<string> {
  const firma = await apiClient.post<ApiResponse<EmpleadoFotoUpload>>(`/bd/rrhh/empleados/${id}/foto/upload-url`, undefined);
  const { upload_url, foto_key, headers } = firma.data;
  await subirAUrlFirmada(upload_url, foto, headers);
  const confirmada = await apiClient.put<ApiResponse<{ foto_url: string }>>(`/bd/rrhh/empleados/${id}/foto`, { foto_key });
  return confirmada.data.foto_url;
}

export async function eliminarFotoEmpleado(id: number): Promise<void> {
  await apiClient.delete(`/bd/rrhh/empleados/${id}/foto`);
}

/** Baja lógica: deja de generarse su planilla; el historial se conserva. */
export async function darDeBajaEmpleado(id: number): Promise<void> {
  const hoy = new Date();
  const fecha = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
  await apiClient.patch(`/bd/rrhh/empleados/${id}`, { activo: false, fecha_baja: fecha });
}

// ── Adelantos ──

export async function getAdelantos(params: { empleado_id?: number; pendientes?: boolean } = {}): Promise<Adelanto[]> {
  const res = await apiClient.get<ApiResponse<{ adelantos: Adelanto[] }>>('/bd/rrhh/adelantos', { params: { ...params } });
  return res.data?.adelantos ?? [];
}

export async function registrarAdelanto(data: AdelantoInput): Promise<void> {
  await apiClient.post('/bd/rrhh/adelantos', data);
}

/** Solo si el adelanto aún no se descontó en una planilla. */
export async function anularAdelanto(id: number): Promise<void> {
  await apiClient.delete(`/bd/rrhh/adelantos/${id}`);
}

// ── Tipos de bono ──

export async function getTiposBono(): Promise<TipoBono[]> {
  const res = await apiClient.get<ApiResponse<{ tipos: TipoBono[] }>>('/bd/rrhh/tipos-bono');
  return res.data?.tipos ?? [];
}

export async function guardarTipoBono(data: TipoBonoInput, id?: number): Promise<void> {
  if (id) await apiClient.patch(`/bd/rrhh/tipos-bono/${id}`, data);
  else await apiClient.post('/bd/rrhh/tipos-bono', data);
}

/** Un tipo no se borra (las planillas ya cargadas lo usan): se desactiva y deja de ofrecerse. */
export async function cambiarEstadoTipoBono(id: number, activo: boolean): Promise<void> {
  await apiClient.patch(`/bd/rrhh/tipos-bono/${id}`, { activo });
}

// ── Planillas ──

/** El backend genera antes las planillas vencidas (catch-up), así la lista siempre está al día. */
export async function getPlanillas(params: GetPlanillasParams = {}): Promise<PlanillasResponse> {
  const res = await apiClient.get<ApiResponse<PlanillasResponse>>('/bd/rrhh/planillas', { params: { ...params } });
  return res.data;
}

/** Genera ya la planilla de un empleado (para cargar bonos/faltas antes del día de pago, o regenerar una anulada). */
export async function generarPlanilla(empleado_id: number, periodo: string): Promise<Planilla> {
  const res = await apiClient.post<ApiResponse<{ planilla: Planilla }>>('/bd/rrhh/planillas', { empleado_id, periodo });
  return res.data.planilla;
}

export async function editarPlanilla(id: number, data: PlanillaEdicion): Promise<void> {
  await apiClient.patch(`/bd/rrhh/planillas/${id}`, data);
}

export async function pagarPlanilla(id: number, metodo_pago?: MetodoPago | null): Promise<void> {
  await apiClient.patch(`/bd/rrhh/planillas/${id}/pagar`, metodo_pago ? { metodo_pago } : {});
}

export async function anularPlanilla(id: number, motivo: string): Promise<void> {
  await apiClient.patch(`/bd/rrhh/planillas/${id}/anular`, { motivo });
}

// ── Reportes ──

/** Ranking del personal por atenciones en el periodo que contiene a `fecha` (YYYY-MM-DD), general y por local. */
export async function getReporteAtenciones(periodo: PeriodoReporte, fecha: string): Promise<ReporteAtencionesRRHH> {
  const res = await apiClient.get<ApiResponse<{ reporte: ReporteAtencionesRRHH }>>('/bd/rrhh/reportes/atenciones', {
    params: { periodo, fecha },
  });
  return res.data.reporte;
}
