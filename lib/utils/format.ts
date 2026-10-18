/** Formato de moneda para Trastienda (la moneda real viene de configuración: `finanzas.moneda`). */
export function formatMoney(value: number | null | undefined, moneda = 'Bs'): string {
  const n = Number(value ?? 0);
  return `${moneda} ${n.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Cantidades con hasta 3 decimales (NUMERIC(12,3)), sin ceros sobrantes. */
export function formatQty(value: number | null | undefined, unidad?: string): string {
  const n = Number(value ?? 0);
  const text = n.toLocaleString('es-BO', { maximumFractionDigits: 3 });
  return unidad ? `${text} ${unidad.toLowerCase()}` : text;
}

/** "2026-10-16" → "16/10/2026" sin pasar por Date (evita desfase de zona horaria). */
export function formatDateISO(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

export function formatDateTimeISO(iso: string): string {
  const d = new Date(iso);
  return `${formatDateISO(iso)} ${d.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}`;
}

/** "Gel: requiere 30 ml, disponible 0 ml; …" para toasts de advertencia de inventario. */
export function describirAdvertencias(
  advertencias: { item_nombre: string; requerido: number; disponible: number; unidad: string }[],
): string {
  return advertencias
    .map((a) => `${a.item_nombre}: requiere ${formatQty(a.requerido, a.unidad)}, disponible ${formatQty(a.disponible, a.unidad)}`)
    .join(' · ');
}

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** "2026-10" → rango completo del mes. */
export function monthRange(month: string): { desde: string; hasta: string } {
  const [y, m] = month.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return { desde: `${month}-01`, hasta: `${month}-${String(last).padStart(2, '0')}` };
}
