'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight, ClipboardCheck, MapPin, Plus, RefreshCw } from 'lucide-react';
import { AdminButton, AdminPanel, ConfirmDialog, DataTable, FormField, PageHeader, RangoFechasFiltro, StatusBadge } from '@/components/AdminConfig';
import type { Column } from '@/components/AdminConfig';
import { AtencionAcciones } from '@/components/AdminAtenciones/AtencionAcciones';
import { AtencionDetalleModal } from '@/components/AdminAtenciones/AtencionDetalleModal';
import { AtencionFormModal } from '@/components/AdminAtenciones/AtencionFormModal';
import { ReservaAgendadaPicker } from '@/components/AdminAtenciones/ReservaAgendadaPicker';
import { ReservaDetailModal } from '@/components/AdminReservas/ReservaDetailModal';
import { desactivarAtencion, getAtencion, getAtenciones, type Atencion } from '@/lib/api/atenciones';
import { getReservaByID } from '@/lib/api/reservas';
import { useLocales } from '@/lib/hooks/useLocales';
import { getStoredAdminWorkplace, type AdminWorkplace } from '@/lib/auth/adminSession';
import type { ReservaBD } from '@/types/reserva';
import { toast } from '@/components/Shared/Toast';
import { todayISO } from '@/lib/utils/format';
import styles from './page.module.css';

const formatDate = (value: string) => {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return year && month && day
    ? new Date(year, month - 1, day).toLocaleDateString('es-BO', { day: 'numeric', month: 'short', year: 'numeric' })
    : value;
};

type AtencionRow = Atencion & Record<string, unknown>;
interface AtencionConReserva { atencion: Atencion; reserva: ReservaBD }
const PAGE_SIZE = 25;

type AtajoFecha = 'TODAS' | 'HOY' | 'AYER' | 'SEMANA';
const ATAJOS_FECHA: { value: AtajoFecha; label: string }[] = [
  { value: 'TODAS', label: 'Todas las fechas' },
  { value: 'HOY', label: 'Hoy' },
  { value: 'AYER', label: 'Ayer' },
  { value: 'SEMANA', label: 'Últimos 7 días' },
];

