import { apiClient } from './client';
import type { ApiResponse } from '@/types/reserva';

export interface UsuarioResumen {
  username: string;
  activo: boolean;
  fecha_registro: string;
  rol_codigo: string;
  rol_nombre: string;
  local_id?: number | null;
  nombre_local?: string | null;
  lugar_id?: number | null;
  nombre_lugar?: string | null;
}

export type RolCodigo = 'admin_sys' | 'gerencia';

export interface LoginResponse {
  expires_in: number;
  token: string;
  token_type: string;
  username: string;
  rol_codigo?: string;
  local_id?: number | null;
  nombre_local?: string | null;
  lugar_id?: number | null;
  nombre_lugar?: string | null;
}

export interface UsuariosListResponse {
  total: number;
  usuarios: UsuarioResumen[];
}

export interface CambiarPasswordPayload {
  password_actual: string;
  password_nueva: string;
}

export interface CambiarUsuarioLocalPayload {
  username: string;
  local_id: number;
}

export async function loginAuth(
  username: string,
  password: string,
): Promise<ApiResponse<LoginResponse>> {
  return apiClient.post<ApiResponse<LoginResponse>>('/auth/login', { username, password });
}

export async function registrarUsuario(
  username: string,
  password: string,
  rolCodigo: RolCodigo,
  localId?: number,
): Promise<ApiResponse<{ id: number }>> {
  return apiClient.post<ApiResponse<{ id: number }>>('/auth/register', {
    username,
    password,
    rol_codigo: rolCodigo,
    ...(rolCodigo !== 'admin_sys' && localId !== undefined && { local_id: localId }),
  });
}

export async function getUsuarios(): Promise<ApiResponse<UsuariosListResponse>> {
  return apiClient.get<ApiResponse<UsuariosListResponse>>('/auth/usuarios');
}

export async function cambiarPassword(
  payload: CambiarPasswordPayload | string,
): Promise<ApiResponse<{ mensaje: string }>> {
  if (typeof payload === 'string') {
    return apiClient.patch<ApiResponse<{ mensaje: string }>>('/auth/change-password', { password: payload });
  }

  return apiClient.patch<ApiResponse<{ mensaje: string }>>('/auth/change-password', {
    password_actual: payload.password_actual,
    password_nueva: payload.password_nueva,
    password: payload.password_nueva,
  });
}

export async function cambiarUsuarioLocal(
  payload: CambiarUsuarioLocalPayload,
): Promise<ApiResponse<{ mensaje: string }>> {
  return apiClient.patch<ApiResponse<{ mensaje: string }>>('/auth/usuarios/local', {
    username: payload.username,
    local_id: payload.local_id,
  });
}

export async function toggleUsuarioActivo(
  username: string,
  activo: boolean,
): Promise<ApiResponse<{ mensaje: string }>> {
  return apiClient.patch<ApiResponse<{ mensaje: string }>>('/auth/deactivate', { username, activo });
}
