'use client';

import { useState } from 'react';
import { AlertBanner, CursorPagination, FilterBar, StatCard, StatGrid } from '@/components/AdminConfig';
import { getSeguimiento, getSeguimientoResumen, type TipoSeguimiento } from '@/lib/api/atenciones';
import { localInicial } from '@/lib/api/localScope';
import { useAsyncData } from '@/lib/hooks/useAsyncData';
import { useCursorList } from '@/lib/hooks/useCursorList';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import { leerVistaCliente, useVistaUrl } from '@/lib/hooks/useVistaUrl';
import { ATENCION_ESTADO, estadoDeSeguimiento } from '@/lib/utils/atencionEstado';
import { AtencionFila } from './AtencionFila';
import { AtencionLista } from './AtencionLista';
import { AtencionModales, useAtencionModales } from './AtencionModales';

const TIPOS: TipoSeguimiento[] = ['PENDIENTE_CIERRE', 'DEDUCCION_PENDIENTE', 'INASISTENCIA', 'CANCELACION'];

/** Casos operativos que todavía requieren una acción, separados de Historial. */
export function SeguimientoTab() {
  const [link] = useState(() => leerVistaCliente('seguimiento', ['local_id', 'fecha_desde', 'fecha_hasta', 'tipo', 'q']));
  const [localId, setLocalId] = useState(() => localInicial(link.local_id));
  const [desde, setDesde] = useState(link.fecha_desde);
  const [hasta, setHasta] = useState(link.fecha_hasta);
  const [tipo, setTipo] = useState<TipoSeguimiento | ''>(TIPOS.includes(link.tipo as TipoSeguimiento) ? (link.tipo as TipoSeguimiento) : '');
  const [q, setQ] = useState(link.q);
  const qAplicado = useDebouncedValue(q.trim());

  useVistaUrl('seguimiento', { local_id: localId, fecha_desde: desde, fecha_hasta: hasta, tipo, q: qAplicado });

  const alcance = { local_id: localId ? Number(localId) : undefined, fecha_desde: desde || undefined, fecha_hasta: hasta || undefined };
  const { data, loading, error, load, pagination } = useCursorList(
    { ...alcance, tipo: tipo || undefined, q: qAplicado || undefined },
    getSeguimiento,
    'No fue posible cargar el seguimiento.',
  );
  const resumen = useAsyncData(() => getSeguimientoResumen(alcance), `${localId}|${desde}|${hasta}`);
  const ctrl = useAtencionModales(() => { void load(); void resumen.reload(); });

  const cifras = resumen.data;
  const filtrarPor = (nuevo: TipoSeguimiento) => setTipo((actual) => (actual === nuevo ? '' : nuevo));
  const tarjeta = (clave: TipoSeguimiento, valor: number | undefined, label: string, tone: 'warning' | 'danger') => (
    <StatCard value={valor ?? 0} label={label} tone={tone} loading={resumen.loading} onClick={() => filtrarPor(clave)} active={tipo === clave} />
  );
  const items = data?.items ?? [];

  return (
    <>
      <FilterBar unaLinea>
        <FilterBar.Fechas desde={desde} hasta={hasta} onChange={(d, h) => { setDesde(d); setHasta(h); }} />
        <FilterBar.Local value={localId} onChange={setLocalId} />
        <FilterBar.Search value={q} onChange={setQ} />
      </FilterBar>

      <StatGrid>
        {tarjeta('PENDIENTE_CIERRE', cifras?.pendientes_cierre, 'Pendientes de cierre', 'warning')}
        {tarjeta('DEDUCCION_PENDIENTE', cifras?.deducciones_pendientes, ATENCION_ESTADO.STOCK_PENDIENTE.label, 'warning')}
        {tarjeta('INASISTENCIA', cifras?.inasistencias, 'Inasistencias', 'danger')}
        {tarjeta('CANCELACION', cifras?.cancelaciones, 'Cancelaciones', 'danger')}
      </StatGrid>

      {error && <AlertBanner tone="danger" title="No fue posible cargar el seguimiento">{error}</AlertBanner>}

      <AtencionLista total={items.length} loading={loading} vacio={{ title: 'Sin casos pendientes', hint: 'No hay casos que coincidan con los filtros aplicados.' }}>
        {items.map((row) => (
          <AtencionFila
            key={`${row.tipo}-${row.atencion_id ?? row.reserva_id}`}
            ctrl={ctrl}
            estado={estadoDeSeguimiento(row.tipo)}
            reservaId={row.reserva_id}
            atencionId={row.atencion_id}
            puede={{
              atender: row.puede_atender,
              cancelar: row.puede_atender && !row.atencion_id,
              verAtencion: Boolean(row.atencion_id),
              editar: row.puede_editar_atencion,
            }}
            cliente={row.cliente}
            servicio={row.servicio}
            fecha={row.fecha}
            horaDesde={row.hora_inicio}
            horaHasta={row.hora_fin}
            local={row.local_nombre}
            empleado={row.empleado_nombre}
            detalle={row.detalle_insumos_pendientes || row.motivo}
            mostrarEstado={!tipo}
          />
        ))}
      </AtencionLista>
      <CursorPagination page={pagination.page} totalPages={pagination.totalPages} hasNext={pagination.hasNext} loading={loading} onPrevious={pagination.previous} onNext={pagination.next} />

      <AtencionModales ctrl={ctrl} />
    </>
  );
}
