import { apiClient } from './client';
import { withLocalIdScope } from './localScope';
import type { ApiResponse } from '@/types/reserva';
import type { Compra, CompraInput } from '@/types/inventario';

export async function getCompras(): Promise<Compra[]> {
  const scoped = withLocalIdScope<{ local_id?: number }>({});
  const res = await apiClient.get<ApiResponse<{ compras: Compra[] }>>('/bd/compras', { params: scoped });
  return res.data?.compras ?? [];
}

export async function getCompra(id: number): Promise<Compra> {
  const res = await apiClient.get<ApiResponse<{ compra: Compra }>>(`/bd/compras/${id}`);
  return res.data.compra;
}

/** Atómico en backend: compra + entradas de stock + egreso VARIABLE (RN-21). */
export async function crearCompra(data: CompraInput): Promise<Compra> {
  const res = await apiClient.post<ApiResponse<{ compra: Compra }>>('/bd/compras', data);
  return res.data.compra;
}

export async function anularCompra(id: number, motivo: string): Promise<void> {
  await apiClient.patch(`/bd/compras/${id}/anular`, { motivo });
}
