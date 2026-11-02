export function formatDateTime(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

/** Solo la fecha (dd/mm/aaaa) en hora local; no salta de dia para lo registrado de noche. */
export function formatFecha(iso?: string | null): string {
  const texto = formatDateTime(iso);
  return texto === '—' ? texto : texto.slice(0, 10);
}
