import { INT, MONEY, hojaTabla } from './libroFinanciero';
import { getReporteClientesDetalle } from '@/lib/api/reportes';
import type { ClienteReporte, ReporteClientes, ReporteClientesBloque } from '@/types/reporteClientes';

const PCT1 = '0.0"%"';

/** El servidor entrega como máximo 100 clientes por página. */
const LIMITE_PAGINA = 100;
/** Tope de páginas del Excel (20 000 clientes), para que un cursor defectuoso no deje el navegador pidiendo sin fin. */
const MAX_PAGINAS = 200;

/** Recorre todas las páginas del detalle, en el orden por defecto (dinero generado). */
async function todosLosClientes(reporte: ReporteClientes, localId: number | null): Promise<ClienteReporte[]> {
  const out: ClienteReporte[] = [];
  let cursor: string | undefined;
  for (let pagina = 0; pagina < MAX_PAGINAS; pagina++) {
    const res = await getReporteClientesDetalle({
      periodo: reporte.periodo, fecha: reporte.desde, local_id: localId ?? undefined, limit: LIMITE_PAGINA, cursor,
    });
    out.push(...res.clientes);
    if (!res.paginacion?.has_more || !res.paginacion.next_cursor) return out;
    cursor = res.paginacion.next_cursor;
  }
  throw new Error('El reporte tiene demasiados clientes para exportarlo de una vez');
}

interface OpcionesReporteClientes {
  reporte: ReporteClientes;
  /** Bloque que se está viendo: general o un local. */
  bloque: ReporteClientesBloque;
  /** Texto del periodo, p. ej. "Noviembre 2026". */
  etiqueta: string;
  moneda: string;
}

/** Descarga el reporte de clientes del periodo en Excel: resumen, clientes, deudores y comparativo por local. */
export async function descargarReporteClientes({ reporte, bloque, etiqueta, moneda }: OpcionesReporteClientes): Promise<void> {
  const ExcelJS = await import('exceljs');
  const wb = new ExcelJS.Workbook();
  wb.created = new Date();

  const esGeneral = bloque.local_id === null;
  const ambito = esGeneral ? 'Todos los locales' : bloque.local_nombre;
  const alcance = `${etiqueta} · ${ambito}`;
  const m = (texto: string) => `${texto} (${moneda})`;
  const r = bloque.resumen;
  const clientes = await todosLosClientes(reporte, bloque.local_id);
  const tituloDeudores = r.deudores > bloque.deudores.length
    ? `Los ${bloque.deudores.length} clientes que más deben hoy (de ${r.deudores}; la lista completa está en Clientes → Con deuda)`
    : 'Clientes con saldo pendiente hoy';

  hojaTabla(wb, 'Resumen', 'FFEC008C', 'Reporte de clientes', alcance, ['Indicador', 'Periodo', 'Periodo anterior'], [
    ['Clientes activos', r.clientes_activos, r.clientes_activos_anterior],
    ['Clientes nuevos', r.clientes_nuevos, null],
    ['Clientes recurrentes', r.clientes_recurrentes, null],
    [m('Ingresos de clientes'), r.ingresos, r.ingresos_anterior],
    [m('Ticket promedio por cliente'), r.ticket_promedio_cliente, r.ticket_promedio_cliente_anterior],
    ['Citas completadas', r.citas, r.citas_anterior],
    ['Reservas canceladas', r.canceladas, null],
    ['Canceladas por inasistencia', r.inasistencias, null],
    ['Clientes del periodo anterior que volvieron', r.clientes_que_volvieron, null],
    ['Tasa de retorno (%)', r.tasa_retorno_pct, null],
    [m('Ventas sin cliente asignado'), r.ingresos_sin_cliente, null],
    ['Ventas sin cliente asignado (%)', r.ingresos_sin_cliente_pct, null],
    ['Citas completadas sin cliente', r.citas_sin_cliente, null],
    [m('Por cobrar hoy'), r.por_cobrar, null],
    ['Clientes con deuda hoy', r.deudores, null],
    ...(esGeneral ? [['Clientes en más de un local', r.clientes_compartidos, null]] : []),
  ], [44, 18, 18], { congelar: false });

  hojaTabla(wb, 'Clientes', 'FF14AEEF', 'Clientes con movimiento en el periodo', alcance,
    ['#', 'Cliente', 'Teléfono', 'Locales', m('Dinero'), '% del total', m('Periodo anterior'), 'Variación %', 'Pagos', m('Ticket promedio'),
      'Citas', 'Citas anterior', 'Agendadas', 'Canceladas', 'Inasistencias', 'Servicio favorito', 'Veces', 'Periodos seguidos', 'Nuevo',
      'Última actividad', m('Saldo pendiente')],
    clientes.map((c) => [
      c.posicion, c.nombre, c.telefono, c.locales, c.ingresos, c.participacion_pct, c.ingresos_anterior, c.variacion_pct, c.pagos,
      c.ticket_promedio, c.citas, c.citas_anterior, c.citas_agendadas, c.canceladas, c.inasistencias, c.servicio_top,
      c.servicio_top_cantidad || null, c.racha_periodos, c.es_nuevo ? 'Sí' : 'No', c.ultima_actividad, c.saldo_pendiente,
    ]),
    [5, 30, 14, 28, 14, 11, 16, 12, 8, 16, 8, 12, 11, 11, 13, 28, 8, 12, 8, 15, 16],
    { formatos: { 5: MONEY, 6: PCT1, 7: MONEY, 8: PCT1, 9: INT, 10: MONEY, 21: MONEY }, totales: [5, 7, 21], filtro: true });

  hojaTabla(wb, 'Deudores', 'FF92278F', tituloDeudores, `${ambito} · no depende del periodo`,
    ['Cliente', 'Teléfono', m('Saldo pendiente'), 'Cargos pendientes', 'Debe desde', 'Días'],
    bloque.deudores.map((d) => [d.nombre, d.telefono, d.saldo_pendiente, d.cargos, d.deuda_desde, d.dias_deuda]),
    [30, 14, 18, 16, 14, 8], { formatos: { 3: MONEY, 4: INT, 6: INT }, totales: [3], filtro: true });

  if (esGeneral && reporte.locales.length > 0) {
    hojaTabla(wb, 'Por local', 'FFFFE600', 'Comparativo por local', etiqueta,
      ['Local', 'Clientes activos', 'Nuevos', m('Ingresos de clientes'), m('Ticket por cliente'), 'Citas', 'Canceladas', 'Retorno %',
        m('Ventas sin cliente'), m('Por cobrar hoy')],
      reporte.locales.map((l) => [
        l.local_nombre, l.resumen.clientes_activos, l.resumen.clientes_nuevos, l.resumen.ingresos, l.resumen.ticket_promedio_cliente,
        l.resumen.citas, l.resumen.canceladas, l.resumen.tasa_retorno_pct, l.resumen.ingresos_sin_cliente, l.resumen.por_cobrar,
      ]),
      [24, 14, 10, 20, 18, 8, 12, 11, 18, 16],
      { formatos: { 4: MONEY, 5: MONEY, 8: PCT1, 9: MONEY, 10: MONEY }, congelar: false });
  }

  const buffer = await wb.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const a = document.createElement('a');
  a.href = url;
  const sufijo = esGeneral ? '' : `-${bloque.local_nombre.toLowerCase().replace(/\s+/g, '-')}`;
  a.download = `reporte-clientes-${reporte.desde}-a-${reporte.hasta}${sufijo}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
