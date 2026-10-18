'use client';

import { useMemo, useState } from 'react';
import { PackageMinus, Pencil, Plus, SlidersHorizontal } from 'lucide-react';
import {
  AdminButton,
  ConfirmDialog,
  DataTable,
  FilterBar,
  LocalSelect,
  RowActionsMenu,
} from '@/components/AdminConfig';
import type { Column } from '@/components/AdminConfig';
import { CustomSelect } from '@/components/Custom/CustomSelectAdmin';
import { toast } from '@/components/Shared/Toast';
import { desactivarInventarioItem, getCategoriasInventario } from '@/lib/api/inventario';
import { getAdminLocalScope } from '@/lib/api/localScope';
import { useAsyncData } from '@/lib/hooks/useAsyncData';
import { useInventarioItems } from '@/lib/hooks/useInventarioItems';
import { formatMoney, formatQty } from '@/lib/utils/format';
import type { InventarioItem } from '@/types/inventario';
import { AjusteModal } from './AjusteModal';
import { ItemFormModal } from './ItemFormModal';
import { StockBadge } from './StockBadge';
import styles from './AdminInventario.module.css';

type ItemRow = InventarioItem & Record<string, unknown>;

interface ItemsTabProps {
  /** Crear/editar/desactivar ítems: solo admin_sys (§7). */
  canManage: boolean;
  /** Ajustes de stock: admin_sys y gerencia (su local). */
  canAdjust: boolean;
  moneda: string;
}

