/**
 * Indica si un movimiento se registro en un dia distinto al que ocurrio (p. ej. lo anotado en papel y pasado de noche).
 * Compara el dia local de ambas fechas; con datos ausentes o invalidos no avisa.
 */
export function registradoOtroDia(fechaHecho: string, registradoEn?: string | null): boolean {
  if (!registradoEn) return false;
  const hecho = new Date(fechaHecho);
  const registro = new Date(registradoEn);
  if (Number.isNaN(hecho.getTime()) || Number.isNaN(registro.getTime())) return false;
  return hecho.toDateString() !== registro.toDateString();
}
