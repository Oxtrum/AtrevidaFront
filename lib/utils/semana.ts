/** Mueve una fecha YYYY-MM-DD una o más semanas (negativo retrocede). Cuenta en días del calendario, sin horas. */
export function moverSemana(iso: string, semanas: number): string {
  const [anio, mes, dia] = iso.split('-').map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia + semanas * 7));
  return fecha.toISOString().slice(0, 10);
}
