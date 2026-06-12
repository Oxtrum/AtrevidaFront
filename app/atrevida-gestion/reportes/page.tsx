'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CellValue, Worksheet } from 'exceljs';
import { useRouter } from 'next/navigation';
import gsap from 'gsap';
import {
  BadgeDollarSign,
  BarChart2,
  Building2,
  CalendarRange,
  ChartPie,
  Download,
  LockKeyhole,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
} from 'lucide-react';
import {
  Bar,
  BarChart as ReBarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart as RePieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import Header from '@/components/AdminHeader/Header';
import { PageHeader } from '@/components/AdminConfig';
import { CustomSelect } from '@/components/Custom/CustomSelectAdmin';
import { toast } from '@/components/Shared/Toast';
import { getPagosResumenDB, type PagosResumenResponse, type ReporteFinanciero } from '@/lib/api/pagos';
import { getLocalesDB } from '@/lib/api/servicios';
import { canViewFinancialReports } from '@/lib/auth/adminSession';
import styles from './page.module.css';

type ReportMode = 'monthly' | 'range';

interface LocalOption {
  id: number;
  nombre: string;
  activo?: boolean;
}

interface ActiveFilters {
  mode: ReportMode;
  fecha_desde: string;
  fecha_hasta: string;
  local: string;
}

type MetricCard = {
  label: string;
  value: string;
  helper: string;
  icon: React.ReactNode;
  tone: 'primary' | 'cyan' | 'yellow' | 'green' | 'danger';
  hero?: boolean;
};

const MONTHS_ES = [
  'ENERO',
  'FEBRERO',
  'MARZO',
  'ABRIL',
  'MAYO',
  'JUNIO',
  'JULIO',
  'AGOSTO',
  'SEPTIEMBRE',
  'OCTUBRE',
  'NOVIEMBRE',
  'DICIEMBRE',
] as const;

const CHART_COLORS = ['#ec008c', '#14aeef', '#ffe600', '#10b981', '#f97316', '#92278f'];

const EMPTY_REPORT: ReporteFinanciero = {
  tipo_reporte: 'general',
  local: '',
  total_periodo: 0,
  subtotal: 0,
  descuentos: 0,
  cantidad_pagos: 0,
  cantidad_servicios_vendidos: 0,
  ticket_promedio: 0,
  servicio_mas_comprado: null,
  servicio_mas_dinero_genera: null,
  ventas_por_tipo_pago: [],
};

const EMPTY_DETAIL_REPORTS: ReporteFinanciero[] = [];

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function toDateInputValue(date: Date) {
  const copy = new Date(date);
  copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset());
  return copy.toISOString().slice(0, 10);
}

function getCurrentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
}

function getMonthRange(monthValue: string) {
  const [yearRaw, monthRaw] = monthValue.split('-').map(Number);
  const now = new Date();
  const year = Number.isFinite(yearRaw) ? yearRaw : now.getFullYear();
  const month = Number.isFinite(monthRaw) ? monthRaw - 1 : now.getMonth();
  return {
    fecha_desde: toDateInputValue(new Date(year, month, 1)),
    fecha_hasta: toDateInputValue(new Date(year, month + 1, 0)),
  };
}

function getInitialRange() {
  return getMonthRange(getCurrentMonthValue());
}

