'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { FormModal } from '@/components/AdminConfig';
import { CustomSelect } from '@/components/Custom/CustomSelectAdmin';
import { toast } from '@/components/Shared/Toast';
import {
  getCategoriasDB,
  getServiciosDB,
  getComboServiciosDB,
  crearComboServicio,
  actualizarComboServicio,
  eliminarComboServicio,
} from '@/lib/api/servicios';
import {
  crearCombo,
  actualizarCombo,
  reemplazarLocalesCombo,
  type ComboServicioLineaInput,
  type TipoPrecio,
} from '@/lib/api/combos';
import fields from './page.module.css';
import styles from './ComboFormModal.module.css';

export interface EditableCombo {
  id: number;
  nombre: string;
  descripcion?: string;
  categoria_id?: number;
  tipo_precio: TipoPrecio;
  precio_paquete?: number;
  moneda?: string;
  sesiones_totales?: number;
  locales?: { id: number; nombre: string }[];
}

interface LocalOpt {
  id: number;
  nombre: string;
}

interface Categoria {
  id: number;
  nombre: string;
}

interface ServicioOpt {
  id: number;
  nombre: string;
  tiempo: string;
  costo: number | string;
  sesiones: number;
}

interface LineaForm {
  id?: number;
  servicio_id: number | null;
  servicio_texto: string;
  tiempo: string;
  costo: string;
  sesiones: string;
  orden: string;
}

interface ComboFormModalProps {
  open: boolean;
  mode: 'crear' | 'editar';
  combo?: EditableCombo | null;
  locales: LocalOpt[];
  onClose: () => void;
  onSaved: () => void;
}

const nuevaLinea = (): LineaForm => ({ servicio_id: null, servicio_texto: '', tiempo: '', costo: '', sesiones: '1', orden: '0' });

