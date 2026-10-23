'use client';

import { useMemo, useState } from 'react';
import { AdminButton, AlertBanner, FilterBar, LocalSelect, MonthPicker, StatCard, StatGrid } from '@/components/AdminConfig';
import { ChartPanel, RankedBars, ShareBar } from '@/components/AdminCharts';
import { getAdminLocalScope } from '@/lib/api/localScope';
import { getPagosResumenDB, getVentasDetalleDB } from '@/lib/api/pagos';
import { useAsyncData } from '@/lib/hooks/useAsyncData';
import { useConfiguracion } from '@/lib/hooks/useConfiguracion';
import { useLocales } from '@/lib/hooks/useLocales';
import { formatMoney, monthRange, todayISO } from '@/lib/utils/format';
// Misma estructura que la pestaña Resumen (filtros, tarjetas, dos gráficos): comparten estilos.
import styles from './ReporteFinancieroPanel.module.css';

function normalizePaymentType(value: string) {
  if (!value) return 'No definido';
  const lower = value.trim().toLowerCase();
  if (lower === 'qr') return 'QR';
  return lower.charAt(0).toUpperCase() + lower.slice(1);
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

const formatNumber = (value: number) => value.toLocaleString('es-BO');

/** Pestaña "Ventas" de Finanzas: ventas cobradas del mes por local, tipo de pago y servicio. */
export function ReporteVentasPanel() {
  const { moneda } = useConfiguracion();
  const { locales } = useLocales();
  const [month, setMonth] = useState(todayISO().slice(0, 7));
  const [localId, setLocalId] = useState(String(getAdminLocalScope()?.local_id ?? ''));

  const localNombre = locales.find((l) => String(l.id) === localId)?.nombre ?? '';
  const { desde, hasta } = monthRange(month);
  const params = { fecha_desde: desde, fecha_hasta: hasta, local: localNombre || undefined };
  const key = `${month}|${localNombre}`;

  const resumen = useAsyncData(() => getPagosResumenDB(params).then((r) => r.data), `resumen|${key}`);
  // El detalle por servicio es aparte: si falla, el resto de las ventas sigue visible.
  const detalle = useAsyncData(() => getVentasDetalleDB(params), `detalle|${key}`);

  const money = (v: number) => formatMoney(v, moneda);
  const reporte = resumen.data?.reporte;
  const loading = resumen.loading;

  const localItems = useMemo(() => {
    const detalles = resumen.data?.detalle_reportes ?? [];
    const fuente = detalles.length > 0 ? detalles : reporte ? [reporte] : [];
    return fuente.map((item) => ({
      key: item.local || 'general',
      label: item.local || 'Todos los locales',
      value: Number(item.total_periodo ?? 0),
    }));
  }, [resumen.data, reporte]);

  const paymentTypeItems = useMemo(
    () => (reporte?.ventas_por_tipo_pago ?? []).map((item) => ({
      key: item.tipo_pago || 'sin_tipo',
      label: normalizePaymentType(item.tipo_pago),
      value: Number(item.total ?? 0),
    })),
    [reporte],
  );

  // Por unidades vendidas; el monto neto (subtotal menos el descuento que le toca) va como detalle.
  const servicioItems = useMemo(() => {
    const porServicio = new Map<string, { neto: number; cantidad: number }>();
    (detalle.data?.lineas ?? []).forEach((l) => {
      const nombre = cleanServiceName(l.servicio);
      const acc = porServicio.get(nombre) ?? { neto: 0, cantidad: 0 };
      acc.neto += l.subtotal - l.descuento_prorrateado;
      acc.cantidad += l.cantidad;
      porServicio.set(nombre, acc);
    });
    return [...porServicio.entries()].map(([label, v]) => ({
      key: label,
      label,
      value: v.cantidad,
      hint: money(Math.round(v.neto * 100) / 100),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detalle.data, moneda]);

  const sinVentas = (reporte?.cantidad_pagos ?? 0) === 0;

  return (
    <div className={styles.stack}>
      <div className={styles.toolbar}>
        <FilterBar>
          <FilterBar.Item label="Mes">
            <MonthPicker value={month} onChange={setMonth} />
          </FilterBar.Item>
          {!getAdminLocalScope() && (
            <FilterBar.Item label="Local">
              <LocalSelect value={localId} onChange={setLocalId} emptyLabel="Todos los locales" />
            </FilterBar.Item>
          )}
        </FilterBar>
      </div>

      {resumen.error && (
        <AlertBanner tone="danger" title="No se pudieron cargar las ventas" action={<AdminButton variant="secondary" onClick={resumen.reload}>Reintentar</AdminButton>}>
          {resumen.error}
        </AlertBanner>
      )}

      <StatGrid>
        <StatCard label="Ventas cobradas" value={money(reporte?.total_periodo ?? 0)} sublabel={localNombre || 'Todos los locales'} loading={loading} accentColor="#0e9bd6" />
        <StatCard label="Servicios vendidos" value={formatNumber(reporte?.cantidad_servicios_vendidos ?? 0)} sublabel="Unidades del mes" loading={loading} accentColor="#ec008c" />
      </StatGrid>

      <div className={styles.charts}>
        <ChartPanel
          title="Ventas por local"
          loading={loading}
          empty={sinVentas ? 'Sin ventas en este periodo' : null}
        >
          <RankedBars items={localItems} format={money} tone="ingreso" maxItems={8} showShare />
        </ChartPanel>

        <ChartPanel
          title="Ventas por tipo de pago"
          loading={loading}
          empty={sinVentas ? 'Sin ventas en este periodo' : null}
        >
          <ShareBar items={paymentTypeItems} format={money} />
        </ChartPanel>
      </div>

      <ChartPanel
        title="Servicios más solicitados"
        note="Por unidades vendidas"
        loading={detalle.loading}
        empty={detalle.error
          ? `No se pudo cargar el detalle por servicio: ${detalle.error}`
          : servicioItems.length === 0 ? 'Sin servicios vendidos en este periodo' : null}
      >
        <RankedBars items={servicioItems} format={formatNumber} tone="ingreso" maxItems={8} showShare />
      </ChartPanel>
    </div>
  );
}
