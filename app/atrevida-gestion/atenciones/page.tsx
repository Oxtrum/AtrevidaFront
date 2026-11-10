'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight, ClipboardCheck, MapPin, RefreshCw } from 'lucide-react';
import { AdminPanel, ConfirmDialog, DataTable, FormField, PageHeader, StatusBadge } from '@/components/AdminConfig';
import type { Column } from '@/components/AdminConfig';
import { AtencionAcciones } from '@/components/AdminAtenciones/AtencionAcciones';
import { AtencionDetalleModal } from '@/components/AdminAtenciones/AtencionDetalleModal';
import { AtencionFormModal } from '@/components/AdminAtenciones/AtencionFormModal';
import { ReservaDetailModal } from '@/components/AdminReservas/ReservaDetailModal';
import { desactivarAtencion, getAtencion, getAtenciones, type Atencion } from '@/lib/api/atenciones';
import { getReservaByID } from '@/lib/api/reservas';
import { useLocales } from '@/lib/hooks/useLocales';
import { getStoredAdminWorkplace, type AdminWorkplace } from '@/lib/auth/adminSession';
import type { ReservaBD } from '@/types/reserva';
import { toast } from '@/components/Shared/Toast';
import styles from './page.module.css';

const formatDate = (value: string) => {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return year && month && day
    ? new Date(year, month - 1, day).toLocaleDateString('es-BO', { day: 'numeric', month: 'short', year: 'numeric' })
    : value;
};

type AtencionRow = Atencion & Record<string, unknown>;
interface AtencionConReserva { atencion: Atencion; reserva: ReservaBD }
const PAGE_SIZE = 50;

export default function AtencionesPage() {
  const { locales } = useLocales();
  const [workplace, setWorkplace] = useState<AdminWorkplace | null>(null);
  const [localId, setLocalId] = useState('');
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
  }, [localId, offset]);

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
          <button className={styles.refresh} onClick={() => void cargar()} disabled={loading}>
            <RefreshCw size={15} />Actualizar
          </button>
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
        </div>
        <DataTable
          columns={columns}
          data={rows as AtencionRow[]}
          loading={loading}
          error={error}
          onRefresh={() => void cargar()}
          getRowKey={(row) => row.id}
          searchPlaceholder="Buscar persona o reserva…"
          emptyMessage="Todavía no hay atenciones registradas"
          defaultSort={{ key: 'fecha_atencion', dir: 'desc' }}
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
