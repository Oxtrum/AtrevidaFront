'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CursorPagination, DataTable, FilterBar } from '@/components/AdminConfig';
import type { Column } from '@/components/AdminConfig';
import { Variacion } from '@/components/AdminRRHH/ReportePersonalPanel';
import { PAGE_LIMIT } from '@/lib/api/pagination';
import { getReporteClientesDetalle } from '@/lib/api/reportes';
import { useCursorPagination } from '@/lib/hooks/useCursorPagination';
import { useServerSort } from '@/lib/hooks/useServerSort';
import { formatDateISO, formatMoney } from '@/lib/utils/format';
import type { SortState } from '@/lib/utils/sortRows';
import type { ClienteReporte } from '@/types/reporteClientes';
import type { PeriodoReporte } from '@/types/rrhh';
import panel from '@/components/AdminRRHH/RRHHPanel.module.css';
import periodoStyles from '@/components/AdminRRHH/ReportePersonalPanel.module.css';
import styles from './ReporteClientesPanel.module.css';

type ClienteRow = ClienteReporte & Record<string, unknown>;

/** Orden que aplica el servidor sin ordenar_por: quien más dinero generó primero. Solo marca el header. */
const ORDEN_POR_DEFECTO: SortState = { key: 'posicion', dir: 'asc' };

const plural = (n: number, singular: string, pluralTxt: string) => `${n} ${n === 1 ? singular : pluralTxt}`;

interface DetalleClientesTableProps {
  periodo: PeriodoReporte;
  /** Cualquier día del periodo (YYYY-MM-DD); se usa el primero para que no cambie mientras se pagina. */
  fecha: string;
  /** '' = todos los locales. */
  localId: string;
  /** Texto de la racha, p. ej. "3 meses". */
  textoRacha: (periodos: number) => string;
}

/**
 * Clientes con movimiento en el periodo. El servidor busca, ordena y pagina (50 por página): la lista completa
 * nunca viaja entera, así la respuesta no crece con la cantidad de clientes.
 */
