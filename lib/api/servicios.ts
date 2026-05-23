/**
 * Servicio de Servicios, Combos y Locales — llamadas a /bd/servicios, /bd/combos y /bd/locales.
 */

import { apiClient } from './client';

// ─── Parámetros ───────────────────────────────────────────────────

export interface GetServiciosParams {
  local?: string;
  nombre?: string;
  categoria?: string;
  sesiones?: number;
  requiere_evaluacion?: boolean;
}

export interface GetCombosParams {
  local: string;
  nombre?: string;
  categoria?: string;
  sesiones?: number;
}

export interface CrearLocalData {
  nombre: string;
  espacios: Array<{ tipo_espacio: string; cantidad_espacios: number }>;
}

/**
 * PATCH /bd/locales/{id} — spec body: { activo, nombre }.
 * `espacios` no es modificable por PATCH; se gestiona aparte si el backend
 * lo expone.
 */
export interface ActualizarLocalData {
  nombre?: string;
  activo?: boolean;
}

export interface CrearServicioData {
  nombre: string;
  categoria: string;
  tiempo: string;
  costo: number;
  sesiones: number;
  tipo_espacio_requerido: string;
  local: string;
  requiere_evaluacion?: boolean;
}

export interface ActualizarServicioData {
  nombre?: string;
  categoria?: string;
  tiempo?: string;
  costo?: number;
  sesiones?: number;
  tipo_espacio_requerido?: string;
  requiere_evaluacion?: boolean;
  activo?: boolean;
}

export interface ActivarServicioEnLocalData {
  local: string;
}

// ─── Categorías ───────────────────────────────────────────────────

/** Obtiene todas las categorías desde la base de datos. */
export async function getCategoriasDB() {
  return apiClient.get('/bd/categorias');
}

/** Crea una nueva categoría. */
export async function crearCategoriaDB(nombre: string) {
  return apiClient.post('/bd/categorias', { nombre });
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
      requiere_evaluacion: params.requiere_evaluacion?.toString(),
    },
  });
}

/** Obtiene un servicio por su ID. */
export async function getServicioByID(id: number | string) {
  return apiClient.get(`/bd/servicios/${id}`);
}

/** Crea un nuevo servicio. */
export async function crearServicioDB(data: CrearServicioData) {
  return apiClient.post('/bd/servicios', data);
}

/** Actualiza un servicio existente. */
export async function actualizarServicio(id: number | string, data: ActualizarServicioData) {
  return apiClient.patch(`/bd/servicios/${id}`, data);
}

/** Borrado lógico de un servicio (DELETE /bd/servicios/{id} → activo=false). */
export async function eliminarServicioDB(id: number | string) {
  return apiClient.delete(`/bd/servicios/${id}`);
}

/** Asocia (activa) un servicio existente a un local. */
export async function activarServicioEnLocal(
  id: number | string,
  data: ActivarServicioEnLocalData,
) {
  return apiClient.post(`/bd/servicios/local/${id}`, data);
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

/** Obtiene un local por su ID. */
export async function getLocalByID(id: number | string) {
  return apiClient.get(`/bd/locales/${id}`);
}

/** Crea un nuevo local con sus espacios. */
export async function crearLocalDB(data: CrearLocalData) {
  return apiClient.post('/bd/locales', data);
}

/** Actualiza un local existente (nombre / activo). */
export async function actualizarLocal(id: number | string, data: ActualizarLocalData) {
  return apiClient.patch(`/bd/locales/${id}`, data);
}

/** Borrado lógico de un local (DELETE /bd/locales/{id} → activo=false). */
export async function eliminarLocalDB(id: number | string) {
  return apiClient.delete(`/bd/locales/${id}`);
}
