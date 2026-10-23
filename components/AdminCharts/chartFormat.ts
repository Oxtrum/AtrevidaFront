/** Ejes: 0 / 1K / 1.2M, sin moneda para no recargar el eje. */
export function compactNumber(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}${trim(abs / 1_000_000)}M`;
  if (abs >= 1_000) return `${sign}${trim(abs / 1_000)}K`;
  return `${sign}${Math.round(abs)}`;
}

const trim = (n: number) => (n >= 100 ? Math.round(n) : Math.round(n * 10) / 10).toString();

const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MESES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** "2026-10-15" → "15 oct" (eje) o "mié 15 oct" (tooltip). */
export function formatDia(iso: string, conDiaSemana = false): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const fecha = new Date(y, m - 1, d);
  const base = `${d} ${MESES_CORTO[m - 1]}`;
  return conDiaSemana ? `${DIAS[fecha.getDay()]} ${base}` : base;
}

/** Todos los días entre dos fechas ISO (incluidas), para que una serie diaria no salte los días sin movimientos. */
export function diasEntre(desde: string, hasta: string): string[] {
  const out: string[] = [];
  const [y, m, d] = desde.split('-').map(Number);
  const fin = new Date(`${hasta}T00:00:00`);
  for (let cur = new Date(y, m - 1, d); cur <= fin; cur.setDate(cur.getDate() + 1)) {
    out.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`);
  }
  return out;
}
