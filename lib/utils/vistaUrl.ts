/**
 * Atenciones guarda los filtros de cada pestaña en la URL (?vista=jornada&fecha=…).
 * Estas dos funciones son el único lugar que sabe leer y escribir ese formato.
 */

/** Lee las claves pedidas; si la URL es de otra vista, todas vuelven vacías. */
export function leerVista(search: string, vista: string, claves: string[]): Record<string, string> {
  const params = new URLSearchParams(search);
  const activa = params.get('vista') === vista;
  return Object.fromEntries(claves.map((clave) => [clave, activa ? (params.get(clave) ?? '') : '']));
}

type Valor = string | number | boolean | null | undefined;

/** Query string con la vista primero; omite lo vacío para que el enlace sea corto y legible. */
export function armarVista(vista: string, valores: Record<string, Valor>): string {
  const params = new URLSearchParams({ vista });
  for (const [clave, valor] of Object.entries(valores)) {
    if (valor === undefined || valor === null || valor === false) continue;
    const texto = String(valor).trim();
    if (texto) params.set(clave, texto);
  }
  return params.toString();
}
