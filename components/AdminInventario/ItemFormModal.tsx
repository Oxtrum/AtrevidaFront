'use client';

import { useEffect, useState } from 'react';
import { Wallet } from 'lucide-react';
import {
  FormField,
  FormModal,
  FormRow,
  FormSection,
  FormSplit,
  FormStack,
  FormSubmitError,
  ImageUpload,
  InputAffix,
} from '@/components/AdminConfig';
import type { ImagenSeleccion } from '@/components/AdminConfig';
import { CustomSelect } from '@/components/Custom/CustomSelectAdmin';
import { toast } from '@/components/Shared/Toast';
import {
  actualizarInventarioItem,
  ajustarInventario,
  crearInventarioItem,
  eliminarImagenInventario,
  subirImagenInventario,
} from '@/lib/api/inventario';
import { useLocales } from '@/lib/hooks/useLocales';
import { UNIDADES_MEDIDA } from '@/types/inventario';
import type { CategoriaInventario, InventarioItem, UnidadMedida } from '@/types/inventario';

interface ItemFormModalProps {
  isOpen: boolean;
  /** null = crear. */
  item: InventarioItem | null;
  categorias: CategoriaInventario[];
  /** Código de moneda para el prefijo del costo (opcional). */
  moneda?: string;
  onClose: () => void;
  onSaved: () => void;
}

interface FormState {
  nombre: string;
  descripcion: string;
  categoria_id: string;
  unidad_medida: UnidadMedida;
  costo_referencia: string;
  precio_venta: string;
  stock_minimo: string;
  /** Solo al crear: cantidad con la que nace el ítem. Vacío = sin stock inicial. */
  stock_inicial: string;
  /** Solo al crear: local que recibe el stock inicial. '' = todos los locales. */
  local_inicial: string;
}

const EMPTY: FormState = {
  nombre: '',
  descripcion: '',
  categoria_id: '',
  unidad_medida: 'UNIDAD',
  costo_referencia: '',
  precio_venta: '',
  stock_minimo: '0',
  stock_inicial: '',
  local_inicial: '',
};

/** Sufijo corto que acompaña al stock mínimo según la unidad elegida. */
const SUFIJO_UNIDAD: Record<UnidadMedida, string> = {
  UNIDAD: 'uds',
  ML: 'ml',
  LT: 'lt',
  GR: 'gr',
  KG: 'kg',
  FRASCO: 'frascos',
  PAQUETE: 'paq.',
  SOBRE: 'sobres',
  CAJA: 'cajas',
};

const toNumber = (v: string) => Number(v.replace(',', '.'));

const MOTIVO_STOCK_INICIAL = 'Inventario inicial';

const SIN_CAMBIO_IMAGEN: ImagenSeleccion = { blob: null, quitar: false };

type LocalOpcion = { id: number; nombre: string };

interface StockInicialFieldsProps {
  cantidad: string;
  localId: string;
  sufijo: string;
  error?: string;
  onChange: (p: Pick<Partial<FormState>, 'stock_inicial' | 'local_inicial'>) => void;
  /** Entrega al formulario los locales disponibles, para repartir el stock cuando se elige "Todos". */
  onLocales: (locales: LocalOpcion[]) => void;
}

/** Stock con el que nace el ítem y a qué local va. Por defecto, todos los locales. */
function StockInicialFields({ cantidad, localId, sufijo, error, onChange, onLocales }: StockInicialFieldsProps) {
  const { locales } = useLocales();

  useEffect(() => {
    onLocales(locales);
  }, [locales, onLocales]);

  return (
    <FormRow>
      <FormField
        label="Stock inicial"
        htmlFor="inv-stock-inicial"
        error={error}
        hint="Opcional. Lo que hay hoy; después cambia con compras, ajustes y atenciones."
      >
        <InputAffix end={sufijo}>
          <input
            id="inv-stock-inicial"
            type="text"
            inputMode="decimal"
            value={cantidad}
            onChange={(e) => onChange({ stock_inicial: e.target.value })}
            placeholder="0"
          />
        </InputAffix>
      </FormField>

      <FormField
        label="Local del stock inicial"
        labelId="inv-local-inicial-lbl"
        hint={localId ? 'Solo este local recibe el stock inicial.' : 'Cada local recibe esa cantidad.'}
      >
        <CustomSelect
          value={localId}
          onChange={(v) => onChange({ local_inicial: v })}
          options={[
            { value: '', label: 'Todos los locales' },
            ...locales.map((l) => ({ value: String(l.id), label: l.nombre })),
          ]}
          searchable={false}
          ariaLabelledBy="inv-local-inicial-lbl"
        />
      </FormField>
    </FormRow>
  );
}