export function DetalleClientesTable({ periodo, fecha, localId, textoRacha }: DetalleClientesTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const serverSort = useServerSort(ORDEN_POR_DEFECTO);
  const { params: sortParams } = serverSort;
  const pagination = useCursorPagination(`${periodo}|${fecha}|${localId}|${busqueda}|${serverSort.key}`);
  const { cursor, requestRevision, shouldIncludeTotal, setMetadata } = pagination;

  const [clientes, setClientes] = useState<ClienteReporte[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setBusqueda(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const cargar = useCallback(async () => {
    void requestRevision;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const id = ++requestRef.current;
    setLoading(true);
    setError(null);
    try {
      const res = await getReporteClientesDetalle(
        {
          periodo, fecha, local_id: localId ? Number(localId) : undefined, busqueda: busqueda || undefined,
          limit: PAGE_LIMIT, cursor, include_total: shouldIncludeTotal(), ...sortParams,
        },
        controller.signal,
      );
      if (id !== requestRef.current) return;
      setClientes(res.clientes);
      setMetadata(res.paginacion);
    } catch (err) {
      if (controller.signal.aborted || id !== requestRef.current) return;
      setError(err instanceof Error ? err.message : 'No se pudo cargar el detalle de clientes');
    } finally {
      if (id === requestRef.current) setLoading(false);
    }
  }, [periodo, fecha, localId, busqueda, sortParams, cursor, requestRevision, shouldIncludeTotal, setMetadata]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  useEffect(() => () => {
    requestRef.current += 1;
    controllerRef.current?.abort();
  }, []);

  const columnas: Column<ClienteRow>[] = useMemo(() => [
    {
      key: 'posicion',
      label: '#',
      searchable: false,
      render: (v) => <span className={`${periodoStyles.puesto} ${(v as number) <= 3 ? periodoStyles.podio : ''}`}>{v as number}</span>,
    },
    {
      key: 'nombre',
      label: 'Cliente',
      searchable: false,
      render: (v, r) => (
        <span>
          <strong>{v as string}</strong>
          {r.es_nuevo && <span className={styles.nuevo}>Nuevo</span>}
          <span className={panel.sub}>{[r.telefono, localId ? null : r.locales].filter(Boolean).join(' · ')}</span>
        </span>
      ),
    },
    {
      key: 'ingresos',
      label: 'Dinero',
      searchable: false,
      firstSort: 'desc',
      render: (v, r) => (
        <span className={panel.num}>
          {formatMoney(v as number)}
          {r.participacion_pct > 0 && <span className={panel.sub}>{r.participacion_pct}% del total</span>}
        </span>
      ),
    },
    {
      key: 'variacion_pct',
      label: 'vs. anterior',
      searchable: false,
      firstSort: 'desc',
      render: (v, r) => (
        <span title={`Antes: ${formatMoney(r.ingresos_anterior)}`}>
          <Variacion pct={v as number | null} actual={r.ingresos} />
        </span>
      ),
    },
    {
      key: 'pagos',
      label: 'Pagos',
      searchable: false,
      firstSort: 'desc',
      render: (v, r) => (
        <span className={panel.num}>
          {v as number}
          {r.pagos > 0 && <span className={panel.sub}>{formatMoney(r.ticket_promedio)} c/u</span>}
        </span>
      ),
    },
    {
      key: 'citas',
      label: 'Citas',
      searchable: false,
      firstSort: 'desc',
      render: (v, r) => (
        <span className={panel.num} title={`Antes: ${plural(r.citas_anterior, 'cita', 'citas')}`}>
          {v as number}
          {r.citas_agendadas > 0 && <span className={panel.sub}>+{r.citas_agendadas} por venir</span>}
        </span>
      ),
    },
    {
      key: 'canceladas',
      label: 'Canceló',
      searchable: false,
      firstSort: 'desc',
      render: (v, r) =>
        (v as number) > 0 ? (
          <span className={panel.num}>
            {v as number}
            {r.inasistencias > 0 && <span className={panel.sub}>{plural(r.inasistencias, 'falta', 'faltas')}</span>}
          </span>
        ) : (
          <span className={panel.muted}>—</span>
        ),
    },
    {
      key: 'racha_periodos',
      label: 'Seguidos',
      searchable: false,
      firstSort: 'desc',
      render: (v) => ((v as number) > 0 ? <span className={panel.num}>{textoRacha(v as number)}</span> : <span className={panel.muted}>—</span>),
    },
    {
      key: 'servicio_top',
      label: 'Servicio favorito',
      searchable: false,
      render: (v, r) =>
        v ? <span>{v as string}<span className={panel.sub}>{plural(r.servicio_top_cantidad, 'vez', 'veces')}</span></span> : <span className={panel.muted}>—</span>,
    },
    {
      key: 'ultima_actividad',
      label: 'Última',
      searchable: false,
      firstSort: 'desc',
      render: (v) => (v ? formatDateISO(v as string) : <span className={panel.muted}>—</span>),
    },
    {
      key: 'saldo_pendiente',
      label: 'Debe hoy',
      searchable: false,
      firstSort: 'desc',
      render: (v) =>
        (v as number) > 0 ? <span className={`${panel.num} ${styles.deuda}`}>{formatMoney(v as number)}</span> : <span className={panel.muted}>—</span>,
    },
  ], [localId, textoRacha]);

  return (
    <>
      <FilterBar>
        <FilterBar.Item label="Buscar" grow>
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cliente, teléfono o servicio…"
            aria-label="Buscar en el detalle de clientes"
          />
        </FilterBar.Item>
      </FilterBar>
      <DataTable<ClienteRow>
        columns={columnas}
        data={clientes as ClienteRow[]}
        loading={loading}
        error={error}
        onRefresh={cargar}
        onRowClick={(r) => router.push(`/atrevida-gestion/clientes/${r.cliente_id}`)}
        getRowKey={(r) => r.cliente_id}
        sort={serverSort.sort}
        onSortChange={serverSort.onSortChange}
        hideSearch
        emptyMessage={busqueda ? 'Ningún cliente coincide con la búsqueda' : 'Ningún cliente tuvo movimiento en este periodo'}
      />
      <CursorPagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        hasNext={pagination.hasNext}
        loading={loading}
        onPrevious={pagination.previous}
        onNext={pagination.next}
      />
    </>
  );
}
