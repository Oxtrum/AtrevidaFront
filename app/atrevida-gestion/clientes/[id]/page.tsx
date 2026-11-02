'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Banknote, CalendarDays, Package2, Pencil, Plus, Wallet } from 'lucide-react';
import { AdminButton, AdminPageShell, AlertBanner, DataTable, ReasonDialog, StatusBadge, Tabs } from '@/components/AdminConfig';
import type { BadgeTone } from '@/components/AdminConfig';
import type { Column, TabItem } from '@/components/AdminConfig';
import {
  CargoFormModal,
  ClienteFormModal,
  CobroModal,
  ContactoCliente,
  CuentaClientePanel,
  SaldoCliente,
} from '@/components/AdminClientes';
import { ReservaEstadoCelda } from '@/components/AdminReservas';
import { toast } from '@/components/Shared/Toast';
import { getClienteByID, type ClientePG } from '@/lib/api/clientes';
import { anularCargo, getCuentaCliente, type CargoCliente, type CuentaCliente } from '@/lib/api/cuenta';
import { getPlanesDB, type PlanItem } from '@/lib/api/planes';
import { getReservasDB } from '@/lib/api/reservas';
import type { ReservaBD } from '@/types/reserva';
import { formatMoney } from '@/lib/utils/format';
import styles from './page.module.css';

type Pestana = 'reservas' | 'paquetes' | 'cuenta';
type ReservaFila = ReservaBD & Record<string, unknown>;
type PaqueteFila = PlanItem & Record<string, unknown>;

const ESTADO_PAQUETE: Record<string, { label: string; tone: BadgeTone }> = {
  RESERVADO: { label: 'Reservado', tone: 'warning' },
  ACTIVO: { label: 'Activo', tone: 'info' },
  COMPLETADO: { label: 'Completado', tone: 'success' },
  VENCIDO: { label: 'Vencido', tone: 'danger' },
  CANCELADO: { label: 'Cancelado', tone: 'neutral' },
};

const COBRANZA_PAQUETE: Record<string, { label: string; tone: BadgeTone }> = {
  PENDIENTE: { label: 'Sin pagar', tone: 'warning' },
  PARCIAL: { label: 'Pago parcial', tone: 'warning' },
  PAGADO: { label: 'Pagado', tone: 'success' },
  VENCIDO: { label: 'Vencido', tone: 'danger' },
};

const RESERVAS_POR_PAGINA = 100;

const nombreCompleto = (c: ClientePG) => `${c.nombre} ${c.apellido}`.trim();

