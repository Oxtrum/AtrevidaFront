'use client';

import { useMemo, useState } from 'react';
import { AlertBanner, CursorPagination, FilterBar, SelectorFecha, VistaToggle } from '@/components/AdminConfig';
import { getCalendarioPersonal } from '@/lib/api/atenciones';
import { localInicial } from '@/lib/api/localScope';
import { useCursorList } from '@/lib/hooks/useCursorList';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import { leerVistaCliente, useVistaUrl } from '@/lib/hooks/useVistaUrl';
import { ATENCION_ESTADO, estadoDeAtencion } from '@/lib/utils/atencionEstado';
import { cantidadTexto } from '@/lib/utils/cantidadTexto';
import { todayISO } from '@/lib/utils/format';
import { diasDeSemana } from '@/lib/utils/semana';
import type { CalendarioPersonalEvento } from '@/types/atencionesVistas';
import { AtencionFila } from './AtencionFila';
import { AtencionLista } from './AtencionLista';
import { AtencionModales, useAtencionModales } from './AtencionModales';
import { CalendarioEvento } from './CalendarioEvento';
import { CabeceraVista, CalendarioSemanal } from './CalendarioSemanal';

const fechaDe = (evento: CalendarioPersonalEvento) => evento.fecha;
const claveDe = (evento: CalendarioPersonalEvento) => evento.atencion_id;
const esPendiente = (evento: CalendarioPersonalEvento) => evento.insumos_pendientes > 0;

/** Calendario semanal de atenciones cerradas que prioriza quién atendió. */
export function CalendarioPersonalTab() {
  const [link] = useState(() => leerVistaCliente('personal', ['fecha', 'local_id', 'empleado', 'q', 'modo']));
  const [fechaBase, setFechaBase] = useState(link.fecha || todayISO());
  const [localId, setLocalId] = useState(() => localInicial(link.local_id));
  const [empleado, setEmpleado] = useState(link.empleado);
  const [q, setQ] = useState(link.q);
  const [modo, setModo] = useState<'calendario' | 'lista'>(link.modo === 'lista' ? 'lista' : 'calendario');
  const texto = {
    empleado: useDebouncedValue(empleado.trim()),
    q: useDebouncedValue(q.trim()),
  };

  useVistaUrl('personal', { fecha: fechaBase, local_id: localId, modo: modo === 'lista' ? modo : undefined, ...texto });

  const dias = useMemo(() => diasDeSemana(fechaBase), [fechaBase]);
  const { data, loading, error, load, pagination } = useCursorList(
    {
      fecha_desde: dias[0],
      fecha_hasta: dias[dias.length - 1],
      local_id: localId ? Number(localId) : undefined,
      empleado: texto.empleado || undefined,
      q: texto.q || undefined,
    },
    getCalendarioPersonal,
    'No fue posible cargar el calendario de personal.',
  );
  const ctrl = useAtencionModales(() => void load());
  const eventos = data?.eventos ?? [];
  const cabecera = (
    <CabeceraVista titulo={loading ? 'Cargando…' : cantidadTexto(eventos.length, 'atención', 'atenciones', pagination.page)}>
      <VistaToggle value={modo} onChange={setModo} />
    </CabeceraVista>
  );

  return (
    <>
      <FilterBar unaLinea>
        <FilterBar.Item label="Semana" full><SelectorFecha conHoy value={fechaBase} onChange={setFechaBase} /></FilterBar.Item>
        <FilterBar.Local value={localId} onChange={setLocalId} />
        <FilterBar.Item label="Personal"><input value={empleado} onChange={(e) => setEmpleado(e.target.value)} placeholder="Nombre" /></FilterBar.Item>
        <FilterBar.Search value={q} onChange={setQ} />
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
          vacio={{ title: 'No hay atenciones en la semana seleccionada', hint: 'Seleccione otra semana o modifique los filtros.' }}
          onAbrir={(e) => void ctrl.verAtencion(e.atencion_id, e.reserva_id)}
          renderEvento={(e) => (
            <CalendarioEvento
              tono={ATENCION_ESTADO[estadoDeAtencion(e)].tone}
              horaDesde={e.hora_inicio}
              horaHasta={e.hora_fin}
              cliente={e.cliente}
              servicio={e.servicio}
              empleado={e.empleado_nombre}
              aviso={e.insumos_pendientes > 0 ? ATENCION_ESTADO.STOCK_PENDIENTE.label : undefined}
            />
          )}
        />
      ) : (
        <>
          <AtencionLista total={eventos.length} loading={loading} vacio={{ title: 'No hay atenciones en la semana seleccionada', hint: 'Seleccione otra semana o modifique los filtros.' }}>
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
                local={e.local_nombre || e.lugar}
                empleado={e.empleado_nombre}
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