export function ItemsTab({ canManage, canAdjust, moneda }: ItemsTabProps) {
  const [q, setQ] = useState('');
  const [localId, setLocalId] = useState(String(getAdminLocalScope()?.local_id ?? ''));
  const [categoriaId, setCategoriaId] = useState('');
  const [estado, setEstado] = useState<'activos' | 'bajo' | 'inactivos'>('activos');

  const params = useMemo(
    () => ({
      q: q.trim() || undefined,
      local_id: localId ? Number(localId) : undefined,
      categoria_id: categoriaId ? Number(categoriaId) : undefined,
      bajo_stock: estado === 'bajo' || undefined,
      activo: estado === 'inactivos' ? false : true,
    }),
    [q, localId, categoriaId, estado],
  );
  const { items, loading, error, reload } = useInventarioItems(params);
  const { data: categorias } = useAsyncData(getCategoriasInventario, 'categorias');

  const [formItem, setFormItem] = useState<InventarioItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [ajusteItem, setAjusteItem] = useState<InventarioItem | null>(null);
  const [toDeactivate, setToDeactivate] = useState<InventarioItem | null>(null);
  const [deactivating, setDeactivating] = useState(false);

  const openForm = (item: InventarioItem | null) => {
    setFormItem(item);
    setFormOpen(true);
  };

  const handleDeactivate = async () => {
    if (!toDeactivate) return;
    setDeactivating(true);
    try {
      await desactivarInventarioItem(toDeactivate.id);
      toast.success('Ítem desactivado');
      setToDeactivate(null);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo desactivar el ítem');
    } finally {
      setDeactivating(false);
    }
  };

  const columns: Column<ItemRow>[] = [
    {
      key: 'nombre',
      label: 'Ítem',
      render: (_v, row) => (
        <span className={styles.itemCell}>
          <span>
            <span className={styles.itemName}>{row.nombre}</span>
            <span className={styles.itemCode}>{row.codigo}</span>
          </span>
        </span>
      ),
    },
    { key: 'categoria_nombre', label: 'Categoría', render: (v) => (v as string) || <span className={styles.muted}>—</span> },
    {
      key: 'stock_actual',
      label: localId ? 'Stock del local' : 'Stock total',
      searchable: false,
      render: (_v, row) => (
        <span className={`${styles.num} ${row.stock_actual < 0 ? styles.negative : ''}`}>
          {formatQty(row.stock_actual, row.unidad_medida)}
        </span>
      ),
    },
    {
      key: 'stock_minimo',
      label: 'Mínimo',
      searchable: false,
      render: (_v, row) => <span className={`${styles.num} ${styles.muted}`}>{formatQty(row.stock_minimo, row.unidad_medida)}</span>,
    },
    {
      key: 'costo_referencia',
      label: 'Último costo',
      searchable: false,
      render: (v) => (v != null ? <span className={styles.num}>{formatMoney(v as number, moneda)}</span> : <span className={styles.muted}>—</span>),
    },
    { key: 'bajo_stock', label: 'Estado', searchable: false, render: (_v, row) => <StockBadge item={row} /> },
    {
      key: 'acciones',
      label: '',
      searchable: false,
      render: (_v, row) => {
        const actions = [
          ...(canAdjust && row.activo ? [{ label: 'Ajustar stock', icon: <SlidersHorizontal size={12} strokeWidth={2} />, onClick: () => setAjusteItem(row) }] : []),
          ...(canManage ? [{ label: 'Editar', icon: <Pencil size={12} strokeWidth={2} />, onClick: () => openForm(row) }] : []),
          ...(canManage && row.activo ? [{ label: 'Desactivar', icon: <PackageMinus size={12} strokeWidth={2} />, onClick: () => setToDeactivate(row), variant: 'danger' as const }] : []),
        ];
        return actions.length ? <RowActionsMenu actions={actions} /> : null;
      },
    },
  ];

  return (
    <>
      <div className={styles.toolbar}>
        <FilterBar>
          <FilterBar.Item label="Buscar" grow>
            <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre o código…" />
          </FilterBar.Item>
          {!getAdminLocalScope() && (
            <FilterBar.Item label="Local">
              <LocalSelect value={localId} onChange={setLocalId} emptyLabel="Todos los locales" />
            </FilterBar.Item>
          )}
          <FilterBar.Item label="Categoría">
            <CustomSelect
              value={categoriaId}
              onChange={setCategoriaId}
              options={(categorias ?? []).filter((c) => c.activo).map((c) => ({ value: String(c.id), label: c.nombre }))}
              placeholder="Todas"
              allowClear
              searchable={false}
            />
          </FilterBar.Item>
          <FilterBar.Item label="Mostrar">
            <CustomSelect
              value={estado}
              onChange={(v) => setEstado(v as typeof estado)}
              options={[
                { value: 'activos', label: 'Activos' },
                { value: 'bajo', label: 'Solo bajo stock' },
                { value: 'inactivos', label: 'Inactivos' },
              ]}
              searchable={false}
            />
          </FilterBar.Item>
        </FilterBar>
        {canManage && (
          <div className={styles.toolbarActions}>
            <AdminButton variant="primary" onClick={() => openForm(null)}>
              <Plus size={18} strokeWidth={2} />
              Nuevo ítem
            </AdminButton>
          </div>
        )}
      </div>

      <DataTable<ItemRow>
        columns={columns}
        data={items as ItemRow[]}
        loading={loading}
        error={error}
        onRefresh={reload}
        getRowKey={(i) => i.id}
        hideSearch
        emptyMessage={estado === 'bajo' ? 'Ningún ítem está bajo su stock mínimo' : 'No hay ítems de inventario'}
      />

      <ItemFormModal
        isOpen={formOpen}
        item={formItem}
        categorias={categorias ?? []}
        onClose={() => setFormOpen(false)}
        onSaved={reload}
      />
      <AjusteModal isOpen={ajusteItem !== null} item={ajusteItem} defaultLocalId={localId} onClose={() => setAjusteItem(null)} onSaved={reload} />
      <ConfirmDialog
        isOpen={toDeactivate !== null}
        danger
        title="Desactivar ítem"
        message={`¿Desactivar "${toDeactivate?.nombre}"? Conserva su historial de movimientos y dejará de poder usarse en compras y servicios.`}
        confirmLabel="Desactivar"
        loading={deactivating}
        onConfirm={handleDeactivate}
        onClose={() => setToDeactivate(null)}
      />
    </>
  );
}
