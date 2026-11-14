'use client';

import { Package } from 'lucide-react';
import { FormModal } from '@/components/AdminConfig';
import { formatMoney, formatQty } from '@/lib/utils/format';
import { UNIDADES_MEDIDA } from '@/types/inventario';
import type { InventarioItem } from '@/types/inventario';
import { StockBadge } from './StockBadge';
import styles from './AdminInventario.module.css';

interface ItemDetalleModalProps {
  /** Ítem a mostrar; null = cerrado. Sale de la fila ya cargada: abrirlo no hace ninguna petición. */
  item: InventarioItem | null;
  moneda: string;
  onClose: () => void;
}

/** Ficha de solo lectura de un ítem de inventario. */
export function ItemDetalleModal({ item, moneda, onClose }: ItemDetalleModalProps) {
  if (!item) return null;

  const unidad = UNIDADES_MEDIDA.find((u) => u.value === item.unidad_medida)?.label ?? item.unidad_medida;
  const dinero = (valor: number | null | undefined) =>
    valor != null ? formatMoney(valor, moneda) : <span className={styles.muted}>Sin definir</span>;

  return (
    <FormModal isOpen onClose={onClose} title="Detalle del ítem" hideFooter>
      <div className={styles.detalle}>
        {item.imagen_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- misma URL que la miniatura: el navegador la sirve de su caché
          <img src={item.imagen_url} alt={item.nombre} className={styles.detalleImagen} decoding="async" />
        ) : (
          <div className={`${styles.detalleImagen} ${styles.thumbEmpty}`} aria-hidden="true">
            <Package size={48} strokeWidth={1.2} />
          </div>
        )}

        <div className={styles.detalleCabecera}>
          <div>
            <h3 className={styles.detalleNombre}>{item.nombre}</h3>
            <span className={styles.itemCode}>{item.codigo}</span>
          </div>
          <StockBadge item={item} />
        </div>

        {item.descripcion && <p className={styles.detalleDescripcion}>{item.descripcion}</p>}

        <dl className={styles.detalleDatos}>
          <div>
            <dt>Categoría</dt>
            <dd>{item.categoria_nombre || <span className={styles.muted}>Sin categoría</span>}</dd>
          </div>
          <div>
            <dt>Unidad de medida</dt>
            <dd>{unidad}</dd>
          </div>
          <div>
            <dt>{item.local_nombre ? `Stock en ${item.local_nombre}` : 'Stock'}</dt>
            <dd className={item.stock_actual < 0 ? styles.negative : undefined}>
              {formatQty(item.stock_actual, item.unidad_medida)}
            </dd>
          </div>
          <div>
            <dt>Stock mínimo</dt>
            <dd>{formatQty(item.stock_minimo, item.unidad_medida)}</dd>
          </div>
          <div>
            <dt>Último costo</dt>
            <dd>{dinero(item.costo_referencia)}</dd>
          </div>
          <div>
            <dt>Precio de venta</dt>
            <dd>{dinero(item.precio_venta)}</dd>
          </div>
        </dl>
      </div>
    </FormModal>
  );
}
