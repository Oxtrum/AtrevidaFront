// Como se nombra cada rol en pantalla. El codigo (gerencia) es el del backend y no cambia; el texto visible si.
const ETIQUETAS: Record<string, string> = {
  admin_sys: 'Administrador de sistema',
  admin: 'Administrador',
  gerencia: 'Recepción',
};

export function etiquetaRol(codigo: string | null | undefined): string {
  const limpio = (codigo ?? '').trim();
  if (!limpio) return 'Sin rol';
  return ETIQUETAS[limpio.toLowerCase()] ?? limpio;
}
