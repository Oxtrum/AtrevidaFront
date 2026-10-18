'use client';

import { useEffect, useState } from 'react';
import { FormField, FormGrid, FormModal, FormSubmitError, ImageUploader } from '@/components/AdminConfig';
import { CustomSelect } from '@/components/Custom/CustomSelectAdmin';
import { toast } from '@/components/Shared/Toast';
import {
  actualizarInventarioItem,
  crearInventarioItem,
  quitarImagenInventarioItem,
  subirImagenInventarioItem,
} from '@/lib/api/inventario';
import { UNIDADES_MEDIDA } from '@/types/inventario';
import type { CategoriaInventario, InventarioItem, UnidadMedida } from '@/types/inventario';

interface ItemFormModalProps {
  isOpen: boolean;
  /** null = crear. */
  item: InventarioItem | null;
  categorias: CategoriaInventario[];
  onClose: () => void;
  onSaved: () => void;
}

interface FormState {
  nombre: string;
  descripcion: string;
  categoria_id: string;
  unidad_medida: UnidadMedida;
  costo_referencia: string;
  stock_minimo: string;
}

const EMPTY: FormState = {
  nombre: '',
  descripcion: '',
  categoria_id: '',
  unidad_medida: 'UNIDAD',
  costo_referencia: '',
  stock_minimo: '0',
};

const toNumber = (v: string) => Number(v.replace(',', '.'));

export function ItemFormModal({ isOpen, item, categorias, onClose, onSaved }: ItemFormModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [file, setFile] = useState<File | null>(null);
  const [imageRemoved, setImageRemoved] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState | 'submit', string>>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm(
      item
        ? {
            nombre: item.nombre,
            descripcion: item.descripcion ?? '',
            categoria_id: item.categoria_id ? String(item.categoria_id) : '',
            unidad_medida: item.unidad_medida,
            costo_referencia: item.costo_referencia != null ? String(item.costo_referencia) : '',
            stock_minimo: String(item.stock_minimo),
          }
        : EMPTY,
    );
    setFile(null);
    setImageRemoved(false);
    setErrors({});
  }, [isOpen, item]);

  const patch = (p: Partial<FormState>) => {
    setForm((f) => ({ ...f, ...p }));
    setErrors({});
  };

  const validate = () => {
    const e: typeof errors = {};
    if (!form.nombre.trim()) e.nombre = 'El nombre es obligatorio';
    const min = toNumber(form.stock_minimo || '0');
    if (!Number.isFinite(min) || min < 0) e.stock_minimo = 'Debe ser 0 o mayor';
    if (form.costo_referencia && !(toNumber(form.costo_referencia) >= 0)) e.costo_referencia = 'Costo inválido';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    const payload = {
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim() || undefined,
      categoria_id: form.categoria_id ? Number(form.categoria_id) : null,
      unidad_medida: form.unidad_medida,
      costo_referencia: form.costo_referencia ? toNumber(form.costo_referencia) : null,
      stock_minimo: toNumber(form.stock_minimo || '0'),
    };

    try {
      let id = item?.id;
      if (item) await actualizarInventarioItem(item.id, payload);
      else id = (await crearInventarioItem(payload)).id;

      // La imagen va aparte (upload-url → PUT → confirmar): si falla, el ítem ya quedó guardado.
      if (id !== undefined && (file || imageRemoved)) {
        try {
          if (file) await subirImagenInventarioItem(id, file);
          else await quitarImagenInventarioItem(id);
        } catch (err) {
          toast.error(err instanceof Error ? `Ítem guardado, pero la imagen falló: ${err.message}` : 'Ítem guardado, pero la imagen falló');
        }
      }
      toast.success(item ? 'Ítem actualizado' : 'Ítem creado');
      onSaved();
      onClose();
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : 'No se pudo guardar el ítem' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title={item ? `Editar ${item.codigo}` : 'Nuevo ítem de inventario'}
      onSubmit={handleSubmit}
      loading={saving}
      submitLabel={item ? 'Guardar' : 'Crear ítem'}
      size="lg"
    >
      <FormGrid>
        <FormField label="Nombre" htmlFor="inv-nombre" required error={errors.nombre} wide>
          <input
            id="inv-nombre"
            type="text"
            value={form.nombre}
            onChange={(e) => patch({ nombre: e.target.value })}
            placeholder="Ej: Gel conductor"
            autoFocus
          />
        </FormField>

        <FormField label="Categoría" labelId="inv-cat-lbl">
          <CustomSelect
            value={form.categoria_id}
            onChange={(v) => patch({ categoria_id: v })}
            options={categorias.filter((c) => c.activo).map((c) => ({ value: String(c.id), label: c.nombre }))}
            placeholder="Sin categoría"
            allowClear
            ariaLabelledBy="inv-cat-lbl"
          />
        </FormField>

        <FormField label="Unidad de medida" labelId="inv-unidad-lbl" hint="Las cantidades admiten hasta 3 decimales (ml, gr).">
          <CustomSelect
            value={form.unidad_medida}
            onChange={(v) => patch({ unidad_medida: v as UnidadMedida })}
            options={UNIDADES_MEDIDA.map((u) => ({ value: u.value, label: u.label }))}
            searchable={false}
            ariaLabelledBy="inv-unidad-lbl"
          />
        </FormField>

        <FormField label="Stock mínimo" htmlFor="inv-min" error={errors.stock_minimo} hint="Por debajo de este valor se marca como bajo stock.">
          <input id="inv-min" type="text" inputMode="decimal" value={form.stock_minimo} onChange={(e) => patch({ stock_minimo: e.target.value })} />
        </FormField>

        <FormField label="Costo de referencia" htmlFor="inv-costo" error={errors.costo_referencia} hint="Se actualiza solo con cada compra.">
          <input id="inv-costo" type="text" inputMode="decimal" value={form.costo_referencia} onChange={(e) => patch({ costo_referencia: e.target.value })} placeholder="0.00" />
        </FormField>

        <FormField label="Descripción" htmlFor="inv-desc" wide>
          <textarea id="inv-desc" value={form.descripcion} onChange={(e) => patch({ descripcion: e.target.value })} />
        </FormField>

        <FormField label="Imagen" wide>
          <ImageUploader
            currentUrl={item?.imagen_url}
            removed={imageRemoved}
            disabled={saving}
            onFileChange={setFile}
            onRemoveChange={setImageRemoved}
            onError={(m) => toast.error(m)}
          />
        </FormField>
      </FormGrid>
      <FormSubmitError message={errors.submit} />
    </FormModal>
  );
}
