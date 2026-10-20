import { apiClient } from './client';
import type { ApiResponse } from '@/types/reserva';
import type {
  Adelanto,
  AdelantoInput,
  Empleado,
  EmpleadoInput,
  GetPlanillasParams,
  Planilla,
  PlanillaEdicion,
  PlanillasResponse,
} from '@/types/rrhh';
import type { MetodoPago } from '@/types/inventario';

// ── Empleados ──

export async function getEmpleados(): Promise<Empleado[]> {
  const res = await apiClient.get<ApiResponse<{ empleados: Empleado[] }>>('/bd/rrhh/empleados');
  return res.data?.empleados ?? [];
}

export async function guardarEmpleado(data: EmpleadoInput, id?: number): Promise<void> {
  if (id) await apiClient.patch(`/bd/rrhh/empleados/${id}`, data);
  else await apiClient.post('/bd/rrhh/empleados', data);
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

export async function generarAguinaldos(anio: number): Promise<number> {
  const res = await apiClient.post<ApiResponse<{ generados: number }>>('/bd/rrhh/aguinaldos/generar', { anio });
  return res.data?.generados ?? 0;
}
