import { apiClient } from './client';
import { withNombreLocalScope } from './localScope';
import type { ApiResponse } from '@/types/reserva';
import type { GetReporteFinancieroParams, ReporteFinancieroResponse } from '@/types/finanzas';

/** Ingresos vs egresos del periodo (PLAN §5.6). `/bd/pagos/resumen` sigue intacto. */
export async function getReporteFinancieroDB(
  params: GetReporteFinancieroParams,
): Promise<ReporteFinancieroResponse> {
  const scoped = withNombreLocalScope(params);
  const res = await apiClient.get<ApiResponse<ReporteFinancieroResponse>>('/bd/reportes/financiero', {
    params: { ...scoped },
  });
  return res.data;
}
