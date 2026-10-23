import { apiClient } from './client';
import type { ApiResponse } from '@/types/reserva';
import type { ConfiguracionSistema } from '@/types/finanzas';

export async function getConfiguracion(): Promise<ConfiguracionSistema> {
  const res = await apiClient.get<ApiResponse<{ configuracion: ConfiguracionSistema }>>('/bd/configuracion');
  return res.data.configuracion;
}

export async function actualizarConfiguracion(
  patch: Partial<ConfiguracionSistema>,
): Promise<ConfiguracionSistema> {
  const res = await apiClient.patch<ApiResponse<{ configuracion: ConfiguracionSistema }>>('/bd/configuracion', patch);
  return res.data.configuracion;
}

export interface ConfiguracionPublica {
  mostrar_paquetes: boolean;
}

/** GET /bd/configuracion/publica — lo que la página principal necesita; no requiere sesión. */
export async function getConfiguracionPublica(): Promise<ConfiguracionPublica> {
  const res = await apiClient.get<ApiResponse<ConfiguracionPublica>>('/bd/configuracion/publica', { auth: 'none' });
  return res.data;
}
