/** "1 atención", "12 atenciones" y, desde la segunda página, "· página 2". */
export function cantidadTexto(total: number, singular: string, plural: string, pagina = 1): string {
  const texto = `${total.toLocaleString('es-BO')} ${total === 1 ? singular : plural}`;
  return pagina > 1 ? `${texto} · página ${pagina}` : texto;
}
