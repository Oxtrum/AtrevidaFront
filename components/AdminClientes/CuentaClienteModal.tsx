'use client';

import { useCallback, useEffect, useState } from 'react';
import { Ban, Plus } from 'lucide-react';
import { AdminButton, AlertBanner, DataTable, FormModal, ReasonDialog, RowActionsMenu, StatusBadge } from '@/components/AdminConfig';
import type { Column } from '@/components/AdminConfig';
import { toast } from '@/components/Shared/Toast';
import { anularCargo, getCuentaCliente } from '@/lib/api/cuenta';
import type { AbonoCliente, CargoCliente, CuentaCliente } from '@/lib/api/cuenta';
import { estadoCargoTexto, tipoCargoTexto, tonoEstadoCargo } from '@/lib/utils/cuenta';
import { formatFecha } from '@/lib/utils/formatDateTime';
import { formatMoney } from '@/lib/utils/format';
import { CargoFormModal } from './CargoFormModal';
import { SaldoCliente } from './SaldoCliente';
import styles from './CuentaClienteModal.module.css';

type CargoRow = CargoCliente & Record<string, unknown>;
type AbonoRow = AbonoCliente & Record<string, unknown>;

interface CuentaClienteModalProps {
  isOpen: boolean;
  cliente: { id: number; nombre: string; apellido: string } | null;
  onClose: () => void;
  /** Se llama tras crear o anular un cargo, para que quien abrió el modal refresque su listado. */
  onChanged?: () => void;
}

