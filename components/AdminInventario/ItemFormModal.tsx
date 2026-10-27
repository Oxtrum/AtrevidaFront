'use client';

import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent, KeyboardEvent } from 'react';
import { CircleCheck, ImagePlus, Loader2, Trash2, Wallet } from 'lucide-react';
import { FormField, FormModal, FormSubmitError, SectionLabel } from '@/components/AdminConfig';
import { CustomSelect } from '@/components/Custom/CustomSelectAdmin';
import { toast } from '@/components/Shared/Toast';
import {
  actualizarInventarioItem,
  crearInventarioItem,
  eliminarImagenInventario,
  subirImagenInventario,
} from '@/lib/api/inventario';
import { convertirAWebp, formatBytes } from '@/lib/utils/imageToWebp';
import { UNIDADES_MEDIDA } from '@/types/inventario';
import type { CategoriaInventario, InventarioItem, UnidadMedida } from '@/types/inventario';
import styles from './AdminInventario.module.css';

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

/** Imagen elegida y ya convertida a WebP, pendiente de subir al guardar. */
interface ImagenNueva {
  blob: Blob;
  previewUrl: string;
  originalBytes: number;
}

export function ItemFormModal({ isOpen, item, categorias, moneda, onClose, onSaved }: ItemFormModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState | 'imagen' | 'submit', string>>>({});
  const [saving, setSaving] = useState(false);
  const [imagenNueva, setImagenNueva] = useState<ImagenNueva | null>(null);
  const [quitarImagen, setQuitarImagen] = useState(false);
  const [convirtiendo, setConvirtiendo] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (imagenNueva) URL.revokeObjectURL(imagenNueva.previewUrl);
    };
  }, [imagenNueva]);

  useEffect(() => {
    if (!isOpen) return;
    setImagenNueva(null);
    setQuitarImagen(false);
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

  const procesarArchivo = async (file: File) => {
    setConvirtiendo(true);
    try {
      const webp = await convertirAWebp(file);
      setImagenNueva({ blob: webp.blob, previewUrl: URL.createObjectURL(webp.blob), originalBytes: webp.originalBytes });
      setQuitarImagen(false);
      setErrors({});
    } catch (err) {
      setErrors({ imagen: err instanceof Error ? err.message : 'No se pudo procesar la imagen' });
    } finally {
      setConvirtiendo(false);
    }
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) void procesarArchivo(file);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setArrastrando(false);
    if (convirtiendo || saving) return;
    const file = e.dataTransfer.files?.[0];
    if (file) void procesarArchivo(file);
  };

  const abrirSelector = () => {
    if (!convirtiendo && !saving) fileInputRef.current?.click();
  };

  const handleDropzoneKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      abrirSelector();
    }
  };

  const quitar = () => {
    setImagenNueva(null);
    setQuitarImagen(true);
    setErrors({});
  };

  const imagenActual = quitarImagen ? null : item?.imagen_url ?? null;
  const previewSrc = imagenNueva?.previewUrl ?? imagenActual;
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
        if (imagenNueva) await subirImagenInventario(itemId, imagenNueva.blob);
        else if (quitarImagen && item?.imagen_url) await eliminarImagenInventario(itemId);
      } catch (err) {
        imagenError = err instanceof Error ? err.message : 'error desconocido';
      }

      if (imagenError) toast.error(`Ítem guardado, pero la imagen no se pudo guardar: ${imagenError}`);
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
      <div className={styles.formLayout}>
        <div className={styles.formTop}>
          <FormField label="Imagen" htmlFor="inv-imagen" error={errors.imagen}>
            <div className={styles.imageCol}>
              <input
                ref={fileInputRef}
                id="inv-imagen"
                type="file"
                accept="image/*"
                className={styles.visuallyHidden}
                onChange={handleFileInput}
                tabIndex={-1}
              />
              <div
                className={`${styles.dropzone} ${previewSrc ? styles.dropzoneFilled : ''} ${arrastrando ? styles.dropzoneActive : ''}`}
                role={previewSrc ? undefined : 'button'}
                tabIndex={previewSrc ? undefined : 0}
                aria-label={previewSrc ? undefined : 'Elegir imagen del ítem'}
                onClick={previewSrc ? undefined : abrirSelector}
                onKeyDown={previewSrc ? undefined : handleDropzoneKey}
                onDragOver={(e) => {
                  e.preventDefault();
                  setArrastrando(true);
                }}
                onDragLeave={() => setArrastrando(false)}
                onDrop={handleDrop}
              >
                {previewSrc ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element -- URL de S3/CloudFront o blob local; el dominio aún no es fijo */}
                    <img src={previewSrc} alt="Imagen del ítem" className={styles.previewImg} />
                    <div className={styles.previewActions}>
                      <button
                        type="button"
                        className={styles.previewBtn}
                        onClick={abrirSelector}
                        disabled={convirtiendo || saving}
                        aria-label="Cambiar imagen"
                        title="Cambiar imagen"
                      >
                        <ImagePlus size={15} strokeWidth={2} />
                      </button>
                      <button
                        type="button"
                        className={`${styles.previewBtn} ${styles.previewBtnDanger}`}
                        onClick={quitar}
                        disabled={convirtiendo || saving}
                        aria-label="Quitar imagen"
                        title="Quitar imagen"
                      >
                        <Trash2 size={15} strokeWidth={2} />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <span className={styles.dropzoneIcon} aria-hidden="true">
                      <ImagePlus size={20} strokeWidth={1.75} />
                    </span>
                    <span className={styles.dropzoneTitle}>Subir imagen</span>
                    <span className={styles.dropzoneSub}>Arrastra una imagen aquí o haz clic para elegir</span>
                  </>
                )}
                {convirtiendo && (
                  <div className={styles.processing} role="status">
                    <Loader2 size={22} strokeWidth={2} className={styles.spin} />
                    Procesando…
                  </div>
                )}
              </div>
              {imagenNueva && (
                <div className={styles.imageMeta}>
                  <CircleCheck size={14} strokeWidth={2} className={styles.imageMetaOk} />
                  {formatBytes(imagenNueva.originalBytes)} → {formatBytes(imagenNueva.blob.size)}
                </div>
              )}
              {quitarImagen && item?.imagen_url && <div className={styles.imageMeta}>Se quitará al guardar</div>}
            </div>
          </FormField>

          <div className={styles.formMain}>
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

            <div className={styles.formRow}>
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
            </div>

            <FormField label="Descripción" htmlFor="inv-desc">
              <textarea
                id="inv-desc"
                value={form.descripcion}
                onChange={(e) => patch({ descripcion: e.target.value })}
                placeholder="Detalles opcionales: marca, presentación, uso…"
              />
            </FormField>
          </div>
        </div>

        <div className={styles.formSection}>
          <SectionLabel icon={<Wallet size={13} strokeWidth={2} />} withLine>
            Stock y costos
          </SectionLabel>
          <div className={styles.formRow}>
            <FormField
              label="Stock mínimo"
              htmlFor="inv-min"
              error={errors.stock_minimo}
              hint="Con esta cantidad o menos se marca como bajo stock."
            >
              <div className={styles.affix}>
                <input
                  id="inv-min"
                  type="text"
                  inputMode="decimal"
                  value={form.stock_minimo}
                  onChange={(e) => patch({ stock_minimo: e.target.value })}
                  style={{ paddingRight: `${Math.max(3, sufijoUnidad.length * 0.62 + 1.7)}rem` }}
                />
                <span className={`${styles.affixText} ${styles.affixEnd}`} aria-hidden="true">
                  {sufijoUnidad}
                </span>
              </div>
            </FormField>

            <FormField
              label="Costo de referencia"
              htmlFor="inv-costo"
              error={errors.costo_referencia}
              hint="Se actualiza solo con cada compra."
            >
              <div className={styles.affix}>
                {prefijoMoneda && (
                  <span className={`${styles.affixText} ${styles.affixStart}`} aria-hidden="true">
                    {prefijoMoneda}
                  </span>
                )}
                <input
                  id="inv-costo"
                  type="text"
                  inputMode="decimal"
                  value={form.costo_referencia}
                  onChange={(e) => patch({ costo_referencia: e.target.value })}
                  placeholder="0.00"
                  style={prefijoMoneda ? { paddingLeft: `${Math.max(3, prefijoMoneda.length * 0.62 + 1.7)}rem` } : undefined}
                />
              </div>
            </FormField>
          </div>
        </div>
      </div>
      <FormSubmitError message={errors.submit} />
    </FormModal>
  );
}
