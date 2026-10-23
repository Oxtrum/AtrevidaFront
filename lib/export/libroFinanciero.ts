import type { Workbook, Worksheet } from 'exceljs';
import { getReporteFinancieroDB } from '@/lib/api/reportes';
import { getFlujoFinanciero } from '@/lib/api/finanzas';
import { getVentasDetalleDB } from '@/lib/api/pagos';
import type { VentaDetalleLinea } from '@/lib/api/pagos';
import { getPlanillas } from '@/lib/api/rrhh';
import { monthRange } from '@/lib/utils/format';
import type { FlujoOrigen } from '@/types/finanzas';

const ORIGEN_LABEL: Record<FlujoOrigen, string> = {
  VENTA: 'Venta',
  COMPRA: 'Compra de inventario',
  GASTO_FIJO: 'Egreso fijo',
  GASTO_VARIABLE: 'Gasto variable',
  OTRO_INGRESO: 'Otro ingreso',
};

const MONEY = '#,##0.00;[Red]-#,##0.00';
const INT = '#,##0';
const PCT = '0.0%';
const HEADER_FILL = 'FFEC008C';
// El endpoint de flujo entrega como maximo este numero de movimientos por consulta.
const LIMITE_MOVIMIENTOS = 1000;

interface OpcionesLibro {
  /** Mes YYYY-MM. */
  month: string;
  localId: number | null;
  localNombre: string;
  moneda: string;
}

type Celda = string | number | Date | null;

interface OpcionesTabla {
  formatos?: Record<number, string>;
  /** Columnas (base 1) con fila de total. */
  totales?: number[];
  etiquetaTotal?: string;
  congelar?: boolean;
  filtro?: boolean;
}