const haceDias = (dias: number) => {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Rango de fechas de atención que pide cada atajo; TODAS no acota. */
function rangoDeAtajo(atajo: AtajoFecha | 'RANGO', desde: string, hasta: string): { fecha_desde?: string; fecha_hasta?: string } {
  if (atajo === 'HOY') return { fecha_desde: todayISO(), fecha_hasta: todayISO() };
  if (atajo === 'AYER') return { fecha_desde: haceDias(1), fecha_hasta: haceDias(1) };
  if (atajo === 'SEMANA') return { fecha_desde: haceDias(6), fecha_hasta: todayISO() };
  if (atajo === 'RANGO') return { fecha_desde: desde, fecha_hasta: hasta };
  return {};
}

export default function AtencionesPage() {
  const { locales } = useLocales();
  const [workplace, setWorkplace] = useState<AdminWorkplace | null>(null);
  const [localId, setLocalId] = useState('');
  const [filtroFecha, setFiltroFecha] = useState<AtajoFecha | 'RANGO'>('TODAS');
  const [rango, setRango] = useState({ desde: todayISO(), hasta: todayISO() });
  const [eligiendoReserva, setEligiendoReserva] = useState(false);
  const [reservaPorAtender, setReservaPorAtender] = useState<ReservaBD | null>(null);
  const [rows, setRows] = useState<Atencion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [reservaAbierta, setReservaAbierta] = useState<ReservaBD | null>(null);
  const [atencionAbierta, setAtencionAbierta] = useState<AtencionConReserva | null>(null);
  const [atencionEnEdicion, setAtencionEnEdicion] = useState<AtencionConReserva | null>(null);
  const [atencionDesactivar, setAtencionDesactivar] = useState<Atencion | null>(null);
  const [restituirStock, setRestituirStock] = useState(false);
  const [desactivando, setDesactivando] = useState(false);

  useEffect(() => {
    const assignedWorkplace = getStoredAdminWorkplace();
    setWorkplace(assignedWorkplace);
    if (assignedWorkplace) setLocalId(String(assignedWorkplace.local_id));
  }, []);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getAtenciones({
        limit: PAGE_SIZE,
        offset,
        ...(localId ? { local_id: Number(localId) } : {}),
        ...rangoDeAtajo(filtroFecha, rango.desde, rango.hasta),
      });
      setRows(response.atenciones);
      setTotal(response.total);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudieron cargar las atenciones.';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [localId, offset, filtroFecha, rango]);

  useEffect(() => { void cargar(); }, [cargar]);

  const leerAtencionYReserva = async (atencionId: number, reservaId: number): Promise<AtencionConReserva> => {
    const [atencion, reservaResponse] = await Promise.all([getAtencion(atencionId), getReservaByID(reservaId)]);
    const reserva = reservaResponse.data?.reserva;
    if (!reserva) throw new Error('No se encontró la reserva vinculada.');
    return { atencion, reserva };
  };

  const verReserva = async (row: Atencion) => {
    try {
      const response = await getReservaByID(row.reserva_id);
      if (!response.data?.reserva) throw new Error('No se encontró la reserva vinculada.');
      setReservaAbierta(response.data.reserva);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo cargar la reserva.');
    }
  };

  const verAtencion = async (row: Atencion) => {
    try {
      setAtencionAbierta(await leerAtencionYReserva(row.id, row.reserva_id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo cargar la atención.');
    }
  };

  const editarAtencion = async (row: Atencion) => {
    if (row.insumos_pendientes <= 0) return;
    try {
      setAtencionEnEdicion(await leerAtencionYReserva(row.id, row.reserva_id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo cargar la atención.');
    }
  };

  const confirmarDesactivacion = async () => {
    if (!atencionDesactivar) return;
    setDesactivando(true);
    try {
      await desactivarAtencion(atencionDesactivar.id, restituirStock);
      toast.success(restituirStock ? 'Atención desactivada y stock restituido.' : 'Atención desactivada.');
      setAtencionDesactivar(null);
      await cargar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo desactivar la atención.');
    } finally {
      setDesactivando(false);
    }
  };

  const columns: Column<AtencionRow>[] = [
    { key: 'fecha_atencion', label: 'Fecha', render: (value) => formatDate(String(value)) },
    { key: 'empleado_nombre', label: 'Quien lo atendió' },
    { key: 'reserva_id', label: 'Reserva', render: (value, row) => (
      <button type="button" className={styles.reservaLink} onClick={() => void verReserva(row)} aria-label={`Ver resumen de la reserva ${value}`}>
        #{String(value)}
      </button>
    ) },
    { key: 'servicio_reserva', label: 'Servicio', render: (value) => String(value || '—') },
    {
      key: 'insumos_pendientes',
      label: 'Insumos',
      render: (_, row) => Number(row.insumos_pendientes) > 0
        ? <StatusBadge tone="danger" icon={<AlertTriangle size={13} />} title={row.insumos_pendientes_detalle ?? 'Revisar deducciones pendientes'}>Deducción pendiente · {row.insumos_pendientes}</StatusBadge>
        : '—',
    },
    { key: 'lugar', label: 'Lugar' },
    { key: 'hora_inicio', label: 'Horario', render: (_, row) => [row.hora_inicio, row.hora_fin].filter(Boolean).join(' – ') || '—' },
    { key: 'observaciones', label: 'Observaciones', render: (value) => String(value || '—') },
    {
      key: 'acciones', label: 'Acciones', searchable: false, sortable: false,
      render: (_, row) => (
        <AtencionAcciones
          atencion={row}
          onEdit={() => void editarAtencion(row)}
          onVerReserva={() => void verReserva(row)}
          onVerAtencion={() => void verAtencion(row)}
          onDesactivar={() => { setRestituirStock(false); setAtencionDesactivar(row); }}
        />
      ),
    },
  ];

  return (
    <div className="admin-stack">
      <PageHeader
        kicker="Operación diaria"
        kickerIcon={<ClipboardCheck size={14} />}
        title="Atenciones"
        accentWord="Atenciones"
        subtitle="Servicios realizados y cierres de reservas."
        actions={(
          <div className={styles.headerActions}>
            <button className={styles.refresh} onClick={() => void cargar()} disabled={loading}>
              <RefreshCw size={15} />Actualizar
            </button>
            <AdminButton icon={<Plus size={16} strokeWidth={2.2} />} onClick={() => setEligiendoReserva(true)}>
              Registrar atención
            </AdminButton>
          </div>
        )}
      />
      <AdminPanel>
        <div className={styles.filters}>
          <FormField label="Local" htmlFor="atenciones-local">
            <div className={styles.localField}>
              <MapPin size={15} aria-hidden="true" />
              <select id="atenciones-local" value={localId} disabled={!!workplace}
                onChange={(event) => { setLocalId(event.target.value); setOffset(0); }}>
                {!workplace && <option value="">Todos los locales</option>}
                {locales.map((local) => <option value={local.id} key={local.id}>{local.nombre}</option>)}
              </select>
            </div>
          </FormField>
          <FormField label="Fecha de atención">
            <RangoFechasFiltro
              atajos={ATAJOS_FECHA}
              valor={filtroFecha}
              onAtajo={(valor) => { setFiltroFecha(valor); setOffset(0); }}
              desde={rango.desde}
              hasta={rango.hasta}
              onRango={(desde, hasta) => { setRango({ desde, hasta }); setFiltroFecha('RANGO'); setOffset(0); }}
              diasAdelante={0}
            />
          </FormField>
        </div>
        <DataTable
          columns={columns}
          data={rows as AtencionRow[]}
          loading={loading}
          error={error}
          onRefresh={() => void cargar()}
          getRowKey={(row) => row.id}
          searchPlaceholder="Buscar persona o reserva…"
          emptyMessage={filtroFecha === 'TODAS' ? 'Todavía no hay atenciones registradas' : 'No hay atenciones en estas fechas'}
          sortable={false}
          pageSize={0}
        />
        <div className={styles.pagination} aria-label="Paginación de atenciones">
          <span>{total === 0 ? 'Sin resultados' : `${offset + 1}–${Math.min(offset + PAGE_SIZE, total)} de ${total}`}</span>
          <button className={styles.refresh} onClick={() => setOffset((value) => Math.max(0, value - PAGE_SIZE))} disabled={loading || offset === 0} aria-label="Página anterior">
            <ChevronLeft size={15} />Anterior
          </button>
          <button className={styles.refresh} onClick={() => setOffset((value) => value + PAGE_SIZE)} disabled={loading || offset + PAGE_SIZE >= total} aria-label="Página siguiente">
            Siguiente<ChevronRight size={15} />
          </button>
        </div>
      </AdminPanel>

      {reservaAbierta && (
        <ReservaDetailModal
          reserva={reservaAbierta}
          onClose={() => setReservaAbierta(null)}
          onEdit={() => undefined}
          onDelete={() => undefined}
          readOnly
        />
      )}
      <AtencionDetalleModal
        reserva={atencionAbierta?.reserva ?? null}
        atencion={atencionAbierta?.atencion ?? null}
        onClose={() => setAtencionAbierta(null)}
      />
      <AtencionFormModal
        reserva={atencionEnEdicion?.reserva ?? null}
        atencion={atencionEnEdicion?.atencion ?? null}
        onClose={() => setAtencionEnEdicion(null)}
        onSaved={() => { setAtencionEnEdicion(null); void cargar(); }}
      />
      <ReservaAgendadaPicker
        isOpen={eligiendoReserva}
        local={workplace?.nombre_local ?? locales.find((l) => String(l.id) === localId)?.nombre}
        onClose={() => setEligiendoReserva(false)}
        onSelect={(reserva) => { setEligiendoReserva(false); setReservaPorAtender(reserva); }}
      />
      <AtencionFormModal
        reserva={reservaPorAtender}
        onClose={() => setReservaPorAtender(null)}
        onSaved={() => { setReservaPorAtender(null); setOffset(0); void cargar(); }}
      />
      <ConfirmDialog
        isOpen={!!atencionDesactivar}
        title="Desactivar atención"
        confirmLabel="Desactivar"
        danger
        loading={desactivando}
        onConfirm={() => void confirmarDesactivacion()}
        onClose={() => { if (!desactivando) setAtencionDesactivar(null); }}
        message={(
          <div className={styles.deactivateMessage}>
            <p>La atención de {atencionDesactivar?.empleado_nombre} quedará fuera del listado. ¿Deseas restituir al inventario las cantidades descontadas?</p>
            <label>
              <input type="checkbox" checked={restituirStock} onChange={(event) => setRestituirStock(event.target.checked)} />
              Restituir el stock descontado por esta atención
            </label>
            <small>Los insumos que quedaron con deducción pendiente no modifican el stock.</small>
          </div>
        )}
      />
    </div>
  );
}
