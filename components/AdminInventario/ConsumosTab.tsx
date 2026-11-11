'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
} from 'lucide-react';
import {
  AdminPanel,
  AlertBanner,
  DataTable,
  FilterBar,
  FormModal,
  LocalSelect,
  MonthPicker,
  formatMes,
  StatCard,
  StatGrid,
  StatusBadge,
  Tabs,
} from '@/components/AdminConfig';
import type { Column, TabItem } from '@/components/AdminConfig';
import { CustomSelect } from '@/components/Custom/CustomSelectAdmin';
import { AtencionDetalleModal } from '@/components/AdminAtenciones/AtencionDetalleModal';
import { getAtencion } from '@/lib/api/atenciones';
import {
  getConsumosEmpleadosInventario,
  getConsumosInventario,
  getConsumosResumenInventario,
} from '@/lib/api/inventario';
import { getAdminLocalScope } from '@/lib/api/localScope';
import { getReservaByID } from '@/lib/api/reservas';
import { useInventarioItems } from '@/lib/hooks/useInventarioItems';
import { formatDateISO, formatQty, monthRange, todayISO } from '@/lib/utils/format';
import { toast } from '@/components/Shared/Toast';
import type { Atencion } from '@/lib/api/atenciones';
import type { ReservaBD } from '@/types/reserva';
import type {
  ConsumoEmpleadoResumen,
  ConsumoEvento,
  ConsumoInsumo,
  ConsumoResumen,
  EstadoDescuentoConsumo,
  GetConsumosParams,
} from '@/types/inventario';
import styles from './ConsumosTab.module.css';

type VistaConsumos = 'calendario' | 'reporte';
type DimensionConsumos = 'insumo' | 'empleado';
type ContextoConsumos = 'inventario' | 'atenciones';
type ResumenRow = ConsumoResumen & Record<string, unknown>;
type EmpleadoRow = ConsumoEmpleadoResumen & Record<string, unknown>;

interface ConsumosTabProps {
  /** Dimension principal del reporte: insumo consumido o empleado que atendio. */
  dimension?: DimensionConsumos;
  /** Pagina que hospeda la vista; define el parametro de URL de la pestana. */
  contexto?: ContextoConsumos;
}

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const ESTADO_OPTIONS: { value: EstadoDescuentoConsumo; label: string }[] = [
  { value: 'PENDIENTE', label: 'Deducción pendiente' },
  { value: 'DESCONTADO', label: 'Descontado' },
];

const VISTA_TABS: TabItem<VistaConsumos>[] = [
  { key: 'calendario', label: 'Calendario', icon: <CalendarDays size={15} /> },
];