function formatCurrency(value: number | string | null | undefined) {
  return `Bs ${Number(value ?? 0).toLocaleString('es-BO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatCompactCurrency(value: number | string | null | undefined) {
  return `Bs ${Number(value ?? 0).toLocaleString('es-BO', {
    maximumFractionDigits: 0,
  })}`;
}

function formatNumber(value: number | string | null | undefined) {
  return Number(value ?? 0).toLocaleString('es-BO');
}

function normalizePaymentType(value: string) {
  if (!value) return 'No definido';
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function buildFilters(mode: ReportMode, month: string, from: string, to: string, local: string): ActiveFilters {
  if (mode === 'monthly') {
    const range = getMonthRange(month);
    return { mode, ...range, local };
  }
  return { mode, fecha_desde: from, fecha_hasta: to, local };
}

function normalizeFilePart(value: string) {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();

  return normalized || 'GENERAL';
}

function getReportScopeFilePart(local: string) {
  return local.trim() ? normalizeFilePart(local) : 'GENERAL';
}

function getReportTypeLabel(local: string) {
  return local.trim() ? 'Local' : 'general';
}

function cleanServiceName(value: string | null | undefined) {
  if (!value) return 'Sin datos';

  return value
    .trim()
    .replace(/^\d+\s*[-–—:|]\s*/, '')
    .replace(/^#?\d+\s*[-–—:|]\s*/, '')
    .replace(/^#?\d+(?=[A-Za-zÁÉÍÓÚÜÑáéíóúüñ])/, '')
    .trim() || 'Sin datos';
}

function buildMonthlyFileName(fechaDesde: string, local: string) {
  const [year, month] = fechaDesde.split('-').map(Number);
  const monthName = MONTHS_ES[(month || 1) - 1] ?? 'MES';
  return `REPORTE_ATREVIDA_${getReportScopeFilePart(local)}_${monthName}_${year || new Date().getFullYear()}.xlsx`;
}

function buildRangeFileName(filters: ActiveFilters) {
  const scope = getReportScopeFilePart(filters.local);
  if (filters.mode === 'monthly') return buildMonthlyFileName(filters.fecha_desde, filters.local);
  return `REPORTE_ATREVIDA_${scope}_${filters.fecha_desde}_${filters.fecha_hasta}.xlsx`;
}

function addTitle(worksheet: Worksheet, title: string, subtitle?: string) {
  worksheet.mergeCells('A1:E1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = title;
  titleCell.font = { bold: true, size: 16, color: { argb: 'FFEC008C' } };
  titleCell.alignment = { vertical: 'middle' };
  worksheet.getRow(1).height = 24;

  if (subtitle) {
    worksheet.mergeCells('A2:E2');
    const subtitleCell = worksheet.getCell('A2');
    subtitleCell.value = subtitle;
    subtitleCell.font = { size: 11, color: { argb: 'FF666666' } };
  }

  worksheet.addRow([]);
}

function styleHeader(row: ReturnType<Worksheet['addRow']>) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF92278F' },
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFE9D5FF' } },
      bottom: { style: 'thin', color: { argb: 'FFE9D5FF' } },
    };
  });
}

function addTable(worksheet: Worksheet, headers: string[], rows: CellValue[][]) {
  const headerRow = worksheet.addRow(headers);
  styleHeader(headerRow);
  rows.forEach((row) => worksheet.addRow(row));
  worksheet.addRow([]);
}

function reportToRow(report: ReporteFinanciero): CellValue[] {
  return [
    report.local || 'Atrevida general',
    report.total_periodo,
    report.subtotal,
    report.descuentos,
    report.cantidad_pagos,
    report.cantidad_servicios_vendidos,
    report.ticket_promedio,
  ];
}

export default function ReportesFinancierosPage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const initialRange = useMemo(getInitialRange, []);

  const [authorized, setAuthorized] = useState(false);
  const [checkedAccess, setCheckedAccess] = useState(false);
  const [mode, setMode] = useState<ReportMode>('monthly');
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthValue);
  const [dateFrom, setDateFrom] = useState(initialRange.fecha_desde);
  const [dateTo, setDateTo] = useState(initialRange.fecha_hasta);
  const [selectedLocal, setSelectedLocal] = useState('');
  const [locales, setLocales] = useState<LocalOption[]>([]);
  const [localesLoading, setLocalesLoading] = useState(false);
  const [reportData, setReportData] = useState<PagosResumenResponse | null>(null);
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>(() => (
    buildFilters('monthly', getCurrentMonthValue(), initialRange.fecha_desde, initialRange.fecha_hasta, '')
  ));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const loadLocales = useCallback(async () => {
    setLocalesLoading(true);
    try {
      const res = await getLocalesDB() as { data?: { locales?: LocalOption[] } };
      const activeLocales = (res?.data?.locales ?? []).filter((local) => local.activo !== false);
      setLocales(activeLocales);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudieron cargar los locales');
    } finally {
      setLocalesLoading(false);
    }
  }, []);

  const fetchReport = useCallback(async (filters: ActiveFilters) => {
    setLoading(true);
    setError(null);
    try {
      const response = await getPagosResumenDB({
        fecha_desde: filters.fecha_desde,
        fecha_hasta: filters.fecha_hasta,
        local: filters.local || undefined,
      });
      setReportData(response.data);
      setActiveFilters(filters);
    } catch (err) {
      setReportData(null);
      setError(err instanceof Error ? err.message : 'Error al generar el reporte financiero');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/atrevida-gestion/login');
      return;
    }

    const allowed = canViewFinancialReports();
    setAuthorized(allowed);
    setCheckedAccess(true);

    if (!allowed) {
      setLoading(false);
      return;
    }

    void loadLocales();
    void fetchReport(buildFilters('monthly', getCurrentMonthValue(), initialRange.fecha_desde, initialRange.fecha_hasta, ''));
  }, [router, fetchReport, loadLocales, initialRange.fecha_desde, initialRange.fecha_hasta]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        contentRef.current,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' },
      );
    }, containerRef);
    return () => ctx.revert();
  }, []);

  const localOptions = useMemo(() => [
    { value: '', label: localesLoading ? 'Cargando locales...' : 'Reporte Atrevida general' },
    ...locales.map((local) => ({ value: local.nombre, label: local.nombre })),
  ], [locales, localesLoading]);

  const report = reportData?.reporte ?? EMPTY_REPORT;
  const detailReports = reportData?.detalle_reportes ?? EMPTY_DETAIL_REPORTS;

  const comparisonData = useMemo(() => {
    const source = detailReports.length > 0 ? detailReports : [report];
    return source
      .filter((item) => item.total_periodo > 0 || item.cantidad_pagos > 0 || item.local || source.length === 1)
      .map((item) => ({
        local: item.local || 'General',
        total: Number(item.total_periodo ?? 0),
        pagos: Number(item.cantidad_pagos ?? 0),
        servicios: Number(item.cantidad_servicios_vendidos ?? 0),
        ticket: Number(item.ticket_promedio ?? 0),
      }));
  }, [detailReports, report]);

  const paymentTypeData = useMemo(() => (
    (report.ventas_por_tipo_pago ?? []).map((item) => ({
      name: normalizePaymentType(item.tipo_pago),
      value: Number(item.total ?? 0),
      pagos: Number(item.cantidad_pagos ?? 0),
    }))
  ), [report]);

  const metrics: MetricCard[] = useMemo(() => [
    {
      label: 'Total del periodo',
      value: formatCurrency(report.total_periodo),
      helper: activeFilters.local ? activeFilters.local : 'Reporte Atrevida general',
      icon: <BadgeDollarSign size={18} strokeWidth={1.7} />,
      tone: 'primary',
      hero: true,
    },
    {
      label: 'Subtotal',
      value: formatCurrency(report.subtotal),
      helper: 'Antes de descuentos',
      icon: <TrendingUp size={17} strokeWidth={1.7} />,
      tone: 'cyan',
    },
    {
      label: 'Descuentos',
      value: formatCurrency(report.descuentos),
      helper: 'Aplicados al periodo',
      icon: <BadgeDollarSign size={17} strokeWidth={1.7} />,
      tone: 'yellow',
    },
    {
      label: 'Pagos',
      value: formatNumber(report.cantidad_pagos),
      helper: 'Transacciones registradas',
      icon: <BarChart2 size={17} strokeWidth={1.7} />,
      tone: 'green',
    },
    {
      label: 'Ticket promedio',
      value: formatCurrency(report.ticket_promedio),
      helper: `${formatNumber(report.cantidad_servicios_vendidos)} servicios vendidos`,
      icon: <ShoppingBag size={17} strokeWidth={1.7} />,
      tone: 'cyan',
    },
  ], [activeFilters.local, report]);

  const handleGenerate = () => {
    const filters = buildFilters(mode, selectedMonth, dateFrom, dateTo, selectedLocal);

    if (!filters.fecha_desde || !filters.fecha_hasta) {
      setError('Selecciona una fecha de inicio y una fecha final');
      return;
    }

    if (filters.fecha_desde > filters.fecha_hasta) {
      setError('La fecha inicial no puede ser mayor a la fecha final');
      return;
    }

    void fetchReport(filters);
  };

  const handleExport = async () => {
    if (!reportData) return;

    setExporting(true);
    try {
      const ExcelJS = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'AtrevidaFit';
      workbook.created = new Date();

      const subtitle = `${activeFilters.fecha_desde} al ${activeFilters.fecha_hasta}${activeFilters.local ? ` - ${activeFilters.local}` : ' - General'}`;
      const resumen = workbook.addWorksheet('Resumen');
      addTitle(resumen, 'Reporte financiero Atrevida', subtitle);
      addTable(resumen, ['Metrica', 'Valor'], [
        ['Tipo de reporte', getReportTypeLabel(report.local || activeFilters.local)],
        ['Local', report.local || 'Atrevida general'],
        ['Total periodo', report.total_periodo],
        ['Subtotal', report.subtotal],
        ['Descuentos', report.descuentos],
        ['Cantidad pagos', report.cantidad_pagos],
        ['Servicios vendidos', report.cantidad_servicios_vendidos],
        ['Ticket promedio', report.ticket_promedio],
      ]);

      addTable(resumen, ['Servicio destacado', 'Servicio', 'Cantidad', 'Monto total'], [
        [
          'Mas comprado',
          cleanServiceName(report.servicio_mas_comprado?.servicio),
          report.servicio_mas_comprado?.cantidad ?? 0,
          report.servicio_mas_comprado?.monto_total ?? 0,
        ],
        [
          'Mas dinero genera',
          cleanServiceName(report.servicio_mas_dinero_genera?.servicio),
          report.servicio_mas_dinero_genera?.cantidad ?? 0,
          report.servicio_mas_dinero_genera?.monto_total ?? 0,
        ],
      ]);

      const detalle = workbook.addWorksheet('Detalle por local');
      addTitle(detalle, 'Detalle por local', subtitle);
      const detailSource = detailReports.length > 0 ? detailReports : [report];
      addTable(
        detalle,
        ['Local', 'Total periodo', 'Subtotal', 'Descuentos', 'Pagos', 'Servicios vendidos', 'Ticket promedio'],
        detailSource.map(reportToRow),
      );

      const tipos = workbook.addWorksheet('Tipos de pago');
      addTitle(tipos, 'Ventas por tipo de pago', subtitle);
      addTable(
        tipos,
        ['Tipo de pago', 'Cantidad pagos', 'Total'],
        (report.ventas_por_tipo_pago ?? []).map((item) => [
          normalizePaymentType(item.tipo_pago),
          item.cantidad_pagos,
          item.total,
        ]),
      );

      workbook.worksheets.forEach((worksheet) => {
        worksheet.columns.forEach((column) => {
          column.width = 22;
        });
        worksheet.eachRow((row) => {
          row.eachCell((cell) => {
            cell.alignment = { vertical: 'middle', wrapText: true };
          });
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = buildRangeFileName(activeFilters);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success('Reporte Excel generado');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo generar el Excel');
    } finally {
      setExporting(false);
    }
  };

  const renderServiceInsight = (
    label: string,
    service: ReporteFinanciero['servicio_mas_comprado'],
    tone: 'primary' | 'cyan',
  ) => (
    <article className={`${styles.serviceInsight} ${styles[tone]}`}>
      <span>{label}</span>
      <strong>{cleanServiceName(service?.servicio)}</strong>
      <div>
        <small>{formatNumber(service?.cantidad ?? 0)} ventas</small>
        <small>{formatCurrency(service?.monto_total ?? 0)}</small>
      </div>
    </article>
  );

  return (
    <div ref={containerRef} className={styles.pageContainer}>
      <div className="admin-mesh" />
      <Header />
      <main className={styles.main}>
        <div className={styles.container}>
          <PageHeader
            kicker="Finanzas"
            kickerIcon={<BarChart2 size={14} strokeWidth={2} />}
            title="Reportes financieros"
            accentWord="financieros"
            subtitle="Resumen de ingresos, servicios vendidos y rendimiento por local"
            actions={
              <button
                type="button"
                className="admin-button admin-button-primary"
                onClick={handleExport}
                disabled={!reportData || loading || exporting || !authorized}
              >
                {exporting ? <RefreshCw size={17} strokeWidth={1.8} className={styles.spinIcon} /> : <Download size={17} strokeWidth={1.8} />}
                Descargar Excel
              </button>
            }
          />

          <div ref={contentRef} className={styles.contentStack}>
            {checkedAccess && !authorized ? (
              <section className={styles.accessPanel}>
                <div className={styles.accessIcon}>
                  <LockKeyhole size={22} strokeWidth={1.8} />
                </div>
                <div>
                  <h2>Acceso reservado</h2>
                  <p>Los reportes financieros estan disponibles solo para el rol admin_sys.</p>
                </div>
              </section>
            ) : (
              <>
                <section className={styles.filterPanel}>
                  <div className={styles.filterHeader}>
                    <div>
                      <span className={styles.panelKicker}>
                        <CalendarRange size={14} strokeWidth={1.8} />
                        Generador de reportes
                      </span>
                      <h2>Periodo y alcance</h2>
                    </div>
                    <div className={styles.modeTabs} aria-label="Tipo de reporte">
                      <button
                        type="button"
                        className={`${styles.modeButton} ${mode === 'monthly' ? styles.modeButtonActive : ''}`}
                        onClick={() => setMode('monthly')}
                      >
                        Mensual
                      </button>
                      <button
                        type="button"
                        className={`${styles.modeButton} ${mode === 'range' ? styles.modeButtonActive : ''}`}
                        onClick={() => setMode('range')}
                      >
                        Rango
                      </button>
                    </div>
                  </div>

                  <div className={styles.filtersGrid}>
                    {mode === 'monthly' ? (
                      <div className={styles.field}>
                        <label htmlFor="report-month">Mes</label>
                        <input
                          id="report-month"
                          type="month"
                          className={styles.monthInput}
                          value={selectedMonth}
                          onChange={(event) => setSelectedMonth(event.target.value)}
                        />
                      </div>
                    ) : (
                      <>
                        <div className={styles.field}>
                          <label htmlFor="report-from">Fecha desde</label>
                          <input
                            id="report-from"
                            type="date"
                            value={dateFrom}
                            onChange={(event) => setDateFrom(event.target.value)}
                          />
                        </div>
                        <div className={styles.field}>
                          <label htmlFor="report-to">Fecha hasta</label>
                          <input
                            id="report-to"
                            type="date"
                            value={dateTo}
                            onChange={(event) => setDateTo(event.target.value)}
                          />
                        </div>
                      </>
                    )}

                    <div className={styles.field}>
                      <label id="report-local-label">Local</label>
                      <CustomSelect
                        id="report-local"
                        ariaLabelledBy="report-local-label"
                        value={selectedLocal}
                        onChange={setSelectedLocal}
                        options={localOptions}
                      />
                    </div>

                    <div className={styles.generateCell}>
                      <button
                        type="button"
                        className={styles.generateButton}
                        onClick={handleGenerate}
                        disabled={loading}
                      >
                        {loading ? <RefreshCw size={16} strokeWidth={1.8} className={styles.spinIcon} /> : <BarChart2 size={16} strokeWidth={1.8} />}
                        Generar reporte
                      </button>
                    </div>
                  </div>
                  {error && <div className={styles.inlineError}>{error}</div>}
                </section>

                <section className={styles.summaryGrid} aria-label="Resumen financiero">
                  {metrics.map((metric) => (
                    <article
                      key={metric.label}
                      className={`${styles.metricCard} ${metric.hero ? styles.metricHero : ''} ${styles[metric.tone]}`}
                    >
                      <div className={styles.metricIcon}>{metric.icon}</div>
                      <span>{metric.label}</span>
                      <strong>{loading ? '-' : metric.value}</strong>
                      <small>{metric.helper}</small>
                    </article>
                  ))}
                </section>

                <section className={styles.chartGrid}>
                  <article className={styles.chartPanel}>
                    <div className={styles.panelTitleRow}>
                      <div>
                        <span className={styles.panelKicker}>
                          <Building2 size={14} strokeWidth={1.8} />
                          Comparacion
                        </span>
                        <h2>Ingresos por local</h2>
                      </div>
                    </div>
                    <div className={styles.chartBox}>
                      {comparisonData.length === 0 || comparisonData.every((item) => item.total === 0) ? (
                        <div className={styles.emptyChart}>Sin ventas para graficar en este periodo</div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <ReBarChart data={comparisonData} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                            <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                            <XAxis dataKey="local" tick={{ fill: 'currentColor', fontSize: 11 }} tickLine={false} axisLine={false} />
                            <YAxis tickFormatter={formatCompactCurrency} tick={{ fill: 'currentColor', fontSize: 11 }} tickLine={false} axisLine={false} width={72} />
                            <Tooltip formatter={(value) => formatCurrency(Number(value))} cursor={false} />
                            <Bar dataKey="total" name="Total" radius={[8, 8, 0, 0]}>
                              {comparisonData.map((entry, index) => (
                                <Cell key={entry.local} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                              ))}
                            </Bar>
                          </ReBarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </article>

                  <article className={styles.chartPanel}>
                    <div className={styles.panelTitleRow}>
                      <div>
                        <span className={styles.panelKicker}>
                          <ChartPie size={14} strokeWidth={1.8} />
                          Tipo de pago
                        </span>
                        <h2>Distribucion de ventas</h2>
                      </div>
                    </div>
                    <div className={styles.chartBox}>
                      {paymentTypeData.length === 0 || paymentTypeData.every((item) => item.value === 0) ? (
                        <div className={styles.emptyChart}>Sin tipos de pago registrados</div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <RePieChart>
                            <Pie
                              data={paymentTypeData}
                              dataKey="value"
                              nameKey="name"
                              innerRadius={62}
                              outerRadius={104}
                              paddingAngle={4}
                            >
                              {paymentTypeData.map((entry, index) => (
                                <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                            <Legend formatter={(value) => <span className={styles.legendLabel}>{value}</span>} />
                          </RePieChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </article>
                </section>

                <section className={styles.lowerGrid}>
                  <div className={styles.serviceGrid}>
                    {renderServiceInsight('Servicio mas comprado', report.servicio_mas_comprado, 'primary')}
                    {renderServiceInsight('Servicio que mas dinero genera', report.servicio_mas_dinero_genera, 'cyan')}
                  </div>

                  <article className={styles.chartPanel}>
                    <div className={styles.panelTitleRow}>
                      <div>
                        <span className={styles.panelKicker}>
                          <BarChart2 size={14} strokeWidth={1.8} />
                          Volumen
                        </span>
                        <h2>Pagos y servicios por local</h2>
                      </div>
                    </div>
                    <div className={styles.chartBoxSmall}>
                      {comparisonData.length === 0 || comparisonData.every((item) => item.pagos === 0 && item.servicios === 0) ? (
                        <div className={styles.emptyChart}>Sin volumen para mostrar</div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <ReBarChart data={comparisonData} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                            <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                            <XAxis dataKey="local" tick={{ fill: 'currentColor', fontSize: 11 }} tickLine={false} axisLine={false} />
                            <YAxis tick={{ fill: 'currentColor', fontSize: 11 }} tickLine={false} axisLine={false} width={34} />
                            <Tooltip cursor={false} />
                            <Legend formatter={(value) => <span className={styles.legendLabel}>{value}</span>} />
                            <Bar dataKey="pagos" name="Pagos" fill="#ec008c" radius={[8, 8, 0, 0]} />
                            <Bar dataKey="servicios" name="Servicios" fill="#14aeef" radius={[8, 8, 0, 0]} />
                          </ReBarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </article>
                </section>

                <section className={styles.tablePanel}>
                  <div className={styles.panelTitleRow}>
                    <div>
                      <span className={styles.panelKicker}>
                        <Building2 size={14} strokeWidth={1.8} />
                        Detalle
                      </span>
                      <h2>{activeFilters.local ? 'Reporte del local seleccionado' : 'Comparativa Atrevida general'}</h2>
                    </div>
                  </div>

                  <div className={styles.tableScroll}>
                    <table className={styles.reportTable}>
                      <thead>
                        <tr>
                          <th>Local</th>
                          <th>Total</th>
                          <th>Subtotal</th>
                          <th>Descuentos</th>
                          <th>Pagos</th>
                          <th>Servicios</th>
                          <th>Ticket promedio</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(detailReports.length > 0 ? detailReports : [report]).map((item) => (
                          <tr key={item.local || item.tipo_reporte}>
                            <td>{item.local || 'Atrevida general'}</td>
                            <td>{formatCurrency(item.total_periodo)}</td>
                            <td>{formatCurrency(item.subtotal)}</td>
                            <td>{formatCurrency(item.descuentos)}</td>
                            <td>{formatNumber(item.cantidad_pagos)}</td>
                            <td>{formatNumber(item.cantidad_servicios_vendidos)}</td>
                            <td>{formatCurrency(item.ticket_promedio)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
