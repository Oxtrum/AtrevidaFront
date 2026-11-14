/**
 * Recorta una lista a `max` elementos sin perder los prioritarios: todos los prioritarios se conservan
 * y el resto de lugares los ocupan los primeros no prioritarios. El orden original no cambia.
 * Si hay más prioritarios que `max`, se devuelven solo los prioritarios.
 */
export function recortarConPrioridad<T>(lista: T[], max: number, esPrioritario?: (elemento: T) => boolean): T[] {
  if (lista.length <= max) return lista;
  if (!esPrioritario) return lista.slice(0, max);
  let libres = Math.max(max - lista.filter(esPrioritario).length, 0);
  return lista.filter((elemento) => esPrioritario(elemento) || libres-- > 0);
}