export function ItemFormModal({ isOpen, item, categorias, moneda, onClose, onSaved }: ItemFormModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState | 'submit', string>>>({});
  const [saving, setSaving] = useState(false);
  const [imagen, setImagen] = useState<ImagenSeleccion>(SIN_CAMBIO_IMAGEN);
  const [convirtiendo, setConvirtiendo] = useState(false);
  // Los carga StockInicialFields, que solo existe al crear y con el modal abierto: editar no los pide.
  const [locales, setLocales] = useState<LocalOpcion[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    setImagen(SIN_CAMBIO_IMAGEN);
    setForm(
      item
        ? {
            nombre: item.nombre,
            descripcion: item.descripcion ?? '',
            categoria_id: item.categoria_id ? String(item.categoria_id) : '',
            unidad_medida: item.unidad_medida,
            costo_referencia: item.costo_referencia != null ? String(item.costo_referencia) : '',
            precio_venta: item.precio_venta != null ? String(item.precio_venta) : '',
            stock_minimo: String(item.stock_minimo),
            stock_inicial: '',
            local_inicial: '',
          }
        : EMPTY,
    );
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
    if (form.precio_venta && !(toNumber(form.precio_venta) >= 0)) e.precio_venta = 'Precio inválido';
    if (!item && form.stock_inicial.trim() && !(toNumber(form.stock_inicial) >= 0)) e.stock_inicial = 'Cantidad inválida';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const sufijoUnidad = SUFIJO_UNIDAD[form.unidad_medida];
  const prefijoMoneda = moneda?.trim() ?? '';

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    const payload = {
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim() || undefined,
      categoria_id: form.categoria_id ? Number(form.categoria_id) : null,
      unidad_medida: form.unidad_medida,
      costo_referencia: form.costo_referencia ? toNumber(form.costo_referencia) : null,
      precio_venta: form.precio_venta ? toNumber(form.precio_venta) : null,
      stock_minimo: toNumber(form.stock_minimo || '0'),
    };

    try {
      let itemId: number;
      if (item) {
        await actualizarInventarioItem(item.id, payload);
        itemId = item.id;
      } else {
        itemId = (await crearInventarioItem(payload)).id;
      }

      // La imagen va después de guardar el ítem (necesita su id). Si falla, el ítem ya quedó guardado.
      let imagenError: string | null = null;
      try {
        if (imagen.blob) await subirImagenInventario(itemId, imagen.blob);
        else if (imagen.quitar && item?.imagen_url) await eliminarImagenInventario(itemId);
      } catch (err) {
        imagenError = err instanceof Error ? err.message : 'error desconocido';
      }

      // El stock inicial es un ajuste positivo por local (queda en el kardex). Igual que la imagen: si falla,
      // el ítem ya existe y se avisa en qué locales faltó para cargarlo con "Ajustar stock".
      const sinStock: string[] = [];
      const stockInicial = item ? 0 : toNumber(form.stock_inicial || '0');
      if (stockInicial > 0) {
        const destinos = form.local_inicial ? locales.filter((l) => String(l.id) === form.local_inicial) : locales;
        for (const local of destinos) {
          try {
            await ajustarInventario({
              item_id: itemId,
              local_id: local.id,
              tipo: 'AJUSTE_POSITIVO',
              cantidad: stockInicial,
              motivo: MOTIVO_STOCK_INICIAL,
            });
          } catch {
            sinStock.push(local.nombre);
          }
        }
        if (destinos.length === 0) sinStock.push('ningún local disponible');
      }

      const avisos = [
        ...(imagenError ? [`la imagen no se pudo guardar: ${imagenError}`] : []),
        ...(sinStock.length ? [`el stock inicial no se registró en ${sinStock.join(', ')}; cárgalo con "Ajustar stock"`] : []),
      ];
      if (avisos.length) toast.error(`Ítem guardado, pero ${avisos.join('; ')}`);
      else toast.success(item ? 'Ítem actualizado' : 'Ítem creado');
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
      submitDisabled={convirtiendo}
      submitLabel={item ? 'Guardar cambios' : 'Crear ítem'}
      size="lg"
    >
      <FormStack>
        <FormSplit
          aside={
            <ImageUpload
              id="inv-imagen"
              currentUrl={item?.imagen_url}
              alt="Imagen del ítem"
              disabled={saving}
              onChange={setImagen}
              onBusyChange={setConvirtiendo}
            />
          }
        >
          <FormField label="Nombre" htmlFor="inv-nombre" required error={errors.nombre}>
            <input
              id="inv-nombre"
              type="text"
              value={form.nombre}
              onChange={(e) => patch({ nombre: e.target.value })}
              placeholder="Ej: Gel conductor"
              maxLength={200}
              autoFocus
            />
          </FormField>

          <FormRow>
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

            <FormField label="Unidad de medida" labelId="inv-unidad-lbl">
              <CustomSelect
                value={form.unidad_medida}
                onChange={(v) => patch({ unidad_medida: v as UnidadMedida })}
                options={UNIDADES_MEDIDA.map((u) => ({ value: u.value, label: u.label }))}
                searchable={false}
                ariaLabelledBy="inv-unidad-lbl"
              />
            </FormField>
          </FormRow>

          <FormField label="Descripción" htmlFor="inv-desc">
            <textarea
              id="inv-desc"
              value={form.descripcion}
              onChange={(e) => patch({ descripcion: e.target.value })}
              placeholder="Detalles opcionales: marca, presentación, uso…"
            />
          </FormField>
        </FormSplit>

        <FormSection title="Stock y costos" icon={<Wallet size={13} strokeWidth={2} />}>
          {!item && (
            <StockInicialFields
              cantidad={form.stock_inicial}
              localId={form.local_inicial}
              sufijo={sufijoUnidad}
              error={errors.stock_inicial}
              onChange={patch}
              onLocales={setLocales}
            />
          )}
          <FormRow>
            <FormField
              label="Stock mínimo"
              htmlFor="inv-min"
              error={errors.stock_minimo}
              hint="Con esta cantidad o menos se marca como bajo stock."
            >
              <InputAffix end={sufijoUnidad}>
                <input
                  id="inv-min"
                  type="text"
                  inputMode="decimal"
                  value={form.stock_minimo}
                  onChange={(e) => patch({ stock_minimo: e.target.value })}
                />
              </InputAffix>
            </FormField>

            <FormField
              label="Costo de referencia"
              htmlFor="inv-costo"
              error={errors.costo_referencia}
              hint="Se actualiza solo con cada compra."
            >
              <InputAffix start={prefijoMoneda || undefined}>
                <input
                  id="inv-costo"
                  type="text"
                  inputMode="decimal"
                  value={form.costo_referencia}
                  onChange={(e) => patch({ costo_referencia: e.target.value })}
                  placeholder="0.00"
                />
              </InputAffix>
            </FormField>
          </FormRow>

          <FormField
            label="Precio de venta"
            htmlFor="inv-precio-venta"
            error={errors.precio_venta}
            hint="Lo que se cobra en caja. Se puede cambiar al vender."
          >
            <InputAffix start={prefijoMoneda || undefined}>
              <input
                id="inv-precio-venta"
                type="text"
                inputMode="decimal"
                value={form.precio_venta}
                onChange={(e) => patch({ precio_venta: e.target.value })}
                placeholder="Sin precio"
              />
            </InputAffix>
          </FormField>
        </FormSection>
      </FormStack>
      <FormSubmitError message={errors.submit} />
    </FormModal>
  );
}
