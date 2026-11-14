// Como se nombra cada rol en pantalla. El codigo (gerencia) es el del backend y no cambia; el texto visible si.
const ETIQUETAS: Record<string, string> = {
  admin_sys: 'Administrador de sistema',
  admin: 'Administrador',
  coordinacion: 'Coordinadora',
  gerencia: 'Recepción',
};

/** Roles que trabajan sobre todos los locales y por eso no llevan local asignado. */
export function esRolGlobal(codigo: string | null | undefined): boolean {
  const limpio = (codigo ?? '').trim().toLowerCase();
  return limpio === 'admin_sys' || limpio === 'coordinacion';
}

export function etiquetaRol(codigo: string | null | undefined): string {
  const limpio = (codigo ?? '').trim();
  if (!limpio) return 'Sin rol';
  return ETIQUETAS[limpio.toLowerCase()] ?? limpio;
}
