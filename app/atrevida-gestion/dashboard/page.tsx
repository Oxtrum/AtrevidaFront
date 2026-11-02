'use client';

import { useEffect, useState } from 'react';
import { BarChart2, Calendar } from 'lucide-react';
import { AdminPageShell, AdminPanel, AlertBanner, PageHeader, StatCard, StatGrid } from '@/components/AdminConfig';
import { DashboardTrastienda } from '@/components/AdminInventario/DashboardTrastienda';
import { CustomSelect } from '@/components/Custom/CustomSelectAdmin';
import { getReservasResumenDB, type ReservasResumenData } from '@/lib/api/reservas';
import { getClientesDB } from '@/lib/api/clientes';
import { useAdminLocalScopeState } from '@/lib/auth/useAdminLocalScope';
import { useLocales } from '@/lib/hooks/useLocales';
import { formatMoney } from '@/lib/utils/format';
import styles from './page.module.css';

const EMPTY_RESUMEN: ReservasResumenData = {
  reservas_agendadas_dia: 0,
  servicios_completados_dia: 0,
  ingresos_hoy: 0,
  cancelaciones_hoy: 0,
  semana: { total_reservas: 0, lunes: 0, martes: 0, miercoles: 0, jueves: 0, viernes: 0 },
};

const GENERAL_LOCAL = '';
const LOCAL_SCOPE_PENDING = '__LOCAL_SCOPE_PENDING__';

const getTodayISO = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
};

const getWeekBars = (resumen: ReservasResumenData) => {
  const values = [
    { day: 'Lun', value: resumen.semana.lunes ?? 0 },
    { day: 'Mar', value: resumen.semana.martes ?? 0 },
    { day: 'Mié', value: resumen.semana.miercoles ?? 0 },
    { day: 'Jue', value: resumen.semana.jueves ?? 0 },
    { day: 'Vie', value: resumen.semana.viernes ?? 0 },
  ];
  const max = Math.max(1, ...values.map((bar) => bar.value));
  return values.map((bar) => ({ ...bar, height: `${Math.max(6, Math.round((bar.value / max) * 100))}%` }));
};

/** Resumen del dia: cinco cifras, la semana y las alertas de trastienda. */
export default function AdminDashboardPage() {
  const [greeting] = useState(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  });
  const [dateString] = useState(() => {
    const raw = new Date().toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long' });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  });
  const [resumenFecha] = useState(getTodayISO);
  const [resumen, setResumen] = useState<ReservasResumenData>(EMPTY_RESUMEN);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientesTotal, setClientesTotal] = useState<number | null>(null);
  const [dashboardLocal, setDashboardLocal] = useState(GENERAL_LOCAL);
  const adminLocalScope = useAdminLocalScopeState();
  const scopedLocalName = adminLocalScope.workplace?.nombre_local ?? '';
  const { locales } = useLocales();
  const effectiveLocal = scopedLocalName || (adminLocalScope.ready ? dashboardLocal : '');
  const localValue = adminLocalScope.ready ? effectiveLocal : LOCAL_SCOPE_PENDING;
  const localOptions = !adminLocalScope.ready
    ? [{ value: LOCAL_SCOPE_PENDING, label: 'Cargando local...' }]
    : scopedLocalName
      ? [{ value: scopedLocalName, label: scopedLocalName }]
      : [{ value: GENERAL_LOCAL, label: 'General' }, ...locales.map((local) => ({ value: local.nombre, label: local.nombre }))];

  useEffect(() => {
    if (!adminLocalScope.ready) return;
    let vigente = true;
    const cargar = async () => {
      setLoading(true);
      setError(null);
      const [resumenResult, clientesResult] = await Promise.allSettled([
        getReservasResumenDB({ fecha: resumenFecha, local: !scopedLocalName ? effectiveLocal || undefined : undefined }),
        getClientesDB({ limit: 1, include_total: true }),
      ]);
      if (!vigente) return;
      if (resumenResult.status === 'fulfilled') {
        setResumen(resumenResult.value.data ?? EMPTY_RESUMEN);
      } else {
        setResumen(EMPTY_RESUMEN);
        setError(resumenResult.reason instanceof Error ? resumenResult.reason.message : 'No se pudo cargar el resumen');
      }
      if (clientesResult.status === 'fulfilled') setClientesTotal(clientesResult.value.data?.total_registros ?? 0);
      setLoading(false);
    };
    void cargar();
    return () => {
      vigente = false;
    };
  }, [adminLocalScope.ready, effectiveLocal, resumenFecha, scopedLocalName]);

  const bars = getWeekBars(resumen);

  return (
    <AdminPageShell>
      <PageHeader
        title={`${greeting}, Admin`}
        accentWord="Admin"
        subtitle="Resumen de hoy."
        actions={
          <div className={styles.meta}>
            <span className={styles.fecha}>
              <Calendar size={14} strokeWidth={1.6} />
              {dateString}
            </span>
            {localOptions.length > 1 ? (
              <CustomSelect
                value={localValue}
                onChange={(value) => {
                  if (value !== LOCAL_SCOPE_PENDING) setDashboardLocal(value);
                }}
                options={localOptions}
              />
            ) : (
              <span className={styles.fecha}>{localOptions[0]?.label}</span>
            )}
          </div>
        }
      />

      {error && <AlertBanner tone="danger">{error}</AlertBanner>}

      <DashboardTrastienda />

      <StatGrid>
        <StatCard label="Reservas hoy" value={resumen.reservas_agendadas_dia} sublabel="Agendadas" accentColor="#EC008C" loading={loading} />
        <StatCard label="Completados" value={resumen.servicios_completados_dia} sublabel="Hoy" accentColor="#14AEEF" loading={loading} />
        <StatCard label="Cancelaciones" value={resumen.cancelaciones_hoy} sublabel="Hoy" accentColor="#FFE600" loading={loading} />
        <StatCard label="Ingresos" value={formatMoney(resumen.ingresos_hoy)} sublabel="Hoy" accentColor="#92278F" loading={loading} />
        <StatCard label="Clientes" value={clientesTotal ?? '—'} sublabel="En el directorio" accentColor="#14AEEF" loading={loading} />
      </StatGrid>

      <AdminPanel
        card
        title="Reservas de la semana"
        description={loading ? undefined : `${resumen.semana.total_reservas} en total`}
        icon={<BarChart2 size={18} strokeWidth={1.8} />}
      >
        <div className={styles.grafico}>
          {bars.map((bar) => (
            <div key={bar.day} className={styles.barra}>
              <strong>{loading ? '—' : bar.value}</strong>
              <div className={styles.pista}>
                <div className={styles.relleno} style={{ height: bar.height }} aria-label={`${bar.day}: ${bar.value} reservas`} />
              </div>
              <span>{bar.day}</span>
            </div>
          ))}
        </div>
      </AdminPanel>
    </AdminPageShell>
  );
}
