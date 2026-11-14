'use client';

import { useState } from 'react';
import { AlertBanner, CursorPagination, FilterBar, SelectorFecha, StatCard, StatGrid } from '@/components/AdminConfig';
import { getJornada, getJornadaResumen, type EstadoOperativoJornada } from '@/lib/api/atenciones';
import { getAdminLocalScope, localInicial } from '@/lib/api/localScope';
import { useAsyncData } from '@/lib/hooks/useAsyncData';
import { useCursorList } from '@/lib/hooks/useCursorList';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import { leerVistaCliente, useVistaUrl } from '@/lib/hooks/useVistaUrl';
import { ATENCION_ESTADO, estadoDeJornada } from '@/lib/utils/atencionEstado';
import { hayFiltrosActivos } from '@/lib/utils/filtros';
import { agruparPorFranja, proximaReservaId } from '@/lib/utils/jornada';
import { AtencionFila } from './AtencionFila';
import { AtencionGrupo, AtencionLista } from './AtencionLista';
import { AtencionModales, useAtencionModales } from './AtencionModales';

const ESTADOS: EstadoOperativoJornada[] = ['PROGRAMADA', 'PENDIENTE_CIERRE', 'ATENDIDA', 'CANCELADA'];

/** Atenciones del día: qué toca atender, qué se atendió y qué quedó pendiente. */
export function JornadaTab() {
  const [link] = useState(() => leerVistaCliente('jornada', ['fecha', 'local_id', 'estado', 'q']));
  const [fecha, setFecha] = useState(link.fecha);
  const [localId, setLocalId] = useState(() => localInicial(link.local_id));
  // Sin estado en la URL se abre en Programadas, que es lo que hay que hacer hoy.
  const [estado, setEstado] = useState(ESTADOS.includes(link.estado as EstadoOperativoJornada) ? link.estado : 'PROGRAMADA');
  const [q, setQ] = useState(link.q);
  const qAplicado = useDebouncedValue(q.trim());

  useVistaUrl('jornada', { fecha, local_id: localId, estado, q: qAplicado });

  const { data, loading, error, load, pagination } = useCursorList(
    { fecha: fecha || undefined, local_id: localId ? Number(localId) : undefined, estado: (estado || undefined) as EstadoOperativoJornada | undefined, q: qAplicado || undefined },
    getJornada,
    'No fue posible cargar la jornada.',
  );
  const resumen = useAsyncData(
    () => getJornadaResumen({ fecha: fecha || undefined, local_id: localId ? Number(localId) : undefined }),
    `${fecha}|${localId}`,
  );
  const ctrl = useAtencionModales(() => { void load(); void resumen.reload(); });

  const hoy = resumen.data?.hoy || data?.hoy || '';
  const cifras = resumen.data?.resumen;
  const filtrarPor = (nuevo: EstadoOperativoJornada) => setEstado((actual) => (actual === nuevo ? '' : nuevo));
  const tarjeta = (clave: EstadoOperativoJornada, valor: number | undefined, label: string, tone: 'info' | 'success' | 'warning' | 'danger') => (
    <StatCard value={valor ?? 0} label={label} tone={tone} loading={resumen.loading} onClick={() => filtrarPor(clave)} active={estado === clave} />
  );
  const rows = data?.items ?? [];
  const limpiar = () => {
    setFecha('');
    setEstado('');
    setQ('');
    if (!getAdminLocalScope()) setLocalId('');
  };
  const fechaMostrada = fecha || hoy || data?.fecha || '';
  // "Siguiente" solo tiene sentido mirando el día de hoy.
  const ahora = new Date().toTimeString().slice(0, 5);
  const siguienteId = fechaMostrada && fechaMostrada === hoy ? proximaReservaId(rows, ahora) : undefined;
  const grupos = agruparPorFranja(rows);

  return (
    <>
      <FilterBar unaLinea onLimpiar={limpiar} hayFiltros={hayFiltrosActivos([fecha, estado, q, !getAdminLocalScope() && localId])}>
        <FilterBar.Item label="Fecha" full>
          <SelectorFecha unidad="dia" conHoy value={fechaMostrada} today={hoy} onChange={setFecha} />
        </FilterBar.Item>
        <FilterBar.Local value={localId} onChange={setLocalId} />
        <FilterBar.Search value={q} onChange={setQ} />
      </FilterBar>

      <StatGrid>
        {tarjeta('PROGRAMADA', cifras?.programadas, 'Programadas', 'info')}
        {tarjeta('ATENDIDA', cifras?.atendidas, 'Atendidas', 'success')}
        {tarjeta('PENDIENTE_CIERRE', cifras?.pendientes_cierre, 'Pendientes de cierre', 'warning')}
        {tarjeta('CANCELADA', cifras?.canceladas, 'Canceladas e inasistencias', 'danger')}
        <StatCard value={cifras?.deducciones_pendientes ?? 0} label={ATENCION_ESTADO.STOCK_PENDIENTE.label} tone="warning" loading={resumen.loading} />
      </StatGrid>

      {error && <AlertBanner tone="danger" title="No fue posible cargar la jornada">{error}</AlertBanner>}
      {resumen.error && <AlertBanner tone="danger" title="No fue posible cargar el resumen">{resumen.error}</AlertBanner>}

      <AtencionLista total={rows.length} loading={loading} vacio={{ title: 'No hay reservas para la fecha seleccionada', hint: 'Seleccione otra fecha o modifique los filtros.' }}>
        {grupos.map((grupo) => (
          <AtencionGrupo key={grupo.franja} titulo={grupos.length > 1 ? grupo.titulo : undefined} cantidad={grupo.filas.length}>
            {grupo.filas.map((row) => (
              <AtencionFila
                key={row.reserva_id}
                ctrl={ctrl}
                estado={estadoDeJornada(row)}
                reservaId={row.reserva_id}
                atencionId={row.atencion_id}
                puede={{
                  atender: row.puede_atender,
                  cancelar: row.estado_reserva === 'AGENDADO' && !row.atencion_id,
                  verAtencion: row.puede_ver_atencion,
                  editar: row.puede_editar_atencion,
                }}
                cliente={row.cliente}
                servicio={row.servicio}
                horaDesde={row.hora_desde}
                horaHasta={row.hora_hasta}
                local={row.local_nombre}
                empleado={row.empleado_nombre}
                mostrarSinPersonal
                detalle={row.insumos_registrados > 0 ? `Insumos: ${row.insumos_resumen || row.insumos_registrados}` : 'Sin insumos registrados'}
                stockPendiente={row.insumos_pendientes}
                mostrarEstado={!estado}
                siguiente={row.reserva_id === siguienteId}
              />
            ))}
          </AtencionGrupo>
        ))}
      </AtencionLista>
      <CursorPagination page={pagination.page} totalPages={pagination.totalPages} hasNext={pagination.hasNext} loading={loading} onPrevious={pagination.previous} onNext={pagination.next} />

      <AtencionModales ctrl={ctrl} />
    </>
  );
}