const colLetra = (n: number): string => {
  let s = '';
  for (let i = n; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s;
  return s;
};

function titulo(ws: Worksheet, texto: string, subtitulo: string) {
  ws.addRow([texto]).font = { bold: true, size: 14 };
  ws.addRow([subtitulo]).font = { italic: true, color: { argb: 'FF666666' } };
  ws.addRow([]);
}

function encabezado(ws: Worksheet, columnas: string[]) {
  const row = ws.addRow(columnas);
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
  row.alignment = { vertical: 'middle', wrapText: true };
  return row;
}

function seccion(ws: Worksheet, texto: string) {
  ws.addRow([]);
  const row = ws.addRow([texto]);
  row.font = { bold: true, size: 12, color: { argb: HEADER_FILL } };
}

function anchos(ws: Worksheet, valores: number[]) {
  ws.columns = valores.map((width) => ({ width }));
}

/** Hoja con titulo, encabezado, filas y (opcional) fila de totales con formulas SUM. */
function hojaTabla(
  wb: Workbook,
  nombre: string,
  tab: string,
  tituloHoja: string,
  alcance: string,
  columnas: string[],
  filas: Celda[][],
  ancho: number[],
  { formatos = {}, totales = [], etiquetaTotal = 'Total', congelar = true, filtro = false }: OpcionesTabla = {},
): Worksheet {
  const ws = wb.addWorksheet(nombre, {
    properties: { tabColor: { argb: tab } },
    views: congelar ? [{ state: 'frozen', ySplit: 4 }] : undefined,
  });
  titulo(ws, tituloHoja, alcance);
  const cab = encabezado(ws, columnas);
  filas.forEach((f) => {
    const row = ws.addRow(f);
    Object.entries(formatos).forEach(([c, fmt]) => { row.getCell(Number(c)).numFmt = fmt; });
  });
  const primera = cab.number + 1;
  const ultima = ws.rowCount;
  if (filtro && filas.length) ws.autoFilter = { from: { row: cab.number, column: 1 }, to: { row: ultima, column: columnas.length } };
  if (totales.length && filas.length) {
    const fila = ws.addRow([etiquetaTotal]);
    totales.forEach((c) => {
      const result = filas.reduce((s, f) => s + (typeof f[c - 1] === 'number' ? (f[c - 1] as number) : 0), 0);
      fila.getCell(c).value = { formula: `SUM(${colLetra(c)}${primera}:${colLetra(c)}${ultima})`, result };
      fila.getCell(c).numFmt = formatos[c] ?? MONEY;
    });
    fila.font = { bold: true };
  }
  anchos(ws, ancho);
  return ws;
}

const redondear = (v: number) => Math.round(v * 100) / 100;

/** YYYY-MM-DD en la zona horaria del navegador (la del negocio). */
function diaLocal(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const neto = (l: VentaDetalleLinea) => redondear(l.subtotal - l.descuento_prorrateado);
const tipoPagoLabel = (t: string) => (t === 'qr' ? 'QR' : t === 'efectivo' ? 'Efectivo' : t === 'sin_tipo' ? 'Sin tipo' : t);

interface PagoUnico {
  fecha: string;
  local: string;
  tipo: string;
  cajero: string;
  total: number;
  servicios: number;
}

/** Un pago aparece en varias lineas: se junta una sola vez para contar ventas y sumar totales sin duplicar. */
function pagosUnicos(lineas: VentaDetalleLinea[]): Map<string, PagoUnico> {
  const out = new Map<string, PagoUnico>();
  lineas.forEach((l) => {
    const p = out.get(l.codigo_pago);
    if (p) {
      p.servicios += l.cantidad;
    } else {
      out.set(l.codigo_pago, {
        fecha: l.fecha, local: l.local || 'Sin local', tipo: l.tipo_pago, cajero: l.cajero || 'Sin registrar',
        total: l.total_pago, servicios: l.cantidad,
      });
    }
  });
  return out;
}

function agrupar<T>(items: T[], clave: (t: T) => string): Map<string, T[]> {
  const out = new Map<string, T[]>();
  items.forEach((i) => {
    const k = clave(i);
    out.set(k, [...(out.get(k) ?? []), i]);
  });
  return out;
}

const suma = (xs: number[]) => redondear(xs.reduce((s, x) => s + x, 0));

/**
 * Descarga el reporte del mes (todas las sucursales o una): resumen del negocio, comparativa por sucursal, ventas por
 * servicio, tipo de pago, dia y cajero, el detalle de cada venta, todos los movimientos de dinero y los sueldos con
 * sus aportes y bonos. Pensado para analizar el negocio y para conciliar con contabilidad.
 */
export async function descargarLibroFinanciero({ month, localId, localNombre, moneda }: OpcionesLibro): Promise<{ truncado: boolean }> {
  const { desde, hasta } = monthRange(month);
  const [flujo, reporte, planillas, ventas] = await Promise.all([
    getFlujoFinanciero({ fecha_desde: desde, fecha_hasta: hasta, local_id: localId ?? undefined, limit: LIMITE_MOVIMIENTOS }),
    getReporteFinancieroDB({ fecha_desde: desde, fecha_hasta: hasta, local: localNombre || undefined, agrupar: 'mes' }),
    getPlanillas({ periodo: month, local_id: localId ?? undefined }),
    getVentasDetalleDB({ fecha_desde: desde, fecha_hasta: hasta, local: localNombre || undefined }),
  ]);

  const ExcelJS = await import('exceljs');
  const wb = new ExcelJS.Workbook();
  wb.creator = 'AtrevidaFit';
  wb.created = new Date();
  const alcance = `${desde} al ${hasta} · ${localNombre || 'Todas las sucursales'}`;
  const m = (c: string) => `${c} (${moneda})`;

  const lineas = ventas.lineas;
  const pagos = pagosUnicos(lineas);
  const brutoTotal = suma(lineas.map((l) => l.subtotal));
  const descTotal = suma(lineas.map((l) => l.descuento_prorrateado));
  const netoTotal = suma(lineas.map(neto));
  const nVentas = pagos.size;
  const nServicios = lineas.reduce((s, l) => s + l.cantidad, 0);
  const vigentes = planillas.planillas.filter((p) => p.estado !== 'ANULADO');
  const r = reporte.resumen;

  // ── Resumen ──
  const resumen = wb.addWorksheet('Resumen', { properties: { tabColor: { argb: HEADER_FILL } } });
  titulo(resumen, 'Reporte del negocio', alcance);
  const bloque = (nombre: string, filasBloque: [string, number, string?, boolean?][]) => {
    seccion(resumen, nombre);
    encabezado(resumen, ['Concepto', m('Monto')]);
    filasBloque.forEach(([concepto, valor, fmt, negrita]) => {
      const row = resumen.addRow([concepto, valor]);
      row.getCell(2).numFmt = fmt ?? MONEY;
      if (negrita) row.font = { bold: true };
    });
  };
  bloque('Ingresos y egresos (solo lo cobrado y pagado)', [
    ['Ventas', r.ingresos_ventas],
    ['Otros ingresos', r.ingresos_otros],
    ['Ingresos cobrados', r.ingresos_total, undefined, true],
    ['Egresos fijos', r.egresos_fijos],
    ['Egresos variables y compras', r.egresos_variables],
    ['Egresos pagados', r.egresos_total, undefined, true],
    ['Utilidad neta', r.utilidad_neta, undefined, true],
    ['Margen', r.margen_pct / 100, PCT],
    ['Egresos por pagar (no entran en la utilidad)', r.egresos_pendientes],
  ]);
  bloque('Ventas', [
    ['Ventas realizadas', nVentas, INT],
    ['Servicios vendidos', nServicios, INT],
    ['Ventas brutas', brutoTotal],
    ['Descuentos', descTotal],
    ['Ventas netas', netoTotal, undefined, true],
    ['Ticket promedio', nVentas ? redondear(netoTotal / nVentas) : 0],
  ]);
  bloque('Inventario y gastos', [
    ['Valor del stock', reporte.inventario.valor_stock],
    ['Items con stock bajo', reporte.inventario.items_bajo_stock, INT],
    ['Consumo de insumos por servicios', reporte.inventario.consumo_servicios],
    ['Gastos generales', reporte.gastos_generales],
  ]);
  if (vigentes.length) {
    bloque('Sueldos del mes', [
      ['Empleados con planilla', vigentes.length, INT],
      ['Total ganado', suma(vigentes.map((p) => p.total_ganado))],
      ['Aportes laborales (retenidos al empleado)', suma(vigentes.map((p) => p.aporte_laboral))],
      ['Aportes patronales (paga la empresa)', suma(vigentes.map((p) => p.aporte_patronal))],
      ['Neto pagado a empleados', suma(vigentes.map((p) => p.neto_pagar))],
      ['Costo total para la empresa', suma(vigentes.map((p) => p.costo_empresa)), undefined, true],
    ]);
  }
  if (reporte.egresos_por_categoria.length) {
    seccion(resumen, 'Egresos por categoría');
    encabezado(resumen, ['Categoría', m('Total'), 'Clase']);
    reporte.egresos_por_categoria.forEach((c) => {
      const row = resumen.addRow([c.categoria, c.total, c.clase]);
      row.getCell(2).numFmt = MONEY;
    });
  }
  anchos(resumen, [46, 18, 14]);

  // ── Por sucursal ──
  const porLocalVentas = agrupar([...pagos.values()], (p) => p.local);
  const serviciosPorLocal = new Map<string, number>();
  lineas.forEach((l) => serviciosPorLocal.set(l.local || 'Sin local', (serviciosPorLocal.get(l.local || 'Sin local') ?? 0) + l.cantidad));
  const netoPorLocal = new Map<string, number>();
  lineas.forEach((l) => netoPorLocal.set(l.local || 'Sin local', redondear((netoPorLocal.get(l.local || 'Sin local') ?? 0) + neto(l))));
  const finanzasPorLocal = new Map(reporte.detalle_por_local.map((d) => [d.local, d.resumen]));
  const nombresLocales = [...new Set([...porLocalVentas.keys(), ...finanzasPorLocal.keys()])].sort();
  const filasLocal: Celda[][] = nombresLocales.map((nombre) => {
    const ventasLocal = porLocalVentas.get(nombre) ?? [];
    const fin = finanzasPorLocal.get(nombre);
    const netoLocal = netoPorLocal.get(nombre) ?? 0;
    return [
      nombre, ventasLocal.length, serviciosPorLocal.get(nombre) ?? 0, netoLocal,
      ventasLocal.length ? redondear(netoLocal / ventasLocal.length) : 0,
      fin?.ingresos_total ?? null, fin?.egresos_total ?? null, fin?.utilidad_neta ?? null,
      fin ? fin.margen_pct / 100 : null,
    ];
  });
  hojaTabla(wb, 'Por sucursal', 'FF92278F', 'Comparativa por sucursal', alcance,
    ['Sucursal', 'Ventas', 'Servicios vendidos', m('Ventas netas'), m('Ticket promedio'), m('Ingresos cobrados'), m('Egresos pagados'), m('Utilidad'), 'Margen'],
    filasLocal, [26, 10, 12, 16, 16, 16, 16, 16, 10],
    { formatos: { 2: INT, 3: INT, 4: MONEY, 5: MONEY, 6: MONEY, 7: MONEY, 8: MONEY, 9: PCT }, totales: nombresLocales.length > 1 ? [2, 3, 4, 6, 7, 8] : [] });

  // ── Por servicio ──
  const porServicio = [...agrupar(lineas, (l) => l.servicio || 'Sin nombre').entries()]
    .map(([servicio, ls]) => ({
      servicio, cantidad: ls.reduce((s, l) => s + l.cantidad, 0), bruto: suma(ls.map((l) => l.subtotal)),
      desc: suma(ls.map((l) => l.descuento_prorrateado)), neto: suma(ls.map(neto)),
    }))
    .sort((a, b) => b.neto - a.neto);
  hojaTabla(wb, 'Por servicio', 'FF14AEEF', 'Ventas por servicio', alcance,
    ['Servicio', 'Cantidad', m('Ventas brutas'), m('Descuentos'), m('Ventas netas'), '% de las ventas', m('Precio promedio')],
    porServicio.map((s) => [s.servicio, s.cantidad, s.bruto, s.desc, s.neto, netoTotal ? s.neto / netoTotal : 0, s.cantidad ? redondear(s.bruto / s.cantidad) : 0]),
    [40, 10, 16, 14, 16, 12, 16],
    { formatos: { 2: INT, 3: MONEY, 4: MONEY, 5: MONEY, 6: PCT, 7: MONEY }, totales: [2, 3, 4, 5] });

  // ── Servicios por sucursal (neto) ──
  const localesVenta = [...porLocalVentas.keys()].sort();
  if (localesVenta.length) {
    const celdas = new Map<string, number>();
    lineas.forEach((l) => {
      const k = `${l.servicio || 'Sin nombre'}|${l.local || 'Sin local'}`;
      celdas.set(k, redondear((celdas.get(k) ?? 0) + neto(l)));
    });
    const filasPivot: Celda[][] = porServicio.map((s) => {
      const porLocal = localesVenta.map((loc) => celdas.get(`${s.servicio}|${loc}`) ?? 0);
      return [s.servicio, ...porLocal, suma(porLocal)];
    });
    const formatosPivot: Record<number, string> = {};
    localesVenta.forEach((_, i) => { formatosPivot[i + 2] = MONEY; });
    formatosPivot[localesVenta.length + 2] = MONEY;
    hojaTabla(wb, 'Servicios por sucursal', 'FF10B981', 'Ventas netas por servicio y sucursal', alcance,
      ['Servicio', ...localesVenta, m('Total')], filasPivot, [40, ...localesVenta.map(() => 18), 16],
      { formatos: formatosPivot, totales: localesVenta.map((_, i) => i + 2).concat(localesVenta.length + 2) });
  }

  // ── Tipo de pago ──
  const porTipo = [...agrupar([...pagos.values()], (p) => p.tipo).entries()].map(([tipo, ps]) => [
    tipoPagoLabel(tipo), ps.length, suma(ps.map((p) => p.total)),
  ] as Celda[]).sort((a, b) => (b[2] as number) - (a[2] as number));
  hojaTabla(wb, 'Tipo de pago', 'FFF97316', 'Ventas por tipo de pago', alcance, ['Tipo de pago', 'Ventas', m('Total')], porTipo, [24, 10, 16],
    { formatos: { 2: INT, 3: MONEY }, totales: [2, 3], congelar: false });

  // ── Por día ──
  const porDia = [...agrupar([...pagos.values()], (p) => diaLocal(p.fecha)).entries()].sort(([a], [b]) => a.localeCompare(b)).map(([dia, ps]) => [
    new Date(`${dia}T00:00:00`), ps.length, ps.reduce((s, p) => s + p.servicios, 0), suma(ps.map((p) => p.total)),
  ] as Celda[]);
  hojaTabla(wb, 'Por día', 'FFFFE600', 'Ventas por día', alcance, ['Fecha', 'Ventas', 'Servicios', m('Total')], porDia, [14, 10, 12, 16],
    { formatos: { 1: 'dd/mm/yyyy', 2: INT, 3: INT, 4: MONEY }, totales: [2, 3, 4] });

  // ── Por cajero ──
  const porCajero = [...agrupar([...pagos.values()], (p) => p.cajero).entries()].map(([cajero, ps]) => [
    cajero, ps.length, suma(ps.map((p) => p.total)), ps.length ? redondear(suma(ps.map((p) => p.total)) / ps.length) : 0,
  ] as Celda[]).sort((a, b) => (b[2] as number) - (a[2] as number));
  hojaTabla(wb, 'Por cajero', 'FF92278F', 'Ventas por cajero', alcance, ['Cajero', 'Ventas', m('Total'), m('Ticket promedio')], porCajero, [28, 10, 16, 16],
    { formatos: { 2: INT, 3: MONEY, 4: MONEY }, totales: [2, 3], congelar: false });

  // ── Detalle de ventas ──
  const filasVentas: Celda[][] = lineas.map((l) => [
    new Date(l.fecha), l.codigo_pago, l.local, l.cliente_nombre, l.cliente_nit, l.cajero || 'Sin registrar', tipoPagoLabel(l.tipo_pago),
    l.servicio, l.cantidad, l.precio_unitario, l.subtotal, l.descuento_prorrateado, neto(l),
  ]);
  hojaTabla(wb, 'Detalle de ventas', 'FF14AEEF', 'Detalle de ventas (un servicio por fila)', alcance,
    ['Fecha y hora', 'Pago', 'Sucursal', 'Cliente', 'NIT / CI', 'Cajero', 'Tipo de pago', 'Servicio', 'Cant.', m('Precio'), m('Subtotal'), m('Descuento'), m('Neto')],
    filasVentas, [18, 14, 20, 26, 14, 20, 12, 36, 7, 12, 14, 12, 14],
    { formatos: { 1: 'dd/mm/yyyy hh:mm', 9: INT, 10: MONEY, 11: MONEY, 12: MONEY, 13: MONEY }, totales: [9, 11, 12, 13], filtro: true });
  if (ventas.truncado) {
    const ws = wb.getWorksheet('Detalle de ventas');
    ws?.addRow([]);
    ws!.addRow(['El periodo tiene más ventas que el límite exportable: se incluyeron las más antiguas. Acota por sucursal.']).font = { bold: true, color: { argb: 'FFB45309' } };
  }

  // ── Movimientos ──
  const ordenados = [...flujo.movimientos].reverse(); // el endpoint los entrega del mas reciente al mas antiguo
  const movs = hojaTabla(wb, 'Movimientos', 'FF14AEEF', 'Movimientos de dinero', alcance,
    ['Fecha', 'Origen', 'Código', 'Detalle', 'Categoría', 'Sucursal', m('Entrada'), m('Salida'), 'Estado', m('Saldo')],
    ordenados.map((mv) => [
      new Date(`${mv.fecha}T00:00:00`), ORIGEN_LABEL[mv.origen] ?? mv.origen, mv.codigo, mv.detalle, mv.categoria, mv.local_nombre ?? 'General',
      mv.naturaleza === 'INGRESO' ? mv.monto : null, mv.naturaleza === 'EGRESO' ? mv.monto : null, mv.estado, mv.saldo,
    ]),
    [12, 20, 14, 36, 24, 20, 16, 16, 12, 16],
    { formatos: { 1: 'dd/mm/yyyy', 7: MONEY, 8: MONEY, 10: MONEY }, filtro: true });
  if (ordenados.length) {
    const primera = 5;
    const ultima = 4 + ordenados.length;
    const entradas = suma(ordenados.filter((x) => x.estado === 'PAGADO' && x.naturaleza === 'INGRESO').map((x) => x.monto));
    const salidas = suma(ordenados.filter((x) => x.estado === 'PAGADO' && x.naturaleza === 'EGRESO').map((x) => x.monto));
    const total = movs.addRow(['', '', '', '', '', 'Total cobrado y pagado']);
    total.getCell(7).value = { formula: `SUMIFS(G${primera}:G${ultima},I${primera}:I${ultima},"PAGADO")`, result: entradas };
    total.getCell(8).value = { formula: `SUMIFS(H${primera}:H${ultima},I${primera}:I${ultima},"PAGADO")`, result: salidas };
    total.font = { bold: true };
    [7, 8].forEach((c) => { total.getCell(c).numFmt = MONEY; });
    movs.getRows(primera, ordenados.length)?.forEach((row, i) => {
      if (ordenados[i].estado !== 'PAGADO') row.font = { color: { argb: 'FF999999' } };
    });
  }
  if (flujo.truncado) {
    movs.addRow([]);
    movs.addRow([`Se exportaron los ${LIMITE_MOVIMIENTOS} movimientos más recientes y el mes tiene más. Filtra por sucursal para ver el resto.`]).font = { bold: true, color: { argb: 'FFB45309' } };
  }

  // ── Sueldos y aportes + Bonos ──
  if (vigentes.length) {
    hojaTabla(wb, 'Sueldos y aportes', 'FF92278F', 'Sueldos y aportes de ley', alcance,
      ['Empleado', 'Cargo', 'Sucursal', 'Estado', m('Sueldo base'), m('Bonos'), 'Días de falta', m('Desc. faltas'), m('Total ganado'),
        m('Aporte laboral'), m('Adelantos'), m('Otros desc.'), m('Neto a pagar'), m('Aporte patronal'), m('Costo empresa')],
      vigentes.map((p) => [
        p.empleado_nombre, p.cargo ?? '', p.local_nombre ?? 'General', p.estado, p.sueldo_base, p.bonos, p.dias_falta, p.descuento_faltas,
        p.total_ganado, p.aporte_laboral, p.adelantos, p.otros_descuentos, p.neto_pagar, p.aporte_patronal, p.costo_empresa,
      ]),
      [26, 18, 18, 12, 14, 12, 10, 13, 14, 14, 12, 12, 14, 14, 14],
      { formatos: { 5: MONEY, 6: MONEY, 7: '0.0', 8: MONEY, 9: MONEY, 10: MONEY, 11: MONEY, 12: MONEY, 13: MONEY, 14: MONEY, 15: MONEY }, totales: [5, 6, 8, 9, 10, 11, 12, 13, 14, 15] });

    const lineasBono = vigentes.flatMap((p) => p.bonos_detalle.map((b) => ({ empleado: p.empleado_nombre, ...b })));
    if (lineasBono.length) {
      hojaTabla(wb, 'Bonos', 'FFFFE600', 'Bonos del mes', alcance, ['Empleado', 'Tipo de bono', m('Monto'), 'Detalle'],
        lineasBono.map((b) => [b.empleado, b.tipo_nombre, b.monto, b.nota ?? '']), [26, 24, 16, 40],
        { formatos: { 3: MONEY }, totales: [3], congelar: false });
    }
  }

  const buffer = await wb.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `reporte-negocio-${month}${localNombre ? `-${localNombre.toLowerCase().replace(/\s+/g, '-')}` : ''}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return { truncado: flujo.truncado || ventas.truncado };
}
