/**
 * Servicio de Servicios, Combos y Locales — llamadas a /bd/servicios, /bd/combos y /bd/locales.
 */

import { apiClient } from './client';

// ─── Parámetros ───────────────────────────────────────────────────

export interface GetServiciosParams {
  local: string;
  nombre?: string;
  categoria?: string;
  sesiones?: number;
}

export interface GetCombosParams {
  local: string;
  nombre?: string;
  categoria?: string;
  sesiones?: number;
}

// ─── Servicios ─────────────────────────────────────────────────────

/** Obtiene servicios filtrados desde la base de datos. */
export async function getServiciosDB(params: GetServiciosParams) {
  return apiClient.get('/bd/servicios', {
    params: {
      local: params.local,
      nombre: params.nombre,
      categoria: params.categoria,
      sesiones: params.sesiones,
    },
  });
}

// ─── Combos ────────────────────────────────────────────────────────

/** Obtiene combos filtrados desde la base de datos. */
export async function getCombosDB(params: GetCombosParams) {
  return apiClient.get('/bd/combos', {
    params: {
      local: params.local,
      nombre: params.nombre,
      categoria: params.categoria,
      sesiones: params.sesiones,
    },
  });
}

// ─── Locales ──────────────────────────────────────────────────────

/** Obtiene locales desde la base de datos. */
export async function getLocalesDB() {
  return apiClient.get('/bd/locales');
}
