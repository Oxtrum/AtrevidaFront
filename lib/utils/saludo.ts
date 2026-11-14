/** Titulo del dashboard: el saludo del momento y, si se conoce, el nombre de quien entro. */
export function tituloSaludo(saludo: string, username: string | null | undefined): { title: string; accentWord: string } {
  const nombre = (username ?? '').trim();
  if (!nombre) return { title: saludo, accentWord: saludo };
  const visible = nombre.charAt(0).toUpperCase() + nombre.slice(1);
  return { title: `${saludo}, ${visible}`, accentWord: visible };
}