/** Cuenta de un cliente: saldo, lo que debe (cargos) y lo que entregó (abonos). Cobrar vive en la pantalla de Cobros. */
export function CuentaClienteModal({ isOpen, cliente, onClose, onChanged }: CuentaClienteModalProps) {
  const [cuenta, setCuenta] = useState<CuentaCliente | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verAnulados, setVerAnulados] = useState(false);
  const [cargoOpen, setCargoOpen] = useState(false);
  const [aAnular, setAAnular] = useState<CargoCliente | null>(null);

  const clienteId = cliente?.id;

  const cargar = useCallback(async (signal?: AbortSignal) => {
    if (clienteId === undefined) return;
    setLoading(true);
    setError(null);
    try {
      setCuenta(await getCuentaCliente(clienteId, verAnulados, signal));
    } catch (err) {
      if (signal?.aborted) return;
      setError(err instanceof Error ? err.message : 'No se pudo cargar la cuenta');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [clienteId, verAnulados]);

  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    void cargar(controller.signal);
    return () => controller.abort();
  }, [isOpen, cargar]);

  useEffect(() => {
    if (!isOpen) {
      setCuenta(null);
      setVerAnulados(false);
    }
  }, [isOpen]);

  if (!cliente) return null;

  const cargosColumns: Column<CargoRow>[] = [
    {
      key: 'concepto',
      label: 'Concepto',
      render: (_v, row) => (
        <span className={styles.concepto}>
          <span className={row.anulado ? styles.anulado : undefined}>{row.concepto}</span>
          <span className={styles.conceptoTipo}>{tipoCargoTexto(row.tipo)}</span>
        </span>
      ),
    },
    {
      key: 'fecha_hecho',
      label: 'Fecha',
      searchable: false,
      firstSort: 'desc',
      render: (_v, row) => <span className={styles.num} title={`Registrado el ${formatFecha(row.registrado_en)}`}>{formatFecha(row.fecha_hecho)}</span>,
    },
    { key: 'monto', label: 'Monto', searchable: false, render: (_v, row) => <span className={styles.num}>{formatMoney(row.monto)}</span> },
    { key: 'pagado', label: 'Pagado', searchable: false, render: (_v, row) => <span className={styles.num}>{formatMoney(row.pagado)}</span> },
    {
      key: 'estado',
      label: 'Estado',
      searchable: false,
      render: (_v, row) =>
        row.anulado ? (
          <StatusBadge tone="neutral" title={row.motivo_anulacion}>Anulado</StatusBadge>
        ) : (
          <StatusBadge tone={tonoEstadoCargo(row.estado)}>{estadoCargoTexto(row.estado)}</StatusBadge>
        ),
    },
    {
      key: 'acciones',
      label: '',
      searchable: false,
      sortable: false,
      render: (_v, row) =>
        row.anulado ? null : (
          <RowActionsMenu actions={[{ label: 'Anular cargo', icon: <Ban size={12} strokeWidth={2} />, onClick: () => setAAnular(row), variant: 'danger' }]} />
        ),
    },
  ];

  const abonosColumns: Column<AbonoRow>[] = [
    { key: 'codigo_pago', label: 'Pago', searchable: false },
    { key: 'fecha_hecho', label: 'Fecha', searchable: false, firstSort: 'desc', render: (_v, row) => <span className={styles.num}>{formatFecha(row.fecha_hecho)}</span> },
    { key: 'tipo_pago', label: 'Método', searchable: false, render: (_v, row) => String(row.tipo_pago).toUpperCase() },
    { key: 'monto', label: 'Monto', searchable: false, render: (_v, row) => <span className={styles.num}>{formatMoney(row.monto)}</span> },
    { key: 'aplicado', label: 'Cubrió', searchable: false, render: (_v, row) => <span className={styles.num}>{formatMoney(row.aplicado)}</span> },
    {
      key: 'sin_aplicar',
      label: 'Sin usar',
      searchable: false,
      render: (_v, row) => <span className={`${styles.num} ${row.sin_aplicar > 0 ? styles.sinAplicar : ''}`}>{formatMoney(row.sin_aplicar)}</span>,
    },
  ];

  return (
    <>
      <FormModal isOpen={isOpen} onClose={onClose} title={`Cuenta de ${cliente.nombre} ${cliente.apellido}`} size="xl" hideFooter>
        {error && (
          <div style={{ marginBottom: '1rem' }}>
            <AlertBanner tone="danger">{error}</AlertBanner>
          </div>
        )}

        {cuenta && (
          <div className={styles.resumen}>
            <SaldoCliente saldo={cuenta.saldo} size="lg" />
            <p className={styles.totales}>
              Cargado {formatMoney(cuenta.total_cargos)} · Abonado {formatMoney(cuenta.total_abonos)}
            </p>
          </div>
        )}

        <section className={styles.seccion} aria-labelledby="cuenta-cargos">
          <div className={styles.seccionCabecera}>
            <h3 id="cuenta-cargos" className={styles.seccionTitulo}>Cargos</h3>
            <div className={styles.acciones}>
              <label className={styles.mostrarAnulados}>
                <input type="checkbox" checked={verAnulados} onChange={(e) => setVerAnulados(e.target.checked)} />
                Mostrar anulados
              </label>
              <AdminButton size="sm" icon={<Plus size={14} strokeWidth={2} />} onClick={() => setCargoOpen(true)}>Nuevo cargo</AdminButton>
            </div>
          </div>
          <DataTable<CargoRow>
            columns={cargosColumns}
            data={(cuenta?.cargos ?? []) as CargoRow[]}
            loading={loading && !cuenta}
            getRowKey={(r) => r.id}
            defaultSort={{ key: 'fecha_hecho', dir: 'desc' }}
            emptyMessage="Este cliente no tiene cargos"
            hideSearch
          />
        </section>

        <section className={styles.seccion} aria-labelledby="cuenta-abonos">
          <div className={styles.seccionCabecera}>
            <h3 id="cuenta-abonos" className={styles.seccionTitulo}>Abonos</h3>
          </div>
          <DataTable<AbonoRow>
            columns={abonosColumns}
            data={(cuenta?.abonos ?? []) as AbonoRow[]}
            loading={loading && !cuenta}
            getRowKey={(r) => r.codigo_pago}
            defaultSort={{ key: 'fecha_hecho', dir: 'desc' }}
            emptyMessage="Este cliente no tiene abonos"
            hideSearch
          />
        </section>
      </FormModal>

      <CargoFormModal isOpen={cargoOpen} clienteId={cliente.id} onClose={() => setCargoOpen(false)} onSaved={() => { void cargar(); onChanged?.(); }} />

      <ReasonDialog
        isOpen={aAnular !== null}
        title="Anular cargo"
        message={aAnular && <>Se anulará <strong>{aAnular.concepto}</strong> ({formatMoney(aAnular.monto)}). Lo que ya se le cobró vuelve al saldo disponible del cliente.</>}
        confirmLabel="Anular cargo"
        onConfirm={async (motivo) => {
          if (!aAnular) return;
          await anularCargo(aAnular.id, motivo);
          toast.success('Cargo anulado');
          await cargar();
          onChanged?.();
        }}
        onClose={() => setAAnular(null)}
      />
    </>
  );
}
