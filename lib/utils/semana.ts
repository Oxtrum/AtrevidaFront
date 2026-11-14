const aUTC = (iso: string) => {
  const [anio, mes, dia] = iso.split('-').map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia));
};

/** Mueve una fecha YYYY-MM-DD uno o más días (negativo retrocede). Cuenta en días del calendario, sin horas. */
export function sumarDias(iso: string, dias: number): string {
  const fecha = aUTC(iso);
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  return fecha.toISOString().slice(0, 10);
}

/** Mueve una fecha YYYY-MM-DD una o más semanas (negativo retrocede). */
export function moverSemana(iso: string, semanas: number): string {
  return sumarDias(iso, semanas * 7);
}

/** Lunes de la semana a la que pertenece cualquier día. */
export function lunesDe(iso: string): string {
  const dia = aUTC(iso).getUTCDay();
  return sumarDias(iso, dia === 0 ? -6 : 1 - dia);
}

/** Días de la semana desde el lunes (por defecto lunes a sábado, la semana de atención). */
export function diasDeSemana(iso: string, cantidad = 6): string[] {
  const lunes = lunesDe(iso);
  return Array.from({ length: cantidad }, (_, i) => sumarDias(lunes, i));
}

const MESES = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];

/** "9 AL 14 DE NOVIEMBRE DE 2026" para la semana (lunes a sábado) de cualquier día. */
export function tituloSemana(iso: string): string {
  const lunes = aUTC(lunesDe(iso));
  const sabado = aUTC(sumarDias(lunesDe(iso), 5));
  const mesInicio = MESES[lunes.getUTCMonth()];
  const mesFin = MESES[sabado.getUTCMonth()];
  const rango = mesInicio === mesFin
    ? `${lunes.getUTCDate()} AL ${sabado.getUTCDate()} DE ${mesFin}`
    : `${lunes.getUTCDate()} DE ${mesInicio} AL ${sabado.getUTCDate()} DE ${mesFin}`;
  return `${rango} DE ${sabado.getUTCFullYear()}`;
}

/** Una entrada por semana entre dos fechas, ambas incluidas. Alimenta el selector de semanas. */
export function semanasEntre(minISO: string, maxISO: string): { inicio: string; titulo: string }[] {
  const semanas: { inicio: string; titulo: string }[] = [];
  for (let inicio = lunesDe(minISO); inicio <= maxISO; inicio = moverSemana(inicio, 1)) {
    semanas.push({ inicio, titulo: tituloSemana(inicio) });
  }
  return semanas;
}

/** Un día adelante o atrás saltando el domingo (no hay atención). */
export function moverDiaHabil(iso: string, sentido: 1 | -1): string {
  const siguiente = sumarDias(iso, sentido);
  return aUTC(siguiente).getUTCDay() === 0 ? sumarDias(siguiente, sentido) : siguiente;
}
