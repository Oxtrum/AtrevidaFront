import { apiClient } from './client';
import type { CombosApiResponse } from '@/types/combo';

/**
 * Obtiene los combos (paquetes) del catálogo público.
 * Sin filtro de local: devuelve todos los combos activos publicados.
 */
export async function getCombosDB(): Promise<CombosApiResponse> {
  return apiClient.get<CombosApiResponse>('/bd/combos');
}
