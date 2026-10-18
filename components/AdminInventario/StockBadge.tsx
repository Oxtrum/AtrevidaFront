import { AlertTriangle } from 'lucide-react';
import { StatusBadge } from '@/components/AdminConfig';
import type { InventarioItem } from '@/types/inventario';

/** Estado de stock de un ítem: agotado / bajo mínimo / ok (RN-05). */
export function StockBadge({ item }: { item: Pick<InventarioItem, 'stock_actual' | 'bajo_stock' | 'activo'> }) {
  if (!item.activo) return <StatusBadge tone="neutral">Inactivo</StatusBadge>;
  if (item.stock_actual < 0) return <StatusBadge tone="danger" icon={<AlertTriangle size={11} />}>Faltante</StatusBadge>;
  if (item.stock_actual === 0) return <StatusBadge tone="danger" icon={<AlertTriangle size={11} />}>Agotado</StatusBadge>;
  if (item.bajo_stock) return <StatusBadge tone="warning" icon={<AlertTriangle size={11} />}>Bajo stock</StatusBadge>;
  return <StatusBadge tone="success">OK</StatusBadge>;
}
