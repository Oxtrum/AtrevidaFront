import { apiClient } from './client';
import { withLocalIdScope } from './localScope';
import type { ApiResponse } from '@/types/reserva';
import type {
  CategoriaFinanciera,
  GastoFijo,
  GastoFijoInput,
  FlujoFinancieroResponse,
  GastoFijoPendiente,
  GetFlujoFinancieroParams,
  GastoFijoProximo,
  GetMovimientosFinancierosParams,
  MovimientoFinanciero,
  MovimientoFinancieroInput,
} from '@/types/finanzas';

// ── Categorías financieras ──

export async function getCategoriasFinancieras(): Promise<CategoriaFinanciera[]> {
  const res = await apiClient.get<ApiResponse<{ categorias: CategoriaFinanciera[] }>>('/bd/finanzas/categorias');
  return res.data?.categorias ?? [];
}

export async function guardarCategoriaFinanciera(
  data: Omit<CategoriaFinanciera, 'id'>,
  id?: number,
): Promise<void> {
  if (id) await apiClient.patch(`/bd/finanzas/categorias/${id}`, data);
  else await apiClient.post('/bd/finanzas/categorias', data);
}

// ── Movimientos (egresos / otros ingresos) ──

export async function getMovimientosFinancieros(
  params: GetMovimientosFinancierosParams = {},
): Promise<MovimientoFinanciero[]> {
  const scoped = withLocalIdScope(params);
  const res = await apiClient.get<ApiResponse<{ movimientos: MovimientoFinanciero[] }>>(
    '/bd/finanzas/movimientos',
    { params: { ...scoped } },
  );
  return res.data?.movimientos ?? [];
}

export async function crearMovimientoFinanciero(data: MovimientoFinancieroInput): Promise<void> {
  await apiClient.post('/bd/finanzas/movimientos', data);
}

export async function actualizarMovimientoFinanciero(
  id: number,
  data: Partial<MovimientoFinancieroInput>,
): Promise<void> {
  await apiClient.patch(`/bd/finanzas/movimientos/${id}`, data);
}

export async function cambiarEstadoMovimientoFinanciero(
  id: number,
  estado: 'PAGADO' | 'ANULADO',
  motivo?: string,
): Promise<void> {
  await apiClient.patch(`/bd/finanzas/movimientos/${id}/estado`, { estado, motivo });
}

// ── Gastos fijos (plantillas) ──

export async function getGastosFijos(): Promise<GastoFijo[]> {
  const res = await apiClient.get<ApiResponse<{ gastos_fijos: GastoFijo[] }>>('/bd/finanzas/gastos-fijos');
  return res.data?.gastos_fijos ?? [];
}

export async function guardarGastoFijo(data: GastoFijoInput, id?: number): Promise<void> {
  if (id) await apiClient.patch(`/bd/finanzas/gastos-fijos/${id}`, data);
  else await apiClient.post('/bd/finanzas/gastos-fijos', data);
}

/** DELETE = activo=false (la historia ya generada se conserva). */
export async function desactivarGastoFijo(id: number): Promise<void> {
  await apiClient.delete(`/bd/finanzas/gastos-fijos/${id}`);
}

export async function getGastosFijosProximos(): Promise<GastoFijoProximo[]> {
  const res = await apiClient.get<ApiResponse<{ proximos: GastoFijoProximo[] }>>(
    '/bd/finanzas/gastos-fijos/proximos',
  );
  return res.data?.proximos ?? [];
}

/**
 * Vista previa (sin crear nada) de lo que `generarGastosFijos` registraría ahora.
 * Con `adelantar` suma el siguiente cobro aún no vencido de cada gasto fijo (`adelantado: true`).
 */
export async function getGastosFijosPendientes(adelantar = false): Promise<GastoFijoPendiente[]> {
  const res = await apiClient.get<ApiResponse<{ pendientes: GastoFijoPendiente[] }>>(
    `/bd/finanzas/gastos-fijos/pendientes${adelantar ? '?adelantar=true' : ''}`,
  );
  return res.data?.pendientes ?? [];
}

/** Dispara la generación idempotente (RN-32). Botón manual; el job diario la llama aparte. */
export async function generarGastosFijos(adelantar = false): Promise<void> {
  await apiClient.post(`/bd/finanzas/gastos-fijos/generar${adelantar ? '?adelantar=true' : ''}`, {});
}

/** Libro unificado de ventas, compras, gastos y otros ingresos, con saldo acumulado. */
export async function getFlujoFinanciero(params: GetFlujoFinancieroParams): Promise<FlujoFinancieroResponse> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') qs.set(k, String(v));
  });
  const res = await apiClient.get<ApiResponse<FlujoFinancieroResponse>>(`/bd/finanzas/flujo?${qs.toString()}`);
  return res.data;
}
