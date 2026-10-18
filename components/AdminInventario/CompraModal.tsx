'use client';

import { useEffect, useState } from 'react';
import { CustomSelect } from '@/components/Custom/CustomSelectAdmin';
import { FormField, FormGrid, FormModal, FormSubmitError, LocalSelect } from '@/components/AdminConfig';
import { toast } from '@/components/Shared/Toast';
import { crearCompra } from '@/lib/api/compras';
import { getAdminLocalScope } from '@/lib/api/localScope';
import { todayISO } from '@/lib/utils/format';
import { METODOS_PAGO } from '@/types/inventario';
import type { Compra, InventarioItem, MetodoPago } from '@/types/inventario';
import { LineItemsEditor, newLine, parsePositive } from './LineItemsEditor';
import type { ItemLine } from './LineItemsEditor';

interface CompraModalProps {
  isOpen: boolean;
  items: InventarioItem[];
  moneda: string;
  defaultLocalId?: string;
  onClose: () => void;
  onSaved: (compra: Compra) => void;
}

/** Registra una compra: N entradas de stock + 1 egreso variable (atómico en backend, RN-21). */
export function CompraModal({ isOpen, items, moneda, defaultLocalId = '', onClose, onSaved }: CompraModalProps) {
  const [localId, setLocalId] = useState('');
  const [proveedor, setProveedor] = useState('');
  const [fecha, setFecha] = useState(todayISO());
  const [metodo, setMetodo] = useState<MetodoPago | ''>('');
  const [notas, setNotas] = useState('');
  const [lines, setLines] = useState<ItemLine[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLocalId(String(getAdminLocalScope()?.local_id ?? defaultLocalId));
    setProveedor('');
    setFecha(todayISO());
    setMetodo('');
    setNotas('');
    setLines([newLine()]);
    setErrors({});
  }, [isOpen, defaultLocalId]);

  const clear = () => setErrors({});

  const handleSubmit = async () => {
    const e: Record<string, string> = {};
    if (!localId) e.local = 'Selecciona el local que recibe la compra';
    if (!fecha) e.fecha = 'La fecha es obligatoria';
    const valid = lines.filter((l) => l.item_id || l.cantidad || l.costo);
    if (valid.length === 0) e.lines = 'Agrega al menos un ítem';
    else if (valid.some((l) => !l.item_id || !parsePositive(l.cantidad))) {
      e.lines = 'Cada línea necesita ítem y cantidad mayor a 0';
    } else if (valid.some((l) => l.costo.trim() === '' || !(Number(l.costo.replace(',', '.')) >= 0))) {
      e.lines = 'Indica el costo unitario de cada ítem';
    }
    setErrors(e);
    if (Object.keys(e).length) return;

    setSaving(true);
    try {
      const compra = await crearCompra({
        local_id: Number(localId),
        proveedor: proveedor.trim() || undefined,
        fecha,
        notas: notas.trim() || undefined,
        metodo_pago: metodo || undefined,
        detalle: valid.map((l) => ({
          item_id: Number(l.item_id),
          cantidad: parsePositive(l.cantidad),
          costo_unitario: Number(l.costo.replace(',', '.')),
        })),
      });
      toast.success(
        compra.movimiento_financiero_codigo
          ? `Compra ${compra.codigo} registrada · egreso ${compra.movimiento_financiero_codigo}`
          : `Compra ${compra.codigo} registrada`,
      );
      onSaved(compra);
      onClose();
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : 'No se pudo registrar la compra' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormModal isOpen={isOpen} onClose={onClose} title="Registrar compra" onSubmit={handleSubmit} loading={saving} submitLabel="Registrar compra" size="xl">
      <FormGrid>
        <FormField label="Local que recibe" required error={errors.local}>
          <LocalSelect value={localId} onChange={(v) => { setLocalId(v); clear(); }} hasError={!!errors.local} />
        </FormField>
        <FormField label="Fecha" htmlFor="cmp-fecha" required error={errors.fecha}>
          <input id="cmp-fecha" type="date" value={fecha} onChange={(e) => { setFecha(e.target.value); clear(); }} />
        </FormField>
        <FormField label="Proveedor" htmlFor="cmp-prov">
          <input id="cmp-prov" type="text" value={proveedor} onChange={(e) => setProveedor(e.target.value)} placeholder="Opcional" />
        </FormField>
        <FormField label="Método de pago" labelId="cmp-met-lbl">
          <CustomSelect
            value={metodo}
            onChange={(v) => setMetodo(v as MetodoPago | '')}
            options={METODOS_PAGO.map((m) => ({ value: m.value, label: m.label }))}
            placeholder="Sin especificar"
            allowClear
            searchable={false}
            ariaLabelledBy="cmp-met-lbl"
          />
        </FormField>
        <div style={{ gridColumn: '1 / -1' }}>
          <LineItemsEditor title="Ítems comprados" lines={lines} items={items} onChange={(l) => { setLines(l); clear(); }} showCost moneda={moneda} error={errors.lines} />
        </div>
        <FormField label="Notas" htmlFor="cmp-notas" wide>
          <textarea id="cmp-notas" value={notas} onChange={(e) => setNotas(e.target.value)} />
        </FormField>
      </FormGrid>
      <FormSubmitError message={errors.submit} />
    </FormModal>
  );
}
