/** La modalidad decide la etiqueta; un costo variable cero no significa gratis. */
export function formatCostoServicio(servicio: {
  costo: number | string | null | undefined;
  costo_variable?: boolean;
}): string {
  if (servicio.costo_variable === true) return 'Variable';
  if (servicio.costo == null || String(servicio.costo).trim() === '') return '—';
  const costo = Number(servicio.costo);
  if (!Number.isFinite(costo) || costo < 0) return '—';
  if (costo === 0) return 'Gratis';
  return `Bs. ${costo.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Usa la modalidad historica de la reserva, sin consultar el catalogo actual. */
export function formatCostoReserva(reserva: { precio?: number | null; costo_variable?: boolean | null }): string {
  return formatCostoServicio({ costo: reserva.precio, costo_variable: reserva.costo_variable === true });
}
