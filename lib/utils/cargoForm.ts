/** Cantidad de un insumo escrita por el usuario; acepta coma decimal. Null si no es un número mayor que 0. */
export function parseCantidad(texto: string): number | null {
  const n = Number(texto.trim().replace(',', '.'));
  return texto.trim() !== '' && Number.isFinite(n) && n > 0 ? n : null;
}

/** Monto que se propone al elegir un insumo o cambiar su cantidad; vacío si no hay precio o la cantidad no vale. */
export function montoSugerido(precioUnitario: number | null | undefined, cantidad: number): string {
  if (precioUnitario == null || !Number.isFinite(cantidad) || cantidad <= 0) return '';
  return String(Math.round(precioUnitario * cantidad * 100) / 100);
}

/** "Crema ×2": el concepto de un cargo de insumo. */
export function conceptoInsumo(nombre: string, cantidad: number): string {
  return `${nombre} ×${cantidad}`;
}
