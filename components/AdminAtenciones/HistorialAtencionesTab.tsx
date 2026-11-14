'use client';

import { useEffect, useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { AdminButton, ConfirmDialog, CursorPagination, DataTable, FilterBar, StatusBadge } from '@/components/AdminConfig';
import type { Column } from '@/components/AdminConfig';
import { CustomSelect } from '@/components/Custom/CustomSelectAdmin';
import { desactivarAtencion, getAtenciones, type Atencion } from '@/lib/api/atenciones';
import { getAdminLocalScope, localInicial } from '@/lib/api/localScope';
import { useCursorList } from '@/lib/hooks/useCursorList';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import { useInventarioItems } from '@/lib/hooks/useInventarioItems';
import { useServerSort } from '@/lib/hooks/useServerSort';
import { leerVistaCliente, useVistaUrl } from '@/lib/hooks/useVistaUrl';
import { ATENCION_ESTADO, estadoDeResultado } from '@/lib/utils/atencionEstado';
import type { SortState } from '@/lib/utils/sortRows';
import { toast } from '@/components/Shared/Toast';
import { AtencionAcciones } from './AtencionAcciones';
import { AtencionModales, useAtencionModales } from './AtencionModales';
import styles from './HistorialAtencionesTab.module.css';

type AtencionRow = Atencion & Record<string, unknown>;
type Resultado = 'ATENDIDA' | 'CANCELADA' | 'INASISTENCIA';

/** Orden que el servidor aplica sin ordenar_por; solo se usa para marcar el header de fecha. */
const ORDEN_POR_DEFECTO: SortState = { key: 'fecha_atencion', dir: 'desc' };
const RESULTADOS: Resultado[] = ['ATENDIDA', 'CANCELADA', 'INASISTENCIA'];
const RESULTADO_OPTIONS = RESULTADOS.map((value) => ({ value, label: ATENCION_ESTADO[value].label }));
const CLAVES = ['local_id', 'fecha_desde', 'fecha_hasta', 'q', 'cliente', 'servicio', 'empleado', 'item_id', 'pendientes_stock', 'resultado', 'ordenar_por', 'sentido'] as const;

const formatDate = (value: string) => {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return year && month && day
    ? new Date(year, month - 1, day).toLocaleDateString('es-BO', { day: 'numeric', month: 'short', year: 'numeric' })
    : value;
};

const celdaTexto = (value: unknown) => <span className={styles.truncate} title={String(value || '')}>{String(value || '—')}</span>;

/** Historial de atenciones con filtros de servidor, orden por columna y paginación por cursor. */
export function HistorialAtencionesTab() {
  const [link] = useState(() => leerVistaCliente('historial', CLAVES));
  const [localId, setLocalId] = useState(() => localInicial(link.local_id));
  const [desde, setDesde] = useState(link.fecha_desde);
  const [hasta, setHasta] = useState(link.fecha_hasta);
  const [q, setQ] = useState(link.q);
  const [cliente, setCliente] = useState(link.cliente);
  const [servicio, setServicio] = useState(link.servicio);
  const [empleado, setEmpleado] = useState(link.empleado);
  const [itemId, setItemId] = useState(link.item_id);
  const [pendientesStock, setPendientesStock] = useState(link.pendientes_stock === 'true' || link.pendientes_stock === 'false' ? link.pendientes_stock : '');
  const [resultado, setResultado] = useState(RESULTADOS.includes(link.resultado as Resultado) ? link.resultado : '');
  const [avanzados, setAvanzados] = useState(() => Boolean(link.cliente || link.servicio || link.empleado || link.item_id || link.pendientes_stock));
  const { items } = useInventarioItems({ activo: true });

  const texto = {
    q: useDebouncedValue(q.trim()),
    cliente: useDebouncedValue(cliente.trim()),
    servicio: useDebouncedValue(servicio.trim()),
    empleado: useDebouncedValue(empleado.trim()),
  };
  const serverSort = useServerSort(
    ORDEN_POR_DEFECTO,
    link.ordenar_por && (link.sentido === 'asc' || link.sentido === 'desc') ? { key: link.ordenar_por, dir: link.sentido } : null,
  );
  const { params: sortParams } = serverSort;

  useVistaUrl('historial', {
    local_id: localId, fecha_desde: desde, fecha_hasta: hasta, ...texto, item_id: itemId,
    pendientes_stock: pendientesStock, resultado, ordenar_por: sortParams.ordenar_por, sentido: sortParams.ordenar_por ? sortParams.sentido : undefined,
  });

  const { data, loading, error, load, pagination } = useCursorList(
    {
      local_id: localId ? Number(localId) : undefined,
      fecha_desde: desde || undefined,
      fecha_hasta: hasta || undefined,
      cliente: texto.cliente || undefined,
      servicio: texto.servicio || undefined,
      empleado: texto.empleado || undefined,
      item_id: itemId ? Number(itemId) : undefined,
      pendientes_stock: pendientesStock === '' ? undefined : pendientesStock === 'true',
      resultado: (resultado || undefined) as Resultado | undefined,
      q: texto.q || undefined,
      ...sortParams,
    },
    getAtenciones,
    'No fue posible cargar el historial.',
  );
  const ctrl = useAtencionModales(() => pagination.resetAfterMutation());

  // El total solo llega en la primera página; se recuerda mientras se navega.
  const [total, setTotal] = useState<number | undefined>();
  useEffect(() => {
    const nuevo = data?.paginacion?.total_registros ?? data?.total_registros;
    if (nuevo !== undefined) setTotal(nuevo);
  }, [data]);

  const [aDesactivar, setADesactivar] = useState<Atencion | null>(null);
  const [restituirStock, setRestituirStock] = useState(false);
  const [desactivando, setDesactivando] = useState(false);
  const confirmarDesactivacion = async () => {
    if (!aDesactivar) return;
    setDesactivando(true);
    try {
      await desactivarAtencion(aDesactivar.id, restituirStock);
      toast.success(restituirStock ? 'Atención desactivada e inventario restituido.' : 'Atención desactivada.');
      setADesactivar(null);
      pagination.resetAfterMutation();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No fue posible desactivar la atención.');
    } finally {
      setDesactivando(false);
    }
  };

  const columns: Column<AtencionRow>[] = [
    { key: 'fecha_atencion', label: 'Fecha', firstSort: 'desc', render: (value) => formatDate(String(value)) },
    {
      key: 'resultado',
      label: 'Resultado',
      render: (_, row) => {
        const estado = estadoDeResultado(row);
        const detalle = [row.motivo_cancelacion_tipo, row.motivo_cancelacion_detalle].filter(Boolean).join(' · ');
        return <StatusBadge tone={ATENCION_ESTADO[estado].tone} title={detalle || undefined}>{ATENCION_ESTADO[estado].label}</StatusBadge>;
      },
    },
    { key: 'hora_inicio', label: 'Horario', render: (_, row) => [row.hora_inicio, row.hora_fin].filter(Boolean).join(' – ') || 'Horario no registrado' },
    { key: 'cliente_nombre', label: 'Cliente', render: celdaTexto },
    { key: 'servicio_reserva', label: 'Servicio', render: celdaTexto },
    { key: 'empleado_nombre', label: 'Personal', render: celdaTexto },
    { key: 'local_nombre', label: 'Local', render: celdaTexto },
    {
      key: 'acciones',
      label: 'Acciones',
      searchable: false,
      sortable: false,
      render: (_, row) => {
        const cerrada = row.resultado !== 'CANCELADA';
        return (
          <AtencionAcciones
            ctrl={ctrl}
            reservaId={row.reserva_id}
            atencionId={row.id}
            puede={{ verAtencion: cerrada, editar: cerrada && row.insumos_pendientes > 0 }}
            onDesactivar={cerrada ? () => { setRestituirStock(false); setADesactivar(row); } : undefined}
          />
        );
      },
    },
  ];

  const limpiar = () => {
    setDesde(''); setHasta(''); setQ(''); setCliente(''); setServicio(''); setEmpleado('');
    setItemId(''); setPendientesStock(''); setResultado('');
    if (!getAdminLocalScope()) setLocalId('');
  };

  return (
    <>
      <FilterBar unaLinea>
        <FilterBar.Search value={q} onChange={setQ} />
        <FilterBar.Local value={localId} onChange={setLocalId} />
        <FilterBar.Item label="Resultado">
          <CustomSelect value={resultado} onChange={setResultado} options={RESULTADO_OPTIONS} placeholder="Todos" allowClear searchable={false} />
        </FilterBar.Item>
        <FilterBar.Fechas desde={desde} hasta={hasta} onChange={(d, h) => { setDesde(d); setHasta(h); }} />
        <FilterBar.Action>
          <AdminButton variant="secondary" size="sm" icon={<SlidersHorizontal size={14} />} onClick={() => setAvanzados((actual) => !actual)} aria-expanded={avanzados}>
            {avanzados ? 'Menos filtros' : 'Más filtros'}
          </AdminButton>
        </FilterBar.Action>
        <FilterBar.Action>
          <AdminButton variant="secondary" size="sm" icon={<X size={14} />} onClick={limpiar}>Limpiar</AdminButton>
        </FilterBar.Action>
      </FilterBar>

      {avanzados && (
        <FilterBar>
          <FilterBar.Item label="Cliente"><input type="text" value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Nombre del cliente" /></FilterBar.Item>
          <FilterBar.Item label="Servicio"><input type="text" value={servicio} onChange={(e) => setServicio(e.target.value)} placeholder="Servicio realizado" /></FilterBar.Item>
          <FilterBar.Item label="Personal"><input type="text" value={empleado} onChange={(e) => setEmpleado(e.target.value)} placeholder="Nombre del personal" /></FilterBar.Item>
          <FilterBar.Item label="Insumo">
            <CustomSelect value={itemId} onChange={setItemId} options={items.filter((item) => item.activo).map((item) => ({ value: String(item.id), label: item.nombre }))} placeholder="Todos" allowClear />
          </FilterBar.Item>
          <FilterBar.Item label="Inventario">
            <CustomSelect
              value={pendientesStock}
              onChange={setPendientesStock}
              options={[{ value: 'true', label: 'Descuento pendiente' }, { value: 'false', label: 'Descuento aplicado' }]}
              placeholder="Todos"
              allowClear
              searchable={false}
            />
          </FilterBar.Item>
        </FilterBar>
      )}

      <div className={styles.historyTable}>
        <DataTable<AtencionRow>
          sort={serverSort.sort}
          onSortChange={serverSort.onSortChange}
          columns={columns}
          data={(data?.atenciones ?? []) as AtencionRow[]}
          loading={loading}
          error={error}
          onRefresh={load}
          getRowKey={(row) => row.id}
          hideSearch
          emptyMessage="No hay atenciones que coincidan con los filtros aplicados."
        />
      </div>
      <CursorPagination page={pagination.page} totalPages={pagination.totalPages} hasNext={pagination.hasNext} loading={loading} onPrevious={pagination.previous} onNext={pagination.next} />
      {total !== undefined && (
        <p className={styles.muted}>{total.toLocaleString('es-BO')} {total === 1 ? 'registro' : 'registros'} según los filtros aplicados</p>
      )}

      <AtencionModales ctrl={ctrl} />
      <ConfirmDialog
        isOpen={!!aDesactivar}
        title="Desactivar atención"
        confirmLabel="Desactivar"
        danger
        loading={desactivando}
        onConfirm={() => void confirmarDesactivacion()}
        onClose={() => { if (!desactivando) setADesactivar(null); }}
        message={(
          <div className={styles.deactivateMessage}>
            <p>La atención de {aDesactivar?.empleado_nombre} dejará de mostrarse en el listado. ¿Desea restituir al inventario las cantidades descontadas?</p>
            <label>
              <input type="checkbox" checked={restituirStock} onChange={(event) => setRestituirStock(event.target.checked)} />
              Restituir al inventario las cantidades descontadas
            </label>
            <small>Los insumos con descuento de inventario pendiente no modifican el stock.</small>
          </div>
        )}
      />
    </>
  );
}
