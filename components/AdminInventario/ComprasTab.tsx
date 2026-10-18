'use client';

import { useState } from 'react';
import { Ban, Eye, Plus } from 'lucide-react';
import { AdminButton, DataTable, FormModal, ReasonDialog, RowActionsMenu, StatusBadge } from '@/components/AdminConfig';
import type { Column } from '@/components/AdminConfig';
import { toast } from '@/components/Shared/Toast';
import { anularCompra, getCompra, getCompras } from '@/lib/api/compras';
import { useAsyncData } from '@/lib/hooks/useAsyncData';
import { useInventarioItems } from '@/lib/hooks/useInventarioItems';
import { formatDateISO, formatMoney, formatQty } from '@/lib/utils/format';
import type { Compra } from '@/types/inventario';
import { CompraModal } from './CompraModal';
import styles from './AdminInventario.module.css';

type Row = Compra & Record<string, unknown>;
const EMPTY: Compra[] = [];
const ACTIVE_ITEMS = { activo: true } as const;

interface ComprasTabProps {
  canAnular: boolean;
  moneda: string;
}

export function ComprasTab({ canAnular, moneda }: ComprasTabProps) {
  const { data, loading, error, reload } = useAsyncData(getCompras, 'compras');
  const { items } = useInventarioItems(ACTIVE_ITEMS);
  const [creating, setCreating] = useState(false);
  const [detail, setDetail] = useState<Compra | null>(null);
  const [anulando, setAnulando] = useState<Compra | null>(null);

  const openDetail = async (row: Compra) => {
    try {
      setDetail(await getCompra(row.id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo cargar la compra');
    }
  };

  const columns: Column<Row>[] = [
    { key: 'codigo', label: 'Código' },
    { key: 'fecha', label: 'Fecha', searchable: false, render: (v) => formatDateISO(v as string) },
    { key: 'local_nombre', label: 'Local' },
    { key: 'proveedor', label: 'Proveedor', render: (v) => (v as string) || '—' },
    { key: 'total', label: 'Total', searchable: false, render: (v) => <span className={styles.num}>{formatMoney(v as number, moneda)}</span> },
    {
      key: 'estado',
      label: 'Estado',
      searchable: false,
      render: (v) => <StatusBadge tone={v === 'ANULADA' ? 'danger' : 'success'}>{String(v)}</StatusBadge>,
    },
    {
      key: 'acciones',
      label: '',
      searchable: false,
      render: (_v, row) => (
        <RowActionsMenu
          actions={[
            { label: 'Ver detalle', icon: <Eye size={12} strokeWidth={2} />, onClick: () => openDetail(row) },
            ...(canAnular && row.estado === 'REGISTRADA'
              ? [{ label: 'Anular compra', icon: <Ban size={12} strokeWidth={2} />, onClick: () => setAnulando(row), variant: 'danger' as const }]
              : []),
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <div className={styles.toolbar}>
        <span />
        <AdminButton variant="primary" onClick={() => setCreating(true)}>
          <Plus size={18} strokeWidth={2} />
          Registrar compra
        </AdminButton>
      </div>

      <DataTable<Row>
        columns={columns}
        data={(data ?? EMPTY) as Row[]}
        loading={loading}
        error={error}
        onRefresh={reload}
        getRowKey={(c) => c.id}
        searchPlaceholder="Buscar por código, local o proveedor…"
        emptyMessage="Aún no hay compras registradas"
      />

      <CompraModal isOpen={creating} items={items} moneda={moneda} onClose={() => setCreating(false)} onSaved={reload} />

      <FormModal isOpen={detail !== null} onClose={() => setDetail(null)} title={`Compra ${detail?.codigo ?? ''}`} hideFooter size="lg">
        {detail && (
          <div className={styles.stack}>
            <dl className={styles.detailList}>
              <dt>Local</dt><dd>{detail.local_nombre}</dd>
              <dt>Fecha</dt><dd>{formatDateISO(detail.fecha)}</dd>
              <dt>Proveedor</dt><dd>{detail.proveedor || '—'}</dd>
              <dt>Registrada por</dt><dd>{detail.nombre_usuario || '—'}</dd>
              <dt>Egreso asociado</dt><dd>{detail.movimiento_financiero_codigo || '—'}</dd>
              <dt>Estado</dt><dd><StatusBadge tone={detail.estado === 'ANULADA' ? 'danger' : 'success'}>{detail.estado}</StatusBadge></dd>
            </dl>
            <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--admin-text-dim)' }}>
                  <th>Ítem</th><th className={styles.num}>Cantidad</th><th className={styles.num}>Costo unit.</th><th className={styles.num}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {(detail.detalle ?? []).map((d) => (
                  <tr key={d.item_id}>
                    <td>{d.item_nombre}</td>
                    <td className={styles.num}>{formatQty(d.cantidad, d.unidad_medida)}</td>
                    <td className={styles.num}>{formatMoney(d.costo_unitario, moneda)}</td>
                    <td className={styles.num}>{formatMoney(d.subtotal, moneda)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className={styles.total}><span>Total</span><span>{formatMoney(detail.total, moneda)}</span></div>
          </div>
        )}
      </FormModal>

      <ReasonDialog
        isOpen={anulando !== null}
        title={`Anular compra ${anulando?.codigo ?? ''}`}
        message="Se anulará la compra y su egreso, y se revertirá el stock ingresado. Si ese stock ya se consumió, el sistema no permitirá anularla."
        confirmLabel="Anular compra"
        onConfirm={async (motivo) => {
          await anularCompra(anulando!.id, motivo);
          toast.success('Compra anulada y stock revertido');
          await reload();
        }}
        onClose={() => setAnulando(null)}
      />
    </>
  );
}
