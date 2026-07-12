/**
 * Servicio de Servicios, Combos y Locales — llamadas a /bd/servicios, /bd/combos y /bd/locales.
 */

import { apiClient } from './client';
import { withLocalIdScope, withNombreLocalScope } from './localScope';
import type { ApiResponse } from '@/types/reserva';

// ─── Parámetros ───────────────────────────────────────────────────

export interface GetServiciosParams {
  local?: string;
  nombre?: string;
  categoria?: string;
  sesiones?: number;
  requiere_evaluacion?: boolean;
  paciente_nuevo?: boolean;
}

export interface GetCombosParams {
  local?: string;
  nombre?: string;
  categoria?: string;
  sesiones?: number;
}

export interface GetCategoriasParams {
  local?: string;
  local_id?: number;
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
export async function getCategoriasDB(params: GetCategoriasParams = {}) {
  const scopedParams = withLocalIdScope(params);

  return apiClient.get('/bd/categorias', {
    params: {
      local: scopedParams.local,
      local_id: scopedParams.local_id,
    },
  });
}

/** Crea una nueva categoría, opcionalmente asociada a un local. */
export async function crearCategoriaDB(nombre: string, localId?: number) {
  return apiClient.post('/bd/categorias', { nombre, local_id: localId });
}

/** Actualiza el nombre de una categoría existente. */
export async function actualizarCategoriaDB(id: number | string, nombre: string) {
  return apiClient.put(`/bd/categorias/${id}`, { nombre });
}

/** Elimina una categoría (falla si está en uso por servicios o combos). */
export async function eliminarCategoriaDB(id: number | string) {
  return apiClient.delete(`/bd/categorias/${id}`);
}

/** Obtiene los locales asociados a una categoría. */
export async function getLocalesDeCategoriaDB(id: number | string) {
  return apiClient.get<ApiResponse<{ locales: LocalRow[] }>>(`/bd/categorias/${id}/locales`);
}

/** Asocia una categoría a un local. */
export async function asociarCategoriaLocalDB(categoriaId: number, localId: number) {
  return apiClient.post('/bd/categorias/locales', { categoria_id: categoriaId, local_id: localId });
}

/** Elimina la asociación entre una categoría y un local. */
export async function desasociarCategoriaLocalDB(categoriaId: number, localId: number) {
  return apiClient.delete('/bd/categorias/locales', {
    body: { categoria_id: categoriaId, local_id: localId },
  });
}

// ─── Servicios ─────────────────────────────────────────────────────

/** Obtiene servicios filtrados desde la base de datos. */
/** Fila de servicio devuelta por /bd/servicios. */
export interface ServicioRow {
  [key: string]: unknown;
  id: number;
  nombre: string;
  costo: number | string;
  categoria?: string;
  activo?: boolean;
  tiempo?: unknown;
  sesiones?: unknown;
  tipoEspacio?: unknown;
  local?: unknown;
  requiere_evaluacion?: unknown;
}

export async function getServiciosDB(
  params: GetServiciosParams,
): Promise<ApiResponse<{ servicios: ServicioRow[] }>> {
  const scopedParams = withNombreLocalScope(params);

  return apiClient.get<ApiResponse<{ servicios: ServicioRow[] }>>('/bd/servicios', {
    params: {
      local: scopedParams.local,
      nombre: scopedParams.nombre,
      categoria: scopedParams.categoria,
      sesiones: scopedParams.sesiones,
      requiere_evaluacion: scopedParams.requiere_evaluacion?.toString(),
      paciente_nuevo: scopedParams.paciente_nuevo?.toString(),
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

/** PATCH /bd/servicios/{id}/local/{localId}/paciente-nuevo — toggle visibility for new patients. */
export async function togglePacienteNuevo(
  servicioId: number | string,
  localId: number | string,
  visible: boolean,
) {
  return apiClient.patch(
    `/bd/servicios/${servicioId}/local/${localId}/paciente-nuevo`,
    { visible_paciente_nuevo: visible },
  );
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
  const scopedParams = withNombreLocalScope(params);

  return apiClient.get('/bd/combos', {
    params: {
      local: scopedParams.local,
      nombre: scopedParams.nombre,
      categoria: scopedParams.categoria,
      sesiones: scopedParams.sesiones,
    },
  });
}

// ─── Combo Servicios ──────────────────────────────────────────────
// Nota: la edición de líneas usa PUT /bd/combos/{id}/servicios (reemplazarServiciosCombo
// en lib/api/combos.ts). No existen endpoints individuales POST/PATCH/DELETE.

/** GET /bd/combos/{combo_id}/servicios — list items of an active combo. */
export async function getComboServiciosDB(combo_id: number | string) {
  return apiClient.get(`/bd/combos/${combo_id}/servicios`);
}

// ─── Locales ──────────────────────────────────────────────────────

/** Fila de local devuelta por /bd/locales. */
export interface LocalRow {
  [key: string]: unknown;
  id: number;
  nombre: string;
  activo?: boolean;
  espacios?: unknown[] | null;
}

/** Obtiene locales desde la base de datos. */
export async function getLocalesDB(): Promise<ApiResponse<{ locales: LocalRow[] }>> {
  return apiClient.get<ApiResponse<{ locales: LocalRow[] }>>('/bd/locales');
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
