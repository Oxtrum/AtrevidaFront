'use client';

import { useMemo, useState } from 'react';
import { AlertBanner, CursorPagination, FilterBar, SelectorFecha, VistaToggle } from '@/components/AdminConfig';
import { CustomSelect } from '@/components/Custom/CustomSelectAdmin';
import { getCalendarioConsumo } from '@/lib/api/atenciones';
import { getAdminLocalScope, localInicial } from '@/lib/api/localScope';
import { useCursorList } from '@/lib/hooks/useCursorList';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import { useInventarioItems } from '@/lib/hooks/useInventarioItems';
import { leerVistaCliente, useVistaUrl } from '@/lib/hooks/useVistaUrl';
import { ATENCION_ESTADO, estadoDeAtencion } from '@/lib/utils/atencionEstado';
import { hayFiltrosActivos } from '@/lib/utils/filtros';
import { cantidadTexto } from '@/lib/utils/cantidadTexto';
import { todayISO } from '@/lib/utils/format';
import { diasDeSemana } from '@/lib/utils/semana';
import type { CalendarioConsumoEvento } from '@/types/atencionesVistas';
import { AtencionFila } from './AtencionFila';
import { AtencionLista } from './AtencionLista';
import { AtencionModales, useAtencionModales } from './AtencionModales';
import { CalendarioEvento, InsumosEvento, textoInsumos } from './CalendarioEvento';
import { CabeceraVista, CalendarioSemanal } from './CalendarioSemanal';

const STOCK_OPTIONS = [{ value: 'DESCONTADO', label: 'Descuento aplicado' }, { value: 'PENDIENTE', label: 'Descuento pendiente' }];
const fechaDe = (evento: CalendarioConsumoEvento) => evento.fecha;
const claveDe = (evento: CalendarioConsumoEvento) => evento.atencion_id;
const esPendiente = (evento: CalendarioConsumoEvento) => evento.insumos_pendientes > 0;

