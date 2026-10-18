'use client';

import { useEffect, useState } from 'react';
import { FormField, FormModal, FormSubmitError, LocalSelect } from '@/components/AdminConfig';
import { toast } from '@/components/Shared/Toast';
import { ajustarInventario, getInventarioItem } from '@/lib/api/inventario';
import { getAdminLocalScope } from '@/lib/api/localScope';
import { formatQty } from '@/lib/utils/format';
import type { InventarioItem, StockLocal } from '@/types/inventario';
import styles from './AdminInventario.module.css';

interface AjusteModalProps {
  isOpen: boolean;
  item: InventarioItem | null;
  /** Local preseleccionado (filtro activo de la tabla). */
  defaultLocalId?: string;
  onClose: () => void;
  onSaved: () => void;
}

/** Ajuste manual de stock (merma, vencimiento, conteo físico). Motivo obligatorio (RN-03). */
export function AjusteModal({ isOpen, item, defaultLocalId = '', onClose, onSaved }: AjusteModalProps) {
  const [localId, setLocalId] = useState('');
  const [tipo, setTipo] = useState<'AJUSTE_POSITIVO' | 'AJUSTE_NEGATIVO'>('AJUSTE_POSITIVO');
  const [cantidad, setCantidad] = useState('');
  const [motivo, setMotivo] = useState('');
  const [stocks, setStocks] = useState<StockLocal[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !item) return;
    setLocalId(String(getAdminLocalScope()?.local_id ?? defaultLocalId));
    setTipo('AJUSTE_POSITIVO');
    setCantidad('');
    setMotivo('');
    setErrors({});
    getInventarioItem(item.id)
      .then((d) => setStocks(d.stock_por_local ?? []))
      .catch(() => setStocks([]));
  }, [isOpen, item, defaultLocalId]);

  if (!item) return null;

  const actual = stocks.find((s) => String(s.local_id) === localId)?.cantidad;
  const qty = Number(cantidad.replace(',', '.'));
  const resultante = actual !== undefined && qty > 0 ? actual + (tipo === 'AJUSTE_POSITIVO' ? qty : -qty) : null;

  const handleSubmit = async () => {
    const e: Record<string, string> = {};
    if (!localId) e.local = 'Selecciona el local';
    if (!(qty > 0)) e.cantidad = 'Ingresa una cantidad mayor a 0';
    if (!motivo.trim()) e.motivo = 'El motivo es obligatorio';
    setErrors(e);
    if (Object.keys(e).length) return;

    setSaving(true);
    try {
      await ajustarInventario({ item_id: item.id, local_id: Number(localId), tipo, cantidad: qty, motivo: motivo.trim() });
      toast.success('Ajuste registrado');
      onSaved();
      onClose();
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : 'No se pudo registrar el ajuste' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormModal isOpen={isOpen} onClose={onClose} title={`Ajustar stock · ${item.nombre}`} onSubmit={handleSubmit} loading={saving} submitLabel="Registrar ajuste">
      <div className={styles.stack}>
        <FormField label="Local" labelId="aj-local-lbl" required error={errors.local}>
          <LocalSelect value={localId} onChange={(v) => { setLocalId(v); setErrors({}); }} hasError={!!errors.local} />
        </FormField>

        <FormField label="Tipo de ajuste">
          <div className={styles.segmented}>
            <button type="button" className={`${styles.segment} ${tipo === 'AJUSTE_POSITIVO' ? styles.segmentOn : ''}`} onClick={() => setTipo('AJUSTE_POSITIVO')}>
              + Aumentar
            </button>
            <button type="button" className={`${styles.segment} ${tipo === 'AJUSTE_NEGATIVO' ? styles.segmentOn : ''}`} onClick={() => setTipo('AJUSTE_NEGATIVO')}>
              − Disminuir (merma)
            </button>
          </div>
        </FormField>

        <FormField label={`Cantidad (${item.unidad_medida.toLowerCase()})`} htmlFor="aj-cant" required error={errors.cantidad}>
          <input id="aj-cant" type="text" inputMode="decimal" value={cantidad} onChange={(e) => { setCantidad(e.target.value); setErrors({}); }} placeholder="0" autoFocus />
        </FormField>

        {actual !== undefined && (
          <p className={styles.stockInfo}>
            Stock actual en este local: <strong>{formatQty(actual, item.unidad_medida)}</strong>
            {resultante !== null && <> → quedará en <strong className={resultante < 0 ? styles.negative : undefined}>{formatQty(resultante, item.unidad_medida)}</strong></>}
          </p>
        )}

        <FormField label="Motivo" htmlFor="aj-motivo" required error={errors.motivo} hint="Ej: conteo físico, vencimiento, producto dañado.">
          <textarea id="aj-motivo" value={motivo} onChange={(e) => { setMotivo(e.target.value); setErrors({}); }} />
        </FormField>
      </div>
      <FormSubmitError message={errors.submit} />
    </FormModal>
  );
}