/** Ficha completa de un cliente: quien es, cuanto tiene y debe, sus reservas con su estado de cobro y su cuenta. */
export default function ClienteFichaPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const clienteId = Number(params.id);
  const idValido = Number.isInteger(clienteId) && clienteId > 0;

  const [cliente, setCliente] = useState<ClientePG | null>(null);
  const [cuenta, setCuenta] = useState<CuentaCliente | null>(null);
  const [reservas, setReservas] = useState<ReservaBD[]>([]);
  const [totalReservas, setTotalReservas] = useState(0);
  const [paquetes, setPaquetes] = useState<PlanItem[]>([]);
  const [cargandoPaquetes, setCargandoPaquetes] = useState(true);
  const [errorPaquetes, setErrorPaquetes] = useState<string | null>(null);
  const [cargandoCliente, setCargandoCliente] = useState(true);
  const [cargandoCuenta, setCargandoCuenta] = useState(true);
  const [cargandoReservas, setCargandoReservas] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorReservas, setErrorReservas] = useState<string | null>(null);
  const [pestana, setPestana] = useState<Pestana>('reservas');
  const [verAnulados, setVerAnulados] = useState(false);

  const [editando, setEditando] = useState(false);
  const [cobrando, setCobrando] = useState(false);
  const [nuevoCargo, setNuevoCargo] = useState(false);
  const [aAnular, setAAnular] = useState<CargoCliente | null>(null);

  const cargarCliente = useCallback(async () => {
    if (!idValido) return;
    try {
      const res = await getClienteByID(clienteId);
      setCliente(res.data?.cliente ?? null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el cliente');
    } finally {
      setCargandoCliente(false);
    }
  }, [clienteId, idValido]);

  const cargarCuenta = useCallback(async () => {
    if (!idValido) return;
    try {
      setCuenta(await getCuentaCliente(clienteId, verAnulados));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo cargar la cuenta');
    } finally {
      setCargandoCuenta(false);
    }
  }, [clienteId, idValido, verAnulados]);

  const cargarReservas = useCallback(async () => {
    if (!idValido) return;
    setCargandoReservas(true);
    try {
      const res = await getReservasDB({
        cliente_id: clienteId,
        limit: RESERVAS_POR_PAGINA,
        include_total: true,
        ordenar_por: 'fecha',
        sentido: 'desc',
      });
      setReservas(res.data?.reservas ?? []);
      setTotalReservas(res.data?.paginacion?.total_registros ?? res.data?.total ?? 0);
      setErrorReservas(null);
    } catch (err) {
      setErrorReservas(err instanceof Error ? err.message : 'No se pudieron cargar las reservas');
    } finally {
      setCargandoReservas(false);
    }
  }, [clienteId, idValido]);

  const cargarPaquetes = useCallback(async () => {
    if (!idValido) return;
    try {
      const res = await getPlanesDB({ cliente_id: clienteId, orden: 'prioridad_estado', limit: 100 });
      setPaquetes(res.data?.planes ?? []);
      setErrorPaquetes(null);
    } catch (err) {
      setErrorPaquetes(err instanceof Error ? err.message : 'No se pudieron cargar los paquetes');
    } finally {
      setCargandoPaquetes(false);
    }
  }, [clienteId, idValido]);

  useEffect(() => {
    void cargarCliente();
    void cargarReservas();
    void cargarPaquetes();
  }, [cargarCliente, cargarReservas, cargarPaquetes]);

  useEffect(() => {
    void cargarCuenta();
  }, [cargarCuenta]);

  // Desde el popover del cliente se llega con ?cobrar=1: el cobro se abre solo, una vez que la cuenta esta cargada.
  const cobroPedido = useRef(false);
  useEffect(() => {
    if (cobroPedido.current || cargandoCuenta || !cuenta) return;
    cobroPedido.current = true;
    if (new URLSearchParams(window.location.search).get('cobrar') === '1') {
      setCobrando(true);
      router.replace(`/atrevida-gestion/clientes/${clienteId}`);
    }
  }, [cargandoCuenta, cuenta, clienteId, router]);

  const columnasReservas: Column<ReservaFila>[] = useMemo(() => [
    {
      key: 'fecha',
      label: 'Fecha',
      searchable: false,
      firstSort: 'desc',
      render: (_v, row) => <span className={styles.numero}>{row.fecha}</span>,
    },
    {
      key: 'hora_desde',
      label: 'Hora',
      searchable: false,
      render: (_v, row) => <span className={styles.numero}>{row.hora_desde} – {row.hora_hasta}</span>,
    },
    {
      key: 'servicio',
      label: 'Servicio',
      render: (_v, row) => row.servicio_confirmado || row.servicio || row.servicio_solicitado || 'Por definir',
    },
    { key: 'local', label: 'Local', searchable: false },
    {
      key: 'estado',
      label: 'Estado',
      searchable: false,
      render: (_v, row) => <ReservaEstadoCelda estado={row.estado} estadoCobro={row.estado_cobro} alertaInventario={row.alerta_inventario} />,
    },
    {
      key: 'precio',
      label: 'Precio',
      searchable: false,
      render: (_v, row) => (row.precio != null ? <span className={styles.numero}>{formatMoney(row.precio)}</span> : '—'),
    },
  ], []);

  const columnasPaquetes: Column<PaqueteFila>[] = useMemo(() => [
    { key: 'combo_nombre_texto', label: 'Paquete', render: (_v, row) => row.combo_nombre_texto || row.codigo },
    {
      key: 'sesiones_usadas',
      label: 'Avance',
      searchable: false,
      render: (_v, row) => <span className={styles.numero}>{row.sesiones_usadas} de {row.sesiones_totales}</span>,
    },
    { key: 'local_nombre_texto', label: 'Local', searchable: false },
    {
      key: 'estado',
      label: 'Estado',
      searchable: false,
      render: (_v, row) => {
        const e = ESTADO_PAQUETE[row.estado] ?? { label: row.estado, tone: 'neutral' as BadgeTone };
        return <StatusBadge tone={e.tone}>{e.label}</StatusBadge>;
      },
    },
    {
      key: 'estado_cobranza',
      label: 'Pago',
      searchable: false,
      render: (_v, row) => {
        const c = COBRANZA_PAQUETE[row.estado_cobranza] ?? { label: row.estado_cobranza, tone: 'neutral' as BadgeTone };
        return <StatusBadge tone={c.tone}>{c.label}</StatusBadge>;
      },
    },
    {
      key: 'precio_total',
      label: 'Total',
      searchable: false,
      render: (_v, row) => <span className={styles.numero}>{formatMoney(row.precio_total)}</span>,
    },
  ], []);

  const pestanas: TabItem<Pestana>[] = [
    { key: 'reservas', label: 'Reservas', icon: <CalendarDays size={14} strokeWidth={2} />, count: cargandoReservas ? undefined : totalReservas },
    { key: 'paquetes', label: 'Paquetes', icon: <Package2 size={14} strokeWidth={2} />, count: cargandoPaquetes ? undefined : paquetes.length },
    { key: 'cuenta', label: 'Cuenta', icon: <Wallet size={14} strokeWidth={2} /> },
  ];

  const recargarTodo = () => {
    void cargarCuenta();
    void cargarReservas();
  };

  if (!idValido) {
    return (
      <AdminPageShell>
        <AlertBanner tone="danger">El cliente que buscas no existe.</AlertBanner>
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell>
      <>
        <Link href="/atrevida-gestion/clientes" className={styles.volver}>
          <ArrowLeft size={14} strokeWidth={2} />
          Clientes
        </Link>

        {error && <AlertBanner tone="danger">{error}</AlertBanner>}

        <header className={styles.ficha} aria-busy={cargandoCliente}>
          <div className={styles.quien}>
            <h1 className={styles.nombre}>{cliente ? nombreCompleto(cliente) : cargandoCliente ? 'Cargando…' : 'Cliente no encontrado'}</h1>
            {cliente && (
              <p className={styles.datos}>
                <ContactoCliente telefono={cliente.numero_telefono} telefonoE164={cliente.telefono_e164} />
                <span>CI {cliente.ci || '—'}</span>
                <span>NIT {cliente.nit || '—'}</span>
              </p>
            )}
          </div>

          <div className={styles.saldo}>
            {cuenta ? <SaldoCliente saldo={cuenta.saldo} /> : <span className={styles.cargando}>Calculando saldo…</span>}
          </div>

          <div className={styles.acciones}>
            <AdminButton size="sm" icon={<Banknote size={15} strokeWidth={2} />} onClick={() => setCobrando(true)} disabled={!cuenta}>
              Cobrar
            </AdminButton>
            <AdminButton size="sm" variant="secondary" icon={<Plus size={15} strokeWidth={2} />} onClick={() => setNuevoCargo(true)}>
              Nuevo cargo
            </AdminButton>
            {cliente && (
              <AdminButton size="sm" variant="secondary" icon={<Pencil size={15} strokeWidth={2} />} onClick={() => setEditando(true)}>
                Editar
              </AdminButton>
            )}
          </div>
        </header>

        <div className={styles.pestanas}>
          <Tabs tabs={pestanas} active={pestana} onChange={setPestana} ariaLabel="Secciones del cliente" />
        </div>

        {pestana === 'reservas' && (
          <>
            <DataTable<ReservaFila>
              columns={columnasReservas}
              data={reservas as ReservaFila[]}
              loading={cargandoReservas}
              error={errorReservas}
              onRefresh={cargarReservas}
              getRowKey={(r) => r.id}
              defaultSort={{ key: 'fecha', dir: 'desc' }}
              searchPlaceholder="Buscar en sus reservas…"
              emptyMessage="Este cliente todavía no tiene reservas"
            />
            {totalReservas > reservas.length && (
              <p className={styles.nota}>Se muestran sus {reservas.length} reservas más recientes de {totalReservas}.</p>
            )}
          </>
        )}

        {pestana === 'paquetes' && (
          <DataTable<PaqueteFila>
            columns={columnasPaquetes}
            data={paquetes as PaqueteFila[]}
            loading={cargandoPaquetes}
            error={errorPaquetes}
            onRefresh={cargarPaquetes}
            getRowKey={(p) => p.id}
            hideSearch
            emptyMessage="Este cliente no tiene paquetes"
          />
        )}

        {pestana === 'cuenta' && (
          <CuentaClientePanel
            cuenta={cuenta}
            loading={cargandoCuenta}
            verAnulados={verAnulados}
            onVerAnulados={setVerAnulados}
            onAnular={setAAnular}
          />
        )}
      </>

      {cliente && (
        <ClienteFormModal
          isOpen={editando}
          onClose={() => setEditando(false)}
          cliente={cliente}
          onSaved={() => void cargarCliente()}
        />
      )}

      <CobroModal
        isOpen={cobrando}
        clienteId={clienteId}
        nombre={cliente ? nombreCompleto(cliente) : 'cliente'}
        cuenta={cuenta}
        onClose={() => setCobrando(false)}
        onCobrado={recargarTodo}
      />

      <CargoFormModal isOpen={nuevoCargo} clienteId={clienteId} onClose={() => setNuevoCargo(false)} onSaved={recargarTodo} />

      <ReasonDialog
        isOpen={aAnular !== null}
        title="Anular cargo"
        message={aAnular && <>Se anulará <strong>{aAnular.concepto}</strong> ({formatMoney(aAnular.monto)}). Lo que ya se le cobró vuelve al saldo disponible del cliente.</>}
        confirmLabel="Anular cargo"
        onConfirm={async (motivo) => {
          if (!aAnular) return;
          await anularCargo(aAnular.id, motivo);
          toast.success('Cargo anulado');
          recargarTodo();
        }}
        onClose={() => setAAnular(null)}
      />
    </AdminPageShell>
  );
}