/** Calendario semanal de insumos declarados en cada atención cerrada. */
export function CalendarioConsumoTab() {
  const [link] = useState(() => leerVistaCliente('consumo', ['fecha', 'local_id', 'item_id', 'estado_descuento', 'q', 'modo']));
  const [fechaBase, setFechaBase] = useState(link.fecha || todayISO());
  const [localId, setLocalId] = useState(() => localInicial(link.local_id));
  const [itemId, setItemId] = useState(link.item_id);
  const [estado, setEstado] = useState(link.estado_descuento === 'DESCONTADO' || link.estado_descuento === 'PENDIENTE' ? link.estado_descuento : '');
  const [q, setQ] = useState(link.q);
  const [modo, setModo] = useState<'calendario' | 'lista'>(link.modo === 'lista' ? 'lista' : 'calendario');
  const qAplicado = useDebouncedValue(q.trim());
  const { items } = useInventarioItems({ activo: true });

  useVistaUrl('consumo', { fecha: fechaBase, local_id: localId, item_id: itemId, estado_descuento: estado, modo: modo === 'lista' ? modo : undefined, q: qAplicado });

  const dias = useMemo(() => diasDeSemana(fechaBase), [fechaBase]);
  const { data, loading, error, load, pagination } = useCursorList(
    {
      fecha_desde: dias[0],
      fecha_hasta: dias[dias.length - 1],
      local_id: localId ? Number(localId) : undefined,
      item_id: itemId ? Number(itemId) : undefined,
      estado_descuento: (estado || undefined) as 'DESCONTADO' | 'PENDIENTE' | undefined,
      q: qAplicado || undefined,
    },
    getCalendarioConsumo,
    'No fue posible cargar el calendario de consumo.',
  );
  const ctrl = useAtencionModales(() => void load());
  const eventos = data?.eventos ?? [];
  // La semana es navegación, no un filtro: Limpiar no la mueve.
  const limpiar = () => {
    setItemId('');
    setEstado('');
    setQ('');
    if (!getAdminLocalScope()) setLocalId('');
  };
  const cabecera = (
    <CabeceraVista titulo={loading ? 'Cargando…' : cantidadTexto(eventos.length, 'consumo registrado', 'consumos registrados', pagination.page)}>
      <VistaToggle value={modo} onChange={setModo} />
    </CabeceraVista>
  );

  return (
    <>
      <FilterBar
        unaLinea
        onLimpiar={limpiar}
        hayFiltros={hayFiltrosActivos([itemId, estado, q, !getAdminLocalScope() && localId])}
        avanzadosAbiertos={Boolean(link.item_id || link.estado_descuento)}
        avanzados={(
          <>
              <FilterBar.Item label="Insumo">
                <CustomSelect value={itemId} onChange={setItemId} options={items.filter((i) => i.activo).map((i) => ({ value: String(i.id), label: `${i.nombre} (${i.unidad_medida})` }))} placeholder="Todos" allowClear />
              </FilterBar.Item>
              <FilterBar.Item label="Inventario">
                <CustomSelect value={estado} onChange={setEstado} options={STOCK_OPTIONS} placeholder="Todos" allowClear searchable={false} />
              </FilterBar.Item>
          </>
        )}
      >
        <FilterBar.Item label="Semana" full><SelectorFecha conHoy value={fechaBase} onChange={setFechaBase} /></FilterBar.Item>
        <FilterBar.Local value={localId} onChange={setLocalId} />
        <FilterBar.Search value={q} onChange={setQ} placeholder="Cliente o servicio" />
      </FilterBar>

      {error && <AlertBanner tone="danger" title="No fue posible cargar el calendario">{error}</AlertBanner>}

      {cabecera}
      {modo === 'calendario' ? (
        <CalendarioSemanal

          dias={dias}
          eventos={eventos}
          fechaDe={fechaDe}
          claveDe={claveDe}
          loading={loading}
          esPendiente={esPendiente}
          vacio={{ title: 'No hay consumos en la semana seleccionada', hint: 'Seleccione otra semana o modifique los filtros.' }}
          onAbrir={(e) => void ctrl.verAtencion(e.atencion_id, e.reserva_id)}
          renderEvento={(e) => (
            <CalendarioEvento
              tono={ATENCION_ESTADO[estadoDeAtencion(e)].tone}
              horaDesde={e.hora_inicio}
              horaHasta={e.hora_fin}
              cliente={e.cliente}
              aviso={e.insumos_pendientes > 0 ? ATENCION_ESTADO.STOCK_PENDIENTE.label : undefined}
            >
              <InsumosEvento insumos={e.insumos} />
            </CalendarioEvento>
          )}
        />
      ) : (
        <>
          <AtencionLista total={eventos.length} loading={loading} vacio={{ title: 'No hay consumos en la semana seleccionada', hint: 'Seleccione otra semana o modifique los filtros.' }}>
            {eventos.map((e) => (
              <AtencionFila
                key={e.atencion_id}
                ctrl={ctrl}
                estado={estadoDeAtencion(e)}
                reservaId={e.reserva_id}
                atencionId={e.atencion_id}
                puede={{ verAtencion: true, editar: e.insumos_pendientes > 0 }}
                cliente={e.cliente}
                servicio={e.servicio}
                fecha={e.fecha}
                horaDesde={e.hora_inicio}
                horaHasta={e.hora_fin}
                local={e.local_nombre}
                empleado={e.empleado_nombre}
                detalle={textoInsumos(e.insumos) || 'Sin insumos'}
                stockPendiente={e.insumos_pendientes}
              />
            ))}
          </AtencionLista>
        </>
      )}
      <CursorPagination page={pagination.page} totalPages={pagination.totalPages} hasNext={pagination.hasNext} loading={loading} onPrevious={pagination.previous} onNext={pagination.next} />

      <AtencionModales ctrl={ctrl} />
    </>
  );
}
