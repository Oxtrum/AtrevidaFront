import { apiClient } from './client';
import { withLocalIdScope } from './localScope';
import type { ApiResponse } from '@/types/reserva';
import type {
  AjusteInventarioInput,
  AlertasInventario,
  CategoriaInventario,
  GetInventarioItemsParams,
  GetMovimientosParams,
  InventarioItem,
  InventarioItemInput,
  MovimientoInventario,
  ServicioInsumo,
} from '@/types/inventario';

// Las funciones devuelven el payload ya desenvuelto: si el shape final del
// backend difiere del plan, el ajuste queda aquí y no en los componentes.

export async function getInventarioItems(params: GetInventarioItemsParams = {}): Promise<InventarioItem[]> {
  const scoped = withLocalIdScope(params);
  const res = await apiClient.get<ApiResponse<{ items: InventarioItem[] }>>('/bd/inventario/items', {
    params: {
      ...scoped,
      bajo_stock: scoped.bajo_stock ? 'true' : undefined,
      activo: scoped.activo === undefined ? undefined : String(scoped.activo),
      limit: scoped.limit ?? 200,
    },
  });
  return res.data?.items ?? [];
}

export async function getInventarioItem(id: number): Promise<InventarioItem> {
  const res = await apiClient.get<ApiResponse<{ item: InventarioItem }>>(`/bd/inventario/items/${id}`);
  return res.data.item;
}

export async function crearInventarioItem(data: InventarioItemInput): Promise<InventarioItem> {
  const res = await apiClient.post<ApiResponse<{ item: InventarioItem }>>('/bd/inventario/items', data);
  return res.data.item;
}

export async function actualizarInventarioItem(id: number, data: Partial<InventarioItemInput>): Promise<void> {
  await apiClient.patch(`/bd/inventario/items/${id}`, data);
}

/** Desactiva el ítem (RN-07: nunca se borra físicamente). */
export async function desactivarInventarioItem(id: number): Promise<void> {
  await apiClient.delete(`/bd/inventario/items/${id}`);
}

// ── Imagen: upload-url → PUT directo al storage → PUT imagen (confirmar key) ──

interface UploadUrlResponse {
  upload_url: string;
  imagen_key: string;
}

export async function subirImagenInventarioItem(id: number, file: File): Promise<void> {
  const signed = await apiClient.post<ApiResponse<UploadUrlResponse>>(
    `/bd/inventario/items/${id}/imagen/upload-url`,
    { content_type: file.type, size: file.size },
  );
  const put = await fetch(signed.data.upload_url, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });
  if (!put.ok) throw new Error('No se pudo subir la imagen al almacenamiento');
  await apiClient.put(`/bd/inventario/items/${id}/imagen`, { imagen_key: signed.data.imagen_key });
}

export async function quitarImagenInventarioItem(id: number): Promise<void> {
  await apiClient.delete(`/bd/inventario/items/${id}/imagen`);
}

// ── Categorías ──

export async function getCategoriasInventario(): Promise<CategoriaInventario[]> {
  const res = await apiClient.get<ApiResponse<{ categorias: CategoriaInventario[] }>>('/bd/inventario/categorias');
  return res.data?.categorias ?? [];
}

export async function guardarCategoriaInventario(
  data: { nombre: string; activo?: boolean },
  id?: number,
): Promise<void> {
  if (id) await apiClient.patch(`/bd/inventario/categorias/${id}`, data);
  else await apiClient.post('/bd/inventario/categorias', data);
}

// ── Kardex y ajustes ──

export async function getMovimientosInventario(params: GetMovimientosParams = {}): Promise<MovimientoInventario[]> {
  const scoped = withLocalIdScope(params);
  const res = await apiClient.get<ApiResponse<{ movimientos: MovimientoInventario[] }>>('/bd/inventario/movimientos', {
    params: { ...scoped, limit: scoped.limit ?? 200 },
  });
  return res.data?.movimientos ?? [];
}

export async function ajustarInventario(data: AjusteInventarioInput): Promise<void> {
  await apiClient.post('/bd/inventario/ajustes', data);
}

export async function getAlertasInventario(): Promise<AlertasInventario> {
  const scoped = withLocalIdScope<{ local_id?: number }>({});
  const res = await apiClient.get<ApiResponse<AlertasInventario>>('/bd/inventario/alertas', { params: scoped });
  return res.data;
}

// ── Insumos por servicio (RN-10) ──

export async function getInsumosServicio(servicioId: number): Promise<ServicioInsumo[]> {
  const res = await apiClient.get<ApiResponse<{ insumos: ServicioInsumo[] }>>(`/bd/servicios/${servicioId}/insumos`);
  return res.data?.insumos ?? [];
}

export async function guardarInsumosServicio(servicioId: number, insumos: ServicioInsumo[]): Promise<void> {
  await apiClient.put(`/bd/servicios/${servicioId}/insumos`, {
    insumos: insumos.map(({ item_id, cantidad_por_sesion }) => ({ item_id, cantidad_por_sesion })),
  });
}
