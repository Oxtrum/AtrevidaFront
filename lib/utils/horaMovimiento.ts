/** Hora (HH:MM) de un movimiento del flujo. Solo las ventas y cobros la tienen; los gastos llegan a las 00:00 y no la muestran. */
export function horaDeMovimiento(origen: string, ts?: string | null): string {
  if (origen !== 'VENTA' || !ts) return '';
  const fecha = new Date(ts);
  if (Number.isNaN(fecha.getTime())) return '';
  return fecha.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false });
}
