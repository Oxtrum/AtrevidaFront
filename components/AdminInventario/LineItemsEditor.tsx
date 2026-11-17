'use client';

import { Plus, Trash2 } from 'lucide-react';
import { formatMoney } from '@/lib/utils/format';
import type { InventarioItem } from '@/types/inventario';
import { ItemSelect } from './ItemSelect';
import styles from './AdminInventario.module.css';

export interface ItemLine {
  key: string;
  item_id: string;
  item_label?: string;
  item_subtitle?: string;
  /** Unidad del ítem guardada en la línea: al editar, el catálogo puede no estar cargado (solo se busca al escribir). */
  item_unidad?: string;
  cantidad: string;
  costo: string;
}

let lineSeq = 0;
export const newLine = (partial: Partial<ItemLine> = {}): ItemLine => ({
  key: `line-${++lineSeq}`,
  item_id: '',
  cantidad: '',
  costo: '',
  ...partial,
});

/** Número válido > 0 (acepta coma decimal). */
export const parsePositive = (v: string): number => {
  const n = Number(v.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : 0;
};

interface LineItemsEditorProps {
  lines: ItemLine[];
  items: InventarioItem[];
  onChange: (lines: ItemLine[]) => void;
  /** Título de la sección (opcional). */
  title?: string;
  /** Texto que se muestra cuando aún no hay líneas, sobre el botón "Agregar". */
  emptyHint?: string;
  /** Ayuda que se muestra bajo las líneas cuando hay al menos una. */
  footerHint?: string;
  quantityPlaceholder?: string;
  /** Muestra costo unitario, subtotal y total (compras). Sin esto: solo ítem + cantidad (insumos). */
  showCost?: boolean;
  moneda?: string;
  quantityLabel?: string;
  addLabel?: string;
  error?: string;
  /** Búsqueda remota opcional para catálogos grandes. */
  onItemSearchChange?: (query: string) => void;
  itemSearchMinChars?: number;
  itemLocalName?: string;
}

/**
 * Editor de líneas ítem + cantidad (+ costo). Compartido por Registrar compra
 * y por Insumos de un servicio.
 */
export function LineItemsEditor({
  lines,
  items,
  onChange,
  title,
  emptyHint,
  footerHint,
  quantityPlaceholder = '0',
  showCost = false,
  moneda = 'Bs',
  quantityLabel = 'Cantidad',
  addLabel = 'Agregar ítem',
  error,
  onItemSearchChange,
  itemSearchMinChars,
  itemLocalName,
}: LineItemsEditorProps) {
  const patch = (key: string, p: Partial<ItemLine>) =>
    onChange(lines.map((l) => (l.key === key ? { ...l, ...p } : l)));

  const handleItem = (line: ItemLine, itemId: string) => {
    const item = items.find((i) => String(i.id) === itemId);
    // Sugerimos el último costo de compra, editable.
    patch(line.key, {
      item_id: itemId,
      item_label: item ? `${item.nombre} (${item.codigo})` : undefined,
      item_subtitle: item ? `${item.local_nombre ?? itemLocalName ?? 'Local no especificado'} · ${item.unidad_medida}` : undefined,
      item_unidad: item?.unidad_medida,
      ...(showCost && !line.costo && item?.costo_referencia ? { costo: String(item.costo_referencia) } : {}),
    });
  };

  const total = lines.reduce((acc, l) => acc + parsePositive(l.cantidad) * parsePositive(l.costo), 0);
  const chosen = lines.map((l) => l.item_id).filter(Boolean);

  return (
    <div className={`${styles.lines} ${showCost ? '' : styles.linesNoCost}`}>
      {title && <span className={styles.linesTitle}>{title}</span>}

      {lines.length === 0 && emptyHint && <p className={styles.linesEmpty}>{emptyHint}</p>}

      {lines.length > 0 && (
        <div className={styles.lineHead}>
          <span>Ítem</span>
          <span>{quantityLabel}</span>
          {showCost && <span>Costo unit.</span>}
          {showCost && <span className={styles.num}>Subtotal</span>}
          <span />
        </div>
      )}

      {lines.map((line, index) => {
        const item = items.find((i) => String(i.id) === line.item_id);
        const unidad = item?.unidad_medida ?? line.item_unidad;
        return (
          <div key={line.key} className={styles.line}>
            <ItemSelect
              compact
              items={items}
              value={line.item_id}
              excludeIds={chosen}
              onChange={(v) => handleItem(line, v)}
              selectedLabel={line.item_label}
              selectedSubtitle={line.item_subtitle}
              onSearchChange={onItemSearchChange}
              minSearchChars={itemSearchMinChars}
            />
            <div className={styles.fieldWithUnit}>
              <input
                type="text"
                inputMode="decimal"
                value={line.cantidad}
                onChange={(e) => patch(line.key, { cantidad: e.target.value })}
                placeholder={quantityPlaceholder}
                aria-label={`${quantityLabel} línea ${index + 1}`}
              />
              {unidad && <span className={styles.unitInline}>{unidad.toLowerCase()}</span>}
            </div>
            {showCost && (
              <div className={styles.fieldWithUnit}>
                <input
                  type="text"
                  inputMode="decimal"
                  value={line.costo}
                  onChange={(e) => patch(line.key, { costo: e.target.value })}
                  placeholder="0.00"
                  aria-label={`Costo unitario línea ${index + 1}`}
                />
              </div>
            )}
            {showCost && (
              <span className={`${styles.num} ${styles.subtotal}`}>
                {formatMoney(parsePositive(line.cantidad) * parsePositive(line.costo), moneda)}
              </span>
            )}
            <button
              type="button"
              className={styles.removeLine}
              onClick={() => onChange(lines.filter((l) => l.key !== line.key))}
              aria-label={`Quitar línea ${index + 1}`}
            >
              <Trash2 size={14} strokeWidth={1.8} />
            </button>
          </div>
        );
      })}

      {lines.length > 0 && footerHint && <p className={styles.linesEmpty}>{footerHint}</p>}

      {/* Debajo de la lista y a todo el ancho: se encuentra fácil y sigue a la vista al agregar varias líneas. */}
      <button type="button" className={styles.addLine} onClick={() => onChange([...lines, newLine()])}>
        <Plus size={16} strokeWidth={2.2} aria-hidden="true" />
        {addLabel}
      </button>

      {showCost && lines.length > 0 && (
        <div className={styles.total}>
          <span>Total</span>
          <strong>{formatMoney(total, moneda)}</strong>
        </div>
      )}
      {error && <span className={styles.lineError} role="alert">{error}</span>}
    </div>
  );
}