function parseISO(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

function toISO(date: Date): string {
  return date.toLocaleDateString('en-CA');
}

function sumarDias(iso: string, dias: number): string {
  const date = parseISO(iso);
  date.setDate(date.getDate() + dias);
  return toISO(date);
}

/** Lunes de la semana que contiene la fecha (la semana de Consumos va de lunes a sábado). */
function lunesDe(iso: string): string {
  const date = parseISO(iso);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return toISO(date);
}

function mesActual(): string {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
}

function partesDia(iso: string): { numero: number; mes: string } {
  const date = parseISO(iso);
  return {
    numero: date.getDate(),
    mes: date.toLocaleDateString('es-BO', { month: 'short' }).replace('.', ''),
  };
}

function coincideInsumo(insumo: ConsumoInsumo, row: ConsumoResumen): boolean {
  if (row.item_id != null) return insumo.item_id === row.item_id;
  return insumo.item_id == null && insumo.item_nombre === row.item_nombre && insumo.unidad_medida === row.unidad_medida;
}

function coincideEstado(insumo: ConsumoInsumo, estado: string): boolean {
  if (estado === 'DESCONTADO') return insumo.estado_descuento === 'DESCONTADO';
  if (estado === 'PENDIENTE') return insumo.estado_descuento !== 'DESCONTADO';
  return true;
}

function claveResumen(row: ConsumoResumen): string {
  return `${row.item_id ?? 'sin'}-${row.item_nombre}-${row.unidad_medida}`;
}

function claveEmpleado(row: ConsumoEmpleadoResumen): string {
  return row.empleado_id != null ? `id-${row.empleado_id}` : `nombre-${row.empleado_nombre}`;
}

interface LinkConsumos {
  vista: VistaConsumos;
  fecha: string;
  mes: string;
  localId: string;
  itemId: string;
  estado: string;
  cliente: string;
  servicio: string;
  empleado: string;
  q: string;
}

/** Enlaces directos: ?vista=consumos&consumos_vista=reporte&mes=2026-11&empleado=Daniela. */
function readLink(): LinkConsumos {
  if (typeof window === 'undefined') {
    return { vista: 'calendario', fecha: '', mes: '', localId: '', itemId: '', estado: '', cliente: '', servicio: '', empleado: '', q: '' };
  }
  const params = new URLSearchParams(window.location.search);
  const esConsumos = params.get('tab') === 'consumos'
    || params.get('vista') === 'consumos'
    || params.has('consumos_vista');
  return {
    vista: 'calendario',
    fecha: esConsumos ? (params.get('fecha') ?? '') : '',
    mes: esConsumos ? (params.get('mes') ?? '') : '',
    localId: params.get('local_id') ?? String(getAdminLocalScope()?.local_id ?? ''),
    itemId: esConsumos ? (params.get('item_id') ?? '') : '',
    estado: esConsumos ? (params.get('estado_descuento') ?? '') : '',
    cliente: esConsumos ? (params.get('cliente') ?? '') : '',
    servicio: esConsumos ? (params.get('servicio') ?? '') : '',
    empleado: esConsumos ? (params.get('empleado') ?? '') : '',
    q: esConsumos ? (params.get('q') ?? '') : '',
  };
}

interface DetalleAtencion {
  reserva: ReservaBD;
  atencion: Atencion;
}

export function ConsumosTab({ dimension = 'insumo', contexto = 'inventario' }: ConsumosTabProps = {}) {
  const esEmpleado = dimension === 'empleado';
  const [link] = useState(readLink);
  const [vista, setVista] = useState<VistaConsumos>(link.vista);
  const [fechaBase, setFechaBase] = useState(() => link.fecha || todayISO());
  const [diasExpandidos, setDiasExpandidos] = useState<Set<string>>(() => new Set());
  const [mes, setMes] = useState(() => link.mes || mesActual());
  const [localId, setLocalId] = useState(link.localId);
  const [itemId, setItemId] = useState(link.itemId);
  const [estado, setEstado] = useState(link.estado);
  const [cliente, setCliente] = useState(link.cliente);
  const [servicio, setServicio] = useState(link.servicio);
  const [empleado, setEmpleado] = useState(link.empleado);
  const [q, setQ] = useState(link.q);
  const [textoAplicado, setTextoAplicado] = useState({
    cliente: link.cliente.trim(),
    servicio: link.servicio.trim(),
    empleado: link.empleado.trim(),
    q: link.q.trim(),
  });

  useEffect(() => {
    const t = window.setTimeout(() => setTextoAplicado({
      cliente: cliente.trim(),
      servicio: servicio.trim(),
      empleado: empleado.trim(),
      q: q.trim(),
    }), 350);
    return () => window.clearTimeout(t);
  }, [cliente, servicio, empleado, q]);

  const { cliente: clienteAplicado, servicio: servicioAplicado, empleado: empleadoAplicado, q: qAplicado } = textoAplicado;

  const lunes = useMemo(() => (fechaBase ? lunesDe(fechaBase) : ''), [fechaBase]);
  const sabado = useMemo(() => (lunes ? sumarDias(lunes, 5) : ''), [lunes]);
  const dias = useMemo(() => (lunes ? DIAS_SEMANA.map((_, i) => sumarDias(lunes, i)) : []), [lunes]);

  const filtrosBase = useMemo(
    () => ({
      local_id: localId ? Number(localId) : undefined,
      item_id: !esEmpleado && itemId ? Number(itemId) : undefined,
      // En Atenciones el calendario se centra en el personal y no debe
      // esconder servicios segun una condicion de inventario.
      estado_descuento: (!esEmpleado && estado || undefined) as EstadoDescuentoConsumo | undefined,
      cliente: clienteAplicado || undefined,
      servicio: servicioAplicado || undefined,
      empleado: empleadoAplicado || undefined,
      q: qAplicado || undefined,
    }),
    [esEmpleado, localId, itemId, estado, clienteAplicado, servicioAplicado, empleadoAplicado, qAplicado],
  );

  const filtrosCalendario = useMemo<GetConsumosParams | null>(
    () => (lunes && sabado ? { ...filtrosBase, fecha_desde: lunes, fecha_hasta: sabado } : null),
    [filtrosBase, lunes, sabado],
  );

  const filtrosReporte = useMemo<GetConsumosParams | null>(() => {
    if (!mes) return null;
    const rango = monthRange(mes);
    return { ...filtrosBase, fecha_desde: rango.desde, fecha_hasta: rango.hasta };
  }, [filtrosBase, mes]);

  const { items: inventarioItems } = useInventarioItems({ limit: 200 });
  const itemOptions = useMemo(
    () => inventarioItems.map((item) => ({ value: String(item.id), label: `${item.nombre} (${item.unidad_medida})` })),
    [inventarioItems],
  );

  const filtrosActivos = useMemo(() => {
    const partes: string[] = [];
    if (localId) partes.push('el local seleccionado');
    if (!esEmpleado && itemId) {
      const item = itemOptions.find((option) => option.value === itemId);
      partes.push(item ? `el insumo ${item.label}` : 'el insumo seleccionado');
    }
    if (!esEmpleado && estado) partes.push(estado === 'PENDIENTE' ? 'deducciones pendientes' : 'consumos descontados');
    if (clienteAplicado) partes.push(`cliente "${clienteAplicado}"`);
    if (servicioAplicado) partes.push(`servicio "${servicioAplicado}"`);
    if (empleadoAplicado) partes.push(`${esEmpleado ? 'empleado' : 'personal'} "${empleadoAplicado}"`);
    if (qAplicado) partes.push(`búsqueda "${qAplicado}"`);
    return partes;
  }, [esEmpleado, localId, itemId, estado, clienteAplicado, servicioAplicado, empleadoAplicado, qAplicado, itemOptions]);

  const descripcionCalendario = useMemo(() => {
    const rango = lunes && sabado
      ? `la semana del ${formatDateISO(lunes)} al ${formatDateISO(sabado)}`
      : 'la semana seleccionada';
    return [rango, ...filtrosActivos].join(', ');
  }, [lunes, sabado, filtrosActivos]);

  const descripcionReporte = useMemo(
    () => [mes ? formatMes(mes) : 'el mes seleccionado', ...filtrosActivos].join(', '),
    [mes, filtrosActivos],
  );

  const [eventos, setEventos] = useState<ConsumoEvento[]>([]);
  const [loadingCalendario, setLoadingCalendario] = useState(true);
  const [errorCalendario, setErrorCalendario] = useState<string | null>(null);
  const calendarioRequest = useRef(0);
  const calendarioController = useRef<AbortController | null>(null);

  const cargarCalendario = useCallback(async () => {
    if (!filtrosCalendario) return;
    calendarioController.current?.abort();
    const controller = new AbortController();
    calendarioController.current = controller;
    const id = ++calendarioRequest.current;
    setLoadingCalendario(true);
    setErrorCalendario(null);
    try {
      const res = await getConsumosInventario(filtrosCalendario, controller.signal);
      if (id !== calendarioRequest.current) return;
      setEventos(res.consumos);
    } catch (err) {
      if (controller.signal.aborted || id !== calendarioRequest.current) return;
      setErrorCalendario(err instanceof Error ? err.message : 'Error al cargar consumos');
    } finally {
      if (id === calendarioRequest.current) setLoadingCalendario(false);
    }
  }, [filtrosCalendario]);

  useEffect(() => {
    if (vista === 'calendario') void cargarCalendario();
  }, [vista, cargarCalendario]);

  const [resumen, setResumen] = useState<ConsumoResumen[]>([]);
  const [resumenEmpleados, setResumenEmpleados] = useState<ConsumoEmpleadoResumen[]>([]);
  const [loadingReporte, setLoadingReporte] = useState(true);
  const [errorReporte, setErrorReporte] = useState<string | null>(null);
  const reporteRequest = useRef(0);
  const reporteController = useRef<AbortController | null>(null);

  const cargarReporte = useCallback(async () => {
    if (!filtrosReporte) return;
    reporteController.current?.abort();
    const controller = new AbortController();
    reporteController.current = controller;
    const id = ++reporteRequest.current;
    setLoadingReporte(true);
    setErrorReporte(null);
    try {
      if (esEmpleado) {
        const rows = await getConsumosEmpleadosInventario(filtrosReporte, controller.signal);
        if (id !== reporteRequest.current) return;
        setResumenEmpleados(rows);
      } else {
        const rows = await getConsumosResumenInventario(filtrosReporte, controller.signal);
        if (id !== reporteRequest.current) return;
        setResumen(rows);
      }
    } catch (err) {
      if (controller.signal.aborted || id !== reporteRequest.current) return;
      setErrorReporte(err instanceof Error ? err.message : 'Error al cargar el reporte');
    } finally {
      if (id === reporteRequest.current) setLoadingReporte(false);
    }
  }, [esEmpleado, filtrosReporte]);

  useEffect(() => {
    if (vista === 'reporte') void cargarReporte();
  }, [vista, cargarReporte]);

  const [resumenAbierto, setResumenAbierto] = useState<ConsumoResumen | null>(null);
  const [empleadoAbierto, setEmpleadoAbierto] = useState<ConsumoEmpleadoResumen | null>(null);
  const [eventosDetalle, setEventosDetalle] = useState<ConsumoEvento[]>([]);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [errorDetalle, setErrorDetalle] = useState<string | null>(null);
  const detalleResumenRequest = useRef(0);
  const detalleEmpleadoRequest = useRef(0);

  const abrirResumen = useCallback(async (row: ConsumoResumen) => {
    if (!filtrosReporte) return;
    detalleEmpleadoRequest.current += 1;
    setEmpleadoAbierto(null);
    setResumenAbierto(row);
    setEventosDetalle([]);
    setErrorDetalle(null);
    setLoadingDetalle(true);
    const id = ++detalleResumenRequest.current;
    try {
      const res = await getConsumosInventario({ ...filtrosReporte, item_id: row.item_id ?? undefined });
      if (id !== detalleResumenRequest.current) return;
      const estadoFiltro = filtrosReporte.estado_descuento ?? '';
      setEventosDetalle(
        res.consumos.filter((evento) =>
          evento.insumos.some((insumo) => coincideInsumo(insumo, row) && coincideEstado(insumo, estadoFiltro)),
        ),
      );
    } catch (err) {
      if (id !== detalleResumenRequest.current) return;
      setErrorDetalle(err instanceof Error ? err.message : 'Error al cargar las atenciones');
    } finally {
      if (id === detalleResumenRequest.current) setLoadingDetalle(false);
    }
  }, [filtrosReporte]);

  const abrirResumenEmpleado = useCallback(async (row: ConsumoEmpleadoResumen) => {
    if (!filtrosReporte) return;
    detalleResumenRequest.current += 1;
    setResumenAbierto(null);
    setEmpleadoAbierto(row);
    setEventosDetalle([]);
    setErrorDetalle(null);
    setLoadingDetalle(true);
    const id = ++detalleEmpleadoRequest.current;
    try {
      const filtros: GetConsumosParams = { ...filtrosReporte };
      if (row.empleado_id != null) {
        filtros.empleado_id = row.empleado_id;
        filtros.empleado = undefined;
      } else {
        filtros.empleado_id = undefined;
        filtros.empleado = row.empleado_nombre;
      }
      const res = await getConsumosInventario(filtros);
      if (id !== detalleEmpleadoRequest.current) return;
      setEventosDetalle(res.consumos);
    } catch (err) {
      if (id !== detalleEmpleadoRequest.current) return;
      setErrorDetalle(err instanceof Error ? err.message : 'Error al cargar las atenciones');
    } finally {
      if (id === detalleEmpleadoRequest.current) setLoadingDetalle(false);
    }
  }, [filtrosReporte]);

  const cerrarResumen = () => {
    detalleResumenRequest.current += 1;
    detalleEmpleadoRequest.current += 1;
    setResumenAbierto(null);
    setEmpleadoAbierto(null);
    setEventosDetalle([]);
    setErrorDetalle(null);
    setLoadingDetalle(false);
  };

  const [detalle, setDetalle] = useState<DetalleAtencion | null>(null);
  const detalleAtencionRequest = useRef(0);

  const abrirAtencion = async (evento: ConsumoEvento) => {
    const id = ++detalleAtencionRequest.current;
    detalleResumenRequest.current += 1;
    detalleEmpleadoRequest.current += 1;
    setResumenAbierto(null);
    setEmpleadoAbierto(null);
    try {
      const [atencion, reservaResponse] = await Promise.all([
        getAtencion(evento.atencion_id),
        getReservaByID(evento.reserva_id),
      ]);
      if (id !== detalleAtencionRequest.current) return;
      if (!reservaResponse.data?.reserva) throw new Error('No se encontró la reserva vinculada.');
      setDetalle({ atencion, reserva: reservaResponse.data.reserva });
    } catch (err) {
      if (id !== detalleAtencionRequest.current) return;
      toast.error(err instanceof Error ? err.message : 'No se pudo cargar la atención.');
    }
  };

  useEffect(() => () => {
    calendarioRequest.current += 1;
    calendarioController.current?.abort();
    reporteRequest.current += 1;
    reporteController.current?.abort();
    detalleResumenRequest.current += 1;
    detalleEmpleadoRequest.current += 1;
    detalleAtencionRequest.current += 1;
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (contexto === 'inventario') params.set('tab', 'consumos');
    else params.set('vista', 'consumos');
    params.set('consumos_vista', vista);
    if (vista === 'calendario' && fechaBase) params.set('fecha', fechaBase);
    if (vista === 'reporte' && mes) params.set('mes', mes);
    if (localId) params.set('local_id', localId);
    if (!esEmpleado && itemId) params.set('item_id', itemId);
    if (esEmpleado) params.delete('item_id');
    if (!esEmpleado && estado) params.set('estado_descuento', estado);
    else params.delete('estado_descuento');
    if (clienteAplicado) params.set('cliente', clienteAplicado);
    if (servicioAplicado) params.set('servicio', servicioAplicado);
    if (empleadoAplicado) params.set('empleado', empleadoAplicado);
    if (qAplicado) params.set('q', qAplicado);
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
  }, [contexto, esEmpleado, vista, fechaBase, mes, localId, itemId, estado, clienteAplicado, servicioAplicado, empleadoAplicado, qAplicado]);

  const moverSemana = (semanas: number) => {
    if (!lunes) return;
    setDiasExpandidos(new Set());
    setFechaBase(sumarDias(lunes, semanas * 7));
  };

  const irHoy = () => {
    setDiasExpandidos(new Set());
    setFechaBase(todayISO());
  };

  const alternarDia = (dia: string) => {
    setDiasExpandidos((prev) => {
      const next = new Set(prev);
      if (next.has(dia)) next.delete(dia);
      else next.add(dia);
      return next;
    });
  };

  const eventosPorDia = useMemo(() => {
    const mapa = new Map<string, ConsumoEvento[]>();
    for (const evento of eventos) {
      const lista = mapa.get(evento.fecha);
      if (lista) lista.push(evento);
      else mapa.set(evento.fecha, [evento]);
    }
    return mapa;
  }, [eventos]);

  const totalLineas = eventos.reduce((total, evento) => total + evento.insumos.length, 0);
  const eventosPendientes = eventos.filter((evento) => evento.insumos_pendientes > 0).length;
  const personalSemana = new Set(
    eventos.map((evento) => evento.empleado_id != null ? `id-${evento.empleado_id}` : `nombre-${evento.empleado_nombre.trim().toLowerCase()}`),
  ).size;
  const atencionesSinPersonal = eventos.filter((evento) => !evento.empleado_nombre.trim()).length;
  const resumenConPendiente = resumen.filter((row) => row.cantidad_pendiente > 0).length;
  const resumenDescontado = resumen.filter((row) => row.cantidad_pendiente <= 0).length;
  const atencionesEmpleados = resumenEmpleados.reduce((total, row) => total + row.atenciones, 0);
  const empleadosPendientes = resumenEmpleados.filter((row) => row.insumos_pendientes > 0).length;

  const columns: Column<ResumenRow>[] = [
    {
      key: 'item_nombre',
      label: 'Insumo',
      render: (value) => (
        <span className={styles.itemCell}>
          <strong>{value as string}</strong>
        </span>
      ),
    },
    {
      key: 'unidad_medida',
      label: 'Unidad',
      searchable: false,
      render: (value) => <span className={styles.unit}>{value as string}</span>,
    },
    {
      key: 'cantidad_usada',
      label: 'Cantidad usada',
      searchable: false,
      render: (value) => <span className={styles.num}>{formatQty(value as number)}</span>,
    },
    {
      key: 'cantidad_descontada',
      label: 'Cantidad descontada',
      searchable: false,
      render: (value) => <span className={styles.num}>{formatQty(value as number)}</span>,
    },
    {
      key: 'cantidad_pendiente',
      label: 'Pendiente de descuento',
      searchable: false,
      render: (value) => {
        const pendiente = value as number;
        return <span className={`${styles.num} ${pendiente > 0 ? styles.negative : styles.muted}`}>{formatQty(pendiente)}</span>;
      },
    },
    {
      key: 'atenciones',
      label: 'Atenciones',
      searchable: false,
      render: (value) => <span className={styles.num}>{value as number}</span>,
    },
  ];

  const columnsEmpleados: Column<EmpleadoRow>[] = [
    {
      key: 'empleado_nombre',
      label: 'Empleado',
      render: (value) => <strong>{value as string}</strong>,
    },
    {
      key: 'atenciones',
      label: 'Atenciones',
      searchable: false,
      render: (value) => <span className={styles.num}>{value as number}</span>,
    },
    {
      key: 'insumos_registrados',
      label: 'Registros de insumo',
      searchable: false,
      render: (value) => <span className={styles.num}>{value as number}</span>,
    },
    {
      key: 'insumos_distintos',
      label: 'Insumos distintos',
      searchable: false,
      render: (value) => <span className={styles.num}>{value as number}</span>,
    },
    {
      key: 'insumos_pendientes',
      label: 'Registros pendientes',
      searchable: false,
      render: (value) => {
        const pendientes = value as number;
        return <span className={`${styles.num} ${pendientes > 0 ? styles.negative : styles.muted}`}>{pendientes}</span>;
      },
    },
    {
      key: 'atenciones_pendientes',
      label: 'Atenciones con incidencia',
      searchable: false,
      render: (value) => <span className={styles.num}>{value as number}</span>,
    },
    {
      key: 'locales',
      label: 'Local(es)',
      render: (value) => <span className={styles.unit}>{(value as string) || '—'}</span>,
    },
  ];

  const lineasDetalle = (evento: ConsumoEvento, row: ConsumoResumen) =>
    evento.insumos.filter((insumo) => coincideInsumo(insumo, row) && coincideEstado(insumo, estado));

  return (
    <>
      <Tabs tabs={VISTA_TABS} active={vista} onChange={setVista} ariaLabel="Vistas de consumos" variant="underline" />

      <div className={styles.filters}>
        <FilterBar>
          {vista === 'calendario' ? (
            <FilterBar.Item label="Semana">
              <div className={styles.dateNav}>
                <button type="button" onClick={() => moverSemana(-1)} disabled={!lunes} aria-label="Semana anterior">
                  <ChevronLeft size={16} />
                </button>
                <input
                  type="date"
                  value={fechaBase}
                  onChange={(event) => {
                    setDiasExpandidos(new Set());
                    setFechaBase(event.target.value || todayISO());
                  }}
                />
                <button type="button" className={styles.hoy} onClick={irHoy} disabled={!fechaBase}>
                  Hoy
                </button>
                <button type="button" onClick={() => moverSemana(1)} disabled={!lunes} aria-label="Semana siguiente">
                  <ChevronRight size={16} />
                </button>
              </div>
            </FilterBar.Item>
          ) : (
            <FilterBar.Item label="Mes">
              <MonthPicker value={mes} onChange={setMes} />
            </FilterBar.Item>
          )}
          {!getAdminLocalScope() && (
            <FilterBar.Item label="Local">
              <LocalSelect value={localId} onChange={setLocalId} emptyLabel="Todos los locales" />
            </FilterBar.Item>
          )}
          {esEmpleado && (
            <FilterBar.Item label="Personal">
              <input
                type="text"
                value={empleado}
                onChange={(event) => setEmpleado(event.target.value)}
                placeholder="Nombre…"
              />
            </FilterBar.Item>
          )}
          {!esEmpleado && (
            <FilterBar.Item label="Insumo">
              <CustomSelect
                value={itemId}
                onChange={setItemId}
                options={itemOptions}
                placeholder="Todos"
                allowClear
              />
            </FilterBar.Item>
          )}
          {!esEmpleado && (
            <FilterBar.Item label="Deducción">
              <CustomSelect
                value={estado}
                onChange={setEstado}
                options={ESTADO_OPTIONS}
                placeholder="Todas"
                allowClear
                searchable={false}
              />
            </FilterBar.Item>
          )}
          <FilterBar.Item label="Cliente">
            <input
              type="text"
              value={cliente}
              onChange={(event) => setCliente(event.target.value)}
              placeholder="Nombre…"
            />
          </FilterBar.Item>
          <FilterBar.Item label="Servicio">
            <input
              type="text"
              value={servicio}
              onChange={(event) => setServicio(event.target.value)}
              placeholder="Servicio…"
            />
          </FilterBar.Item>
          {!esEmpleado && (
            <FilterBar.Item label="Personal">
              <input
                type="text"
                value={empleado}
                onChange={(event) => setEmpleado(event.target.value)}
                placeholder="Nombre…"
              />
            </FilterBar.Item>
          )}
          <FilterBar.Item label="Buscar" grow>
            <input
              type="text"
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder={esEmpleado ? 'Reserva, cliente, servicio o personal' : 'Reserva, insumo o cualquier dato'}
            />
          </FilterBar.Item>
        </FilterBar>
      </div>

      {vista === 'calendario' && (
        <>
          <StatGrid>
            <StatCard value={eventos.length} label="Atenciones en la semana" loading={loadingCalendario && eventos.length === 0} />
            {esEmpleado ? (
              <>
                <StatCard value={personalSemana} label="Personal registrado" loading={loadingCalendario && eventos.length === 0} />
                <StatCard value={atencionesSinPersonal} label="Sin personal registrado" loading={loadingCalendario && eventos.length === 0} />
              </>
            ) : (
              <>
                <StatCard value={totalLineas} label="Líneas de insumo" loading={loadingCalendario && eventos.length === 0} />
                <StatCard value={eventosPendientes} label="Con deducción pendiente" loading={loadingCalendario && eventos.length === 0} />
              </>
            )}
          </StatGrid>

          {errorCalendario && (
            <AlertBanner tone="danger" title="No se pudo cargar el calendario">
              {errorCalendario}
            </AlertBanner>
          )}

          <div className={styles.weekLabel}>
            {lunes && sabado ? `Semana del ${formatDateISO(lunes)} al ${formatDateISO(sabado)}` : 'Selecciona una fecha'}
          </div>

          {loadingCalendario && eventos.length === 0 ? (
            <p className={styles.state}>{esEmpleado ? 'Cargando atenciones…' : 'Cargando consumos…'}</p>
          ) : eventos.length === 0 ? (
            <AdminPanel>
              <p className={styles.state}>No hay {esEmpleado ? 'atenciones' : 'consumos'} para {descripcionCalendario}.</p>
            </AdminPanel>
          ) : (
            <AdminPanel>
              <div className={styles.weekGrid} aria-busy={loadingCalendario}>
                {dias.map((dia, index) => {
                  const partes = partesDia(dia);
                  const delDia = eventosPorDia.get(dia) ?? [];
                  const expandido = diasExpandidos.has(dia);
                  const visibles = expandido ? delDia : delDia.slice(0, 4);
                  const ocultos = delDia.length - visibles.length;
                  return (
                    <section key={dia} className={styles.day} aria-label={`${DIAS_SEMANA[index]} ${formatDateISO(dia)}`}>
                      <header className={styles.dayHeader}>
                        <span className={styles.dayName}>{DIAS_SEMANA[index]}</span>
                        <strong className={styles.dayNumber}>{partes.numero}</strong>
                        <span className={styles.dayMonth}>{partes.mes}</span>
                      </header>
                      <div className={styles.dayBody}>
                        {delDia.length === 0 ? (
                          <p className={styles.emptyDay}>{esEmpleado ? 'Sin atenciones' : 'Sin consumos'}</p>
                        ) : (
                          <>
                            {visibles.map((evento) => (
                              <button
                                key={evento.atencion_id}
                                type="button"
                                className={styles.event}
                                onClick={() => void abrirAtencion(evento)}
                                aria-label={`Ver atención de ${evento.cliente || 'sin cliente'} a las ${evento.hora_inicio || 'sin hora'}`}
                              >
                                <span className={styles.eventTop}>
                                  <span className={styles.eventTime}>
                                    {evento.hora_inicio?.slice(0, 5) || '—'}
                                    {evento.horario_programado && <span className={styles.programado} title="Hora tomada de la reserva">prog.</span>}
                                  </span>
                                  {!esEmpleado && evento.insumos_pendientes > 0 && (
                                    <AlertTriangle size={13} className={styles.warnIcon} aria-label="Deducción pendiente" />
                                  )}
                                </span>
                                <strong className={styles.eventClient}>{evento.cliente || 'Sin cliente'}</strong>
                                <span className={styles.eventService}>{evento.servicio || 'Sin servicio'}</span>
                                <span className={styles.eventMeta}>
                                  <span className={esEmpleado ? styles.eventEmployee : undefined}>
                                    {esEmpleado ? `Atendió: ${evento.empleado_nombre || 'Sin personal registrado'}` : (evento.empleado_nombre || 'Sin personal')}
                                  </span>
                                  {evento.local_nombre ? ` · ${evento.local_nombre}` : ''}
                                </span>
                                {!esEmpleado && (evento.insumos.length > 0 ? (
                                  <span className={styles.supplies}>
                                    {evento.insumos.map((insumo, i) => (
                                      <span key={`${insumo.item_id ?? 'sin'}-${insumo.item_nombre}-${i}`} className={styles.supplyRow}>
                                        <span>{insumo.item_nombre}</span>
                                        <span className={`${styles.supplyQty} ${insumo.cantidad_pendiente > 0 ? styles.pendingQty : ''}`}>
                                          {formatQty(insumo.cantidad_usada, insumo.unidad_medida)}
                                        </span>
                                      </span>
                                    ))}
                                  </span>
                                ) : (
                                  <span className={styles.noSupplies}>Sin insumos registrados</span>
                                ))}
                              </button>
                            ))}
                            {delDia.length > 4 && (
                              <button type="button" className={styles.more} onClick={() => alternarDia(dia)}>
                                {expandido ? 'Ver menos' : `Ver ${ocultos} más`}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </section>
                  );
                })}
              </div>
            </AdminPanel>
          )}
        </>
      )}

      {vista === 'reporte' && (
        <>
          <StatGrid>
            {esEmpleado ? (
              <>
                <StatCard value={resumenEmpleados.length} label="Personal con atenciones" loading={loadingReporte && resumenEmpleados.length === 0} />
                <StatCard value={atencionesEmpleados} label="Atenciones" loading={loadingReporte && resumenEmpleados.length === 0} />
                <StatCard value={empleadosPendientes} label="Con incidencia de stock" loading={loadingReporte && resumenEmpleados.length === 0} />
              </>
            ) : (
              <>
                <StatCard value={resumen.length} label="Insumos con consumo" loading={loadingReporte && resumen.length === 0} />
                <StatCard value={resumenConPendiente} label="Con deducción pendiente" loading={loadingReporte && resumen.length === 0} />
                <StatCard value={resumenDescontado} label="Descontados" loading={loadingReporte && resumen.length === 0} />
              </>
            )}
          </StatGrid>

          <div className={styles.reportPanel}>
            {esEmpleado ? (
              <DataTable<EmpleadoRow>
                columns={columnsEmpleados}
                data={resumenEmpleados as EmpleadoRow[]}
                loading={loadingReporte}
                error={errorReporte}
                onRefresh={cargarReporte}
                onRowClick={abrirResumenEmpleado}
                getRowKey={claveEmpleado}
                hideSearch
                emptyMessage={`No hay atenciones por personal para ${descripcionReporte}.`}
              />
            ) : (
              <DataTable<ResumenRow>
                columns={columns}
                data={resumen as ResumenRow[]}
                loading={loadingReporte}
                error={errorReporte}
                onRefresh={cargarReporte}
                onRowClick={abrirResumen}
                getRowKey={claveResumen}
                hideSearch
                emptyMessage={`No hay consumos para ${descripcionReporte}.`}
              />
            )}
          </div>
        </>
      )}

      <FormModal
        isOpen={Boolean(resumenAbierto || empleadoAbierto)}
        onClose={cerrarResumen}
        title={empleadoAbierto
          ? `Atenciones · ${empleadoAbierto.empleado_nombre}`
          : `Consumos · ${resumenAbierto?.item_nombre ?? ''}`}
        size="lg"
        hideFooter
      >
        {resumenAbierto && (
          <>
            <div className={styles.drillHeader}>
              <span>{formatMes(mes)}</span>
              <span>{formatQty(resumenAbierto.cantidad_usada, resumenAbierto.unidad_medida)} usados</span>
              {resumenAbierto.cantidad_pendiente > 0 && (
                <StatusBadge tone="danger">
                  Pendiente {formatQty(resumenAbierto.cantidad_pendiente, resumenAbierto.unidad_medida)}
                </StatusBadge>
              )}
            </div>
            {loadingDetalle ? (
              <p className={styles.state}>Cargando atenciones…</p>
            ) : errorDetalle ? (
              <AlertBanner tone="danger" title="No se pudieron cargar las atenciones">
                {errorDetalle}
              </AlertBanner>
            ) : eventosDetalle.length === 0 ? (
              <p className={styles.state}>Sin atenciones para este insumo y filtros.</p>
            ) : (
              <ul className={styles.drillList}>
                {eventosDetalle.map((evento) => {
                  const lineas = lineasDetalle(evento, resumenAbierto);
                  const usada = lineas.reduce((total, insumo) => total + insumo.cantidad_usada, 0);
                  const pendiente = lineas.reduce((total, insumo) => total + insumo.cantidad_pendiente, 0);
                  return (
                    <li key={evento.atencion_id} className={styles.drillItem}>
                      <div className={styles.drillDate}>
                        <strong>{formatDateISO(evento.fecha)}</strong>
                        <span>{evento.hora_inicio?.slice(0, 5) || '—'}</span>
                      </div>
                      <div className={styles.drillMain}>
                        <strong>{evento.cliente || 'Sin cliente'}</strong>
                        <span>{evento.servicio || 'Sin servicio'}</span>
                        <span>
                          {evento.empleado_nombre || 'Sin personal'}
                          {evento.local_nombre ? ` · ${evento.local_nombre}` : ''}
                        </span>
                      </div>
                      <div className={styles.drillQty}>
                        <span>{formatQty(usada, resumenAbierto.unidad_medida)}</span>
                        {pendiente > 0 && (
                          <StatusBadge tone="danger">
                            Pendiente {formatQty(pendiente, resumenAbierto.unidad_medida)}
                          </StatusBadge>
                        )}
                      </div>
                      <button type="button" className={styles.linkButton} onClick={() => void abrirAtencion(evento)}>
                        <ClipboardList size={13} /> Ver atención
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
        {empleadoAbierto && (
          <>
            <div className={styles.drillHeader}>
              <span>{formatMes(mes)}</span>
              <span>{empleadoAbierto.atenciones} atenciones</span>
            </div>
            {loadingDetalle ? (
              <p className={styles.state}>Cargando atenciones…</p>
            ) : errorDetalle ? (
              <AlertBanner tone="danger" title="No se pudieron cargar las atenciones">
                {errorDetalle}
              </AlertBanner>
            ) : eventosDetalle.length === 0 ? (
              <p className={styles.state}>Sin atenciones para este empleado y filtros.</p>
            ) : (
              <ul className={styles.drillList}>
                {eventosDetalle.map((evento) => (
                  <li key={evento.atencion_id} className={styles.drillItem}>
                    <div className={styles.drillDate}>
                      <strong>{formatDateISO(evento.fecha)}</strong>
                      <span>{evento.hora_inicio?.slice(0, 5) || '—'}</span>
                    </div>
                    <div className={styles.drillMain}>
                      <strong>{evento.cliente || 'Sin cliente'}</strong>
                      <span>{evento.servicio || 'Sin servicio'}</span>
                      <span>
                        {evento.local_nombre || 'Sin local'}
                        {evento.lugar ? ` · ${evento.lugar}` : ''}
                      </span>
                      <span className={styles.eventEmployee}>Atendió: {evento.empleado_nombre || 'Sin personal registrado'}</span>
                    </div>
                    <div className={styles.drillQty} />
                    <button type="button" className={styles.linkButton} onClick={() => void abrirAtencion(evento)}>
                      <ClipboardList size={13} /> Ver atención
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </FormModal>

      <AtencionDetalleModal
        reserva={detalle?.reserva ?? null}
        atencion={detalle?.atencion ?? null}
        onClose={() => setDetalle(null)}
      />
    </>
  );
}