export default function ComboFormModal({ open, mode, combo, locales, onClose, onSaved }: ComboFormModalProps) {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [tipoPrecio, setTipoPrecio] = useState<TipoPrecio>('PRECIO_PAQUETE');
  const [precioPaquete, setPrecioPaquete] = useState('');
  const [moneda, setMoneda] = useState('BOB');
  const [localIds, setLocalIds] = useState<number[]>([]);
  const [lineas, setLineas] = useState<LineaForm[]>([nuevaLinea()]);
  const lineasOriginales = useRef<LineaForm[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [serviciosDisponibles, setServiciosDisponibles] = useState<ServicioOpt[]>([]);
  const [loadingServicios, setLoadingServicios] = useState(false);
  const [loadingServiciosCombo, setLoadingServiciosCombo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar categorías al abrir.
  useEffect(() => {
    if (!open) return;
    getCategoriasDB()
      .then((res) => {
        const data = res as { data?: { categorias?: Categoria[] } };
        setCategorias(data?.data?.categorias ?? []);
      })
      .catch(() => setCategorias([]));
  }, [open]);

  // Cargar servicios según el primer local seleccionado.
  const primerLocalNombre = useMemo(() => {
    if (localIds.length === 0) return '';
    const id = localIds[0];
    return locales.find((l) => l.id === id)?.nombre ?? '';
  }, [localIds, locales]);

  useEffect(() => {
    if (!open || !primerLocalNombre) {
      setServiciosDisponibles([]);
      return;
    }
    setLoadingServicios(true);
    getServiciosDB({ local: primerLocalNombre })
      .then((res) => {
        const raw = (res as { data?: { servicios?: ServicioOpt[] } })?.data?.servicios ?? [];
        setServiciosDisponibles(raw);
      })
      .catch(() => setServiciosDisponibles([]))
      .finally(() => setLoadingServicios(false));
  }, [open, primerLocalNombre]);

  // Prefill (editar) o reset (crear) al abrir.
  useEffect(() => {
    if (!open) return;
    setError(null);
    lineasOriginales.current = [];
    if (mode === 'editar' && combo) {
      setNombre(combo.nombre ?? '');
      setDescripcion(combo.descripcion ?? '');
      setCategoriaId(combo.categoria_id != null ? String(combo.categoria_id) : '');
      setTipoPrecio(combo.tipo_precio ?? 'PRECIO_PAQUETE');
      setPrecioPaquete(combo.precio_paquete != null ? String(combo.precio_paquete) : '');
      setMoneda(combo.moneda ?? 'BOB');
      setLocalIds((combo.locales ?? []).map((l) => l.id));

      if (combo.id != null) {
        setLoadingServiciosCombo(true);
        getComboServiciosDB(combo.id)
          .then((res) => {
            const raw = (res as { data?: { servicios?: { id: number; servicio_id?: number | null; servicio_texto?: string | null; servicio_nombre: string; tiempo: string; costo: number; sesiones: number; orden?: number }[] } })?.data?.servicios ?? [];
            const loaded: LineaForm[] = raw.map((s) => ({
              id: s.id,
              servicio_id: s.servicio_id ?? null,
              servicio_texto: s.servicio_texto ?? s.servicio_nombre ?? '',
              tiempo: String(parseInt(s.tiempo, 10) || ''),
              costo: String(s.costo ?? ''),
              sesiones: String(s.sesiones ?? 1),
              orden: s.orden != null ? String(s.orden) : '0',
            }));
            setLineas(loaded.length > 0 ? loaded : [nuevaLinea()]);
            lineasOriginales.current = loaded;
          })
          .catch(() => {
            setLineas([nuevaLinea()]);
          })
          .finally(() => setLoadingServiciosCombo(false));
      } else {
        setLineas([nuevaLinea()]);
      }
    } else {
      setNombre('');
      setDescripcion('');
      setCategoriaId('');
      setTipoPrecio('PRECIO_PAQUETE');
      setPrecioPaquete('');
      setMoneda('BOB');
      setLocalIds([]);
      setLineas([nuevaLinea()]);
    }
  }, [open, mode, combo]);

  const toggleLocal = (id: number) =>
    setLocalIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const seleccionarServicioLinea = (i: number, idServicio: number) => {
    const svc = serviciosDisponibles.find((s) => s.id === idServicio);
    if (!svc) return;
    setLineas((prev) => prev.map((l, idx) =>
      idx === i
        ? {
            ...l,
            servicio_id: svc.id,
            servicio_texto: svc.nombre,
            tiempo: String(parseInt(String(svc.tiempo), 10) || ''),
            costo: String(svc.costo ?? ''),
            sesiones: String(svc.sesiones ?? 1),
          }
        : l,
    ));
  };

  const patchLinea = (i: number, patch: Partial<LineaForm>) =>
    setLineas((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const addLinea = () => setLineas((prev) => [...prev, nuevaLinea()]);
  const removeLinea = (i: number) => setLineas((prev) => prev.filter((_, idx) => idx !== i));

  const totalSesiones = useMemo(
    () => lineas.reduce((s, l) => s + (Number(l.sesiones) || 0), 0),
    [lineas],
  );

  const totalPrecioItems = useMemo(
    () => lineas.reduce((s, l) => s + (Number(l.costo) || 0), 0),
    [lineas],
  );

  const validar = (): string | null => {
    if (!nombre.trim()) return 'El nombre es obligatorio.';
    if (localIds.length === 0) return 'Selecciona al menos un local.';
    if (tipoPrecio === 'PRECIO_PAQUETE') {
      const p = Number(precioPaquete);
      if (!precioPaquete || Number.isNaN(p) || p < 0) return 'Ingresa un precio de paquete válido.';
    }
    if (moneda.trim().length !== 3) return 'La moneda debe tener 3 letras (ej. BOB).';
    if (lineas.length === 0) return 'Agrega al menos una línea de servicio.';
    for (const l of lineas) {
      if (l.servicio_id == null) return 'Cada línea debe seleccionar un servicio existente.';
      if (!Number.isInteger(Number(l.sesiones)) || Number(l.sesiones) < 1) return 'Sesiones inválidas en una línea.';
      const c = Number(l.costo);
      if (l.costo !== '' && (Number.isNaN(c) || c < 0)) return 'Costo inválido en una línea.';
    }
    return null;
  };

  const handleSubmit = async () => {
    const err = validar();
    if (err) { setError(err); return; }
    setSaving(true);
    setError(null);

    const categoria_id = categoriaId ? Number(categoriaId) : undefined;
    const precio_paquete = tipoPrecio === 'PRECIO_PAQUETE' ? Number(precioPaquete) : undefined;

    try {
      if (mode === 'crear') {
        const servicios: ComboServicioLineaInput[] = lineas.map((l, i) => ({
          servicio_id: l.servicio_id ?? undefined,
          servicio_texto: l.servicio_texto.trim() || undefined,
          tiempo: l.tiempo.trim() || undefined,
          costo: l.costo !== '' ? Number(l.costo) : undefined,
          sesiones: Number(l.sesiones),
          orden: l.orden !== '' ? Number(l.orden) : i,
        }));
        await crearCombo({
          nombre: nombre.trim(),
          descripcion: descripcion.trim() || undefined,
          categoria_id,
          tipo_precio: tipoPrecio,
          precio_paquete,
          moneda: moneda.trim().toUpperCase(),
          local_ids: localIds,
          servicios,
        });
        toast.success('Paquete creado');
      } else if (combo) {
        await actualizarCombo(combo.id, {
          nombre: nombre.trim(),
          descripcion: descripcion.trim(),
          categoria_id,
          tipo_precio: tipoPrecio,
          precio_paquete,
          moneda: moneda.trim().toUpperCase(),
        });
        await reemplazarLocalesCombo(combo.id, localIds);

        // Diff de líneas
        const originales = lineasOriginales.current;
        const actuales = lineas;

        const originalMap = new Map(originales.filter((l) => l.id != null).map((l) => [l.id!, l]));
        const actualMap = new Map(actuales.filter((l) => l.id != null).map((l) => [l.id!, l]));

        // Eliminar: están en originales pero no en actuales
        for (const orig of originales) {
          if (orig.id != null && !actualMap.has(orig.id)) {
            await eliminarComboServicio(orig.id);
          }
        }

        // Crear: están en actuales pero no en originales (sin id)
        for (const act of actuales) {
          if (act.id == null) {
            await crearComboServicio({
              combo_id: combo.id,
              servicio_id: act.servicio_id ?? undefined,
              servicio_texto: act.servicio_texto.trim() || undefined,
              tiempo: act.tiempo.trim() || undefined,
              costo: act.costo !== '' ? Number(act.costo) : undefined,
              sesiones: Number(act.sesiones),
              orden: act.orden !== '' ? Number(act.orden) : undefined,
            });
          }
        }

        // Actualizar: están en ambas pero cambiaron
        for (const act of actuales) {
          if (act.id == null) continue;
          const orig = originalMap.get(act.id);
          if (!orig) continue;
          const changed =
            orig.servicio_id !== act.servicio_id
            || orig.tiempo !== act.tiempo
            || orig.costo !== act.costo
            || orig.sesiones !== act.sesiones
            || orig.orden !== act.orden;
          if (changed) {
            await actualizarComboServicio(act.id, {
              servicio_id: act.servicio_id ?? undefined,
              tiempo: act.tiempo.trim() || undefined,
              costo: act.costo !== '' ? Number(act.costo) : undefined,
              sesiones: Number(act.sesiones),
              orden: act.orden !== '' ? Number(act.orden) : undefined,
            });
          }
        }

        toast.success('Paquete actualizado');
      }
      onSaved();
      onClose();
    } catch (e) {
      if (e instanceof Error) console.error('combo submit', e);
      toast.error(mode === 'crear' ? 'No se pudo crear el paquete.' : 'No se pudo actualizar el paquete.');
    } finally {
      setSaving(false);
    }
  };

  const sinId = mode === 'editar' && combo && combo.id == null;

  return (
    <FormModal
      isOpen={open}
      onClose={onClose}
      title={mode === 'crear' ? 'Nuevo paquete' : 'Editar paquete'}
      onSubmit={handleSubmit}
      loading={saving}
      size="lg"
      submitLabel={mode === 'crear' ? 'Crear paquete' : 'Guardar cambios'}
    >
      <div className={fields.formGrid}>
        {error && <div className={styles.formError}>{error}</div>}

        <div className={fields.formDivider}><span className={fields.formDividerLabel}>Datos</span></div>

        <div className={`${fields.field} ${fields.colSpan2}`}>
          <label htmlFor="cb-nombre">Nombre</label>
          <input id="cb-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="PAQUETE FIT" />
        </div>

        <div className={`${fields.field} ${fields.colSpan2}`}>
          <label htmlFor="cb-desc">Descripción <span className={styles.optional}>(opcional)</span></label>
          <textarea id="cb-desc" rows={2} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Promoción de 10 sesiones…" />
        </div>

        <div className={`${fields.field} ${fields.colSpan2}`}>
          <label id="lbl-cb-cat" htmlFor="cb-cat">Categoría <span className={styles.optional}>(opcional)</span></label>
          <CustomSelect
            id="cb-cat"
            ariaLabelledBy="lbl-cb-cat"
            value={categoriaId}
            onChange={setCategoriaId}
            options={[{ value: '', label: 'Sin categoría' }, ...categorias.map((c) => ({ value: String(c.id), label: c.nombre }))]}
          />
        </div>

        <div className={fields.formDivider}><span className={fields.formDividerLabel}>Precio</span></div>

        <div className={`${fields.colSpan2} ${styles.trio}`}>
          <div className={fields.field}>
            <label id="lbl-cb-tipo" htmlFor="cb-tipo">Tipo de precio</label>
            <CustomSelect
              id="cb-tipo"
              ariaLabelledBy="lbl-cb-tipo"
              value={tipoPrecio}
              onChange={(v) => setTipoPrecio(v as TipoPrecio)}
              options={[
                { value: 'PRECIO_PAQUETE', label: 'Precio de paquete (fijo)' },
                { value: 'POR_ITEMS', label: 'Por ítems (suma de líneas)' },
              ]}
            />
          </div>

          {tipoPrecio === 'PRECIO_PAQUETE' && (
            <>
              <div className={fields.field}>
                <label htmlFor="cb-precio">Precio</label>
                <input id="cb-precio" type="number" step="0.01" min={0} value={precioPaquete} onChange={(e) => setPrecioPaquete(e.target.value)} placeholder="679" />
              </div>
              <div className={fields.field}>
                <label htmlFor="cb-moneda">Moneda</label>
                <input id="cb-moneda" value={moneda} onChange={(e) => setMoneda(e.target.value)} maxLength={3} placeholder="BOB" />
              </div>
            </>
          )}
        </div>

        <div className={fields.formDivider}><span className={fields.formDividerLabel}>Locales</span></div>

        <div className={fields.colSpan2}>
          <div className={styles.checkboxGrid}>
            {locales.map((l) => (
              <label key={l.id} className={styles.checkbox}>
                <input type="checkbox" checked={localIds.includes(l.id)} onChange={() => toggleLocal(l.id)} />
                {l.nombre}
              </label>
            ))}
            {locales.length === 0 && <span className={styles.optional}>No hay locales disponibles.</span>}
          </div>
        </div>

        <div className={fields.formDivider}><span className={fields.formDividerLabel}>Servicios y sesiones</span></div>

        {loadingServiciosCombo ? (
          <div className={fields.colSpan2}>
            <p className={styles.hint}>Cargando servicios del paquete…</p>
          </div>
        ) : sinId ? (
          <div className={fields.colSpan2}>
            <p className={styles.hint}>
              Este paquete tiene <strong>{combo?.sesiones_totales ?? 0}</strong> {(combo?.sesiones_totales ?? 0) === 1 ? 'sesión' : 'sesiones'}.
              La edición de servicios no está disponible para este paquete (requiere ID numérico).
            </p>
          </div>
        ) : (
          <div className={fields.colSpan2}>
            <p className={styles.hint}>Cada línea es un servicio incluido con sus sesiones. El total de sesiones del paquete es la suma de las líneas.</p>
            <div className={styles.lineas}>
              {lineas.map((l, i) => (
                <div key={i} className={styles.lineaCard}>
                  <div className={styles.lineaTop}>
                    <CustomSelect
                      value={l.servicio_id != null ? String(l.servicio_id) : ''}
                      onChange={(v) => seleccionarServicioLinea(i, Number(v))}
                      options={[
                        { value: '', label: loadingServicios ? 'Cargando servicios…' : 'Seleccionar servicio…' },
                        ...serviciosDisponibles.map((s) => ({ value: String(s.id), label: s.nombre })),
                      ]}
                    />
                    <button type="button" className={styles.removeLinea} onClick={() => removeLinea(i)} aria-label="Quitar línea" disabled={lineas.length === 1}>
                      <Trash2 size={14} strokeWidth={2} />
                    </button>
                  </div>
                  {l.servicio_id != null && (
                    <div className={styles.lineaFields}>
                      <div className={styles.fieldMini}>
                        <label htmlFor={`ln-tiempo-${i}`}>Tiempo (min)</label>
                        <input id={`ln-tiempo-${i}`} type="number" min={0} value={l.tiempo} onChange={(e) => patchLinea(i, { tiempo: e.target.value })} placeholder="45" />
                      </div>
                      <div className={styles.fieldMini}>
                        <label htmlFor={`ln-costo-${i}`}>Costo (Bs)</label>
                        <input id={`ln-costo-${i}`} type="number" step="0.01" min={0} value={l.costo} onChange={(e) => patchLinea(i, { costo: e.target.value })} placeholder="120" />
                      </div>
                      <div className={styles.fieldMini}>
                        <label htmlFor={`ln-sesiones-${i}`}>Sesiones</label>
                        <input id={`ln-sesiones-${i}`} type="number" min={1} value={l.sesiones} onChange={(e) => patchLinea(i, { sesiones: e.target.value })} placeholder="1" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <button type="button" className={styles.addLinea} onClick={addLinea}>
              <Plus size={13} strokeWidth={2.2} /> Agregar línea
            </button>
            <p className={styles.totalSesiones}>
              Total del paquete: <strong>{totalSesiones}</strong> {totalSesiones === 1 ? 'sesión' : 'sesiones'}
              {tipoPrecio === 'POR_ITEMS' && totalPrecioItems > 0 && (
                <> — <strong>Bs {totalPrecioItems.toFixed(2)}</strong></>
              )}
            </p>
          </div>
        )}
      </div>
    </FormModal>
  );
}
