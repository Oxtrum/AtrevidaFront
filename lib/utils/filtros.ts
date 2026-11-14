/** Hay al menos un filtro con valor. Los textos en blanco, null, undefined y false cuentan como vacíos. */
export function hayFiltrosActivos(valores: unknown[]): boolean {
  return valores.some((valor) => {
    if (valor === undefined || valor === null || valor === false) return false;
    if (typeof valor === 'string') return valor.trim() !== '';
    return true;
  });
}
