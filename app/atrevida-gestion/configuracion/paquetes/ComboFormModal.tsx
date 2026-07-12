'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { FormModal } from '@/components/AdminConfig';
import { CustomSelect } from '@/components/Custom/CustomSelectAdmin';
import { toast } from '@/components/Shared/Toast';
import {
  getCategoriasDB,
  getServiciosDB,
  getComboServiciosDB,
} from '@/lib/api/servicios';
import {
  crearCombo,
  actualizarCombo,
  reemplazarLocalesCombo,
  reemplazarServiciosCombo,
  type ComboServicioLineaInput,
} from '@/lib/api/combos';
import fields from './page.module.css';
import styles from './ComboFormModal.module.css';

const TIPO_PRECIO = 'PRECIO_PAQUETE' as const;

export interface EditableCombo {
  id: number;
  nombre: string;
  descripcion?: string;
  categoria_id?: number;
  precio_paquete?: number;
  moneda?: string;
  sesiones_totales?: number;
  duracion_min?: number;
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
  costo: number | string;
}

// Cada línea es una referencia a un servicio incluido en la visita.
// costo se copia del catálogo (para la sugerencia de precio); no se edita por línea.
interface LineaForm {
  id?: number;
  servicio_id: number | null;
  servicio_texto: string;
  costo: string;
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

const nuevaLinea = (): LineaForm => ({ servicio_id: null, servicio_texto: '', costo: '', orden: '0' });

export default function ComboFormModal({ open, mode, combo, locales, onClose, onSaved }: ComboFormModalProps) {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [precioPaquete, setPrecioPaquete] = useState('');
  const [precioTocado, setPrecioTocado] = useState(false);
  const [moneda, setMoneda] = useState('BOB');
  const [sesionesTotales, setSesionesTotales] = useState('1');
  const [duracionMin, setDuracionMin] = useState('');
  const [localIds, setLocalIds] = useState<number[]>([]);
  const [lineas, setLineas] = useState<LineaForm[]>([nuevaLinea()]);
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
    if (mode === 'editar' && combo) {
      setNombre(combo.nombre ?? '');
      setDescripcion(combo.descripcion ?? '');
      setCategoriaId(combo.categoria_id != null ? String(combo.categoria_id) : '');
      setPrecioPaquete(combo.precio_paquete != null ? String(combo.precio_paquete) : '');
      setPrecioTocado(true); // ya tiene precio: no auto-sobreescribir con la sugerencia
      setMoneda(combo.moneda ?? 'BOB');
      setSesionesTotales(combo.sesiones_totales != null ? String(combo.sesiones_totales) : '1');
      setDuracionMin(combo.duracion_min != null ? String(combo.duracion_min) : '');
      setLocalIds((combo.locales ?? []).map((l) => l.id));

      if (combo.id != null) {
        setLoadingServiciosCombo(true);
        getComboServiciosDB(combo.id)
          .then((res) => {
            const raw = (res as { data?: { servicios?: { id: number; servicio_id?: number | null; servicio_texto?: string | null; servicio_nombre: string; costo: number; orden?: number }[] } })?.data?.servicios ?? [];
            const loaded: LineaForm[] = raw.map((s) => ({
              id: s.id,
              servicio_id: s.servicio_id ?? null,
              servicio_texto: s.servicio_texto ?? s.servicio_nombre ?? '',
              costo: String(s.costo ?? ''),
              orden: s.orden != null ? String(s.orden) : '0',
            }));
            setLineas(loaded.length > 0 ? loaded : [nuevaLinea()]);
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
      setPrecioPaquete('');
      setPrecioTocado(false);
      setMoneda('BOB');
      setSesionesTotales('1');
      setDuracionMin('');
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
            costo: String(svc.costo ?? ''),
          }
        : l,
    ));
  };

  const addLinea = () => setLineas((prev) => [...prev, nuevaLinea()]);
  const removeLinea = (i: number) => setLineas((prev) => prev.filter((_, idx) => idx !== i));

  // Sugerencia de precio = suma del costo de catálogo de los servicios elegidos.
  const precioSugerido = useMemo(
    () => lineas.reduce((s, l) => s + (Number(l.costo) || 0), 0),
    [lineas],
  );

  // Mientras el admin no toque el precio, se sincroniza con la sugerencia.
  useEffect(() => {
    if (!precioTocado) {
      setPrecioPaquete(precioSugerido > 0 ? String(precioSugerido) : '');
    }
  }, [precioSugerido, precioTocado]);

  const validar = (): string | null => {
    if (!nombre.trim()) return 'El nombre es obligatorio.';
    if (localIds.length === 0) return 'Selecciona al menos un local.';
    const p = Number(precioPaquete);
    if (!precioPaquete || Number.isNaN(p) || p < 0) return 'Ingresa un precio de paquete válido.';
    if (moneda.trim().length !== 3) return 'La moneda debe tener 3 letras (ej. BOB).';
    const ses = Number(sesionesTotales);
    if (!Number.isInteger(ses) || ses < 1) return 'Las sesiones del paquete deben ser un entero ≥ 1.';
    if (duracionMin !== '' && (Number.isNaN(Number(duracionMin)) || Number(duracionMin) < 0)) return 'Duración inválida.';
    if (lineas.length === 0 || lineas.some((l) => l.servicio_id == null)) return 'Cada línea debe seleccionar un servicio.';
    return null;
  };

  const construirLinea = (l: LineaForm, i: number): ComboServicioLineaInput => ({
    servicio_id: l.servicio_id ?? undefined,
    servicio_texto: l.servicio_texto.trim() || undefined,
    costo: l.costo !== '' ? Number(l.costo) : undefined,
    sesiones: 1, // referencia: 1 por línea; las sesiones reales son a nivel paquete
    orden: l.orden !== '' ? Number(l.orden) : i,
  });

  const handleSubmit = async () => {
    const err = validar();
    if (err) { setError(err); return; }
    setSaving(true);
    setError(null);

    const categoria_id = categoriaId ? Number(categoriaId) : undefined;
    const precio_paquete = Number(precioPaquete);
    const sesiones_totales = Number(sesionesTotales);
    const duracion_min = duracionMin !== '' ? Number(duracionMin) : undefined;

    try {
      if (mode === 'crear') {
        await crearCombo({
          nombre: nombre.trim(),
          descripcion: descripcion.trim() || undefined,
          categoria_id,
          tipo_precio: TIPO_PRECIO,
          precio_paquete,
          moneda: moneda.trim().toUpperCase(),
          sesiones_totales,
          duracion_min,
          local_ids: localIds,
          servicios: lineas.map(construirLinea),
        });
        toast.success('Paquete creado');
      } else if (combo) {
        await actualizarCombo(combo.id, {
          nombre: nombre.trim(),
          descripcion: descripcion.trim(),
          categoria_id,
          tipo_precio: TIPO_PRECIO,
          precio_paquete,
          moneda: moneda.trim().toUpperCase(),
          sesiones_totales,
          duracion_min,
        });
        await reemplazarLocalesCombo(combo.id, localIds);
        // Reemplazo total de las líneas (PUT). Simple y coincide con el endpoint del backend.
        await reemplazarServiciosCombo(combo.id, lineas.map(construirLinea));
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

        <div className={fields.formDivider}><span className={fields.formDividerLabel}>Paquete</span></div>

        <div className={fields.field}>
          <label htmlFor="cb-sesiones">Sesiones</label>
          <input id="cb-sesiones" type="number" min={1} value={sesionesTotales} onChange={(e) => setSesionesTotales(e.target.value)} placeholder="10" />
        </div>
        <div className={fields.field}>
          <label htmlFor="cb-duracion">Duración/sesión (min) <span className={styles.optional}>(opcional)</span></label>
          <input id="cb-duracion" type="number" min={0} value={duracionMin} onChange={(e) => setDuracionMin(e.target.value)} placeholder="90" />
        </div>

        <div className={fields.field}>
          <label htmlFor="cb-precio">Precio del paquete</label>
          <input id="cb-precio" type="number" step="0.01" min={0} value={precioPaquete} onChange={(e) => { setPrecioTocado(true); setPrecioPaquete(e.target.value); }} placeholder="679" />
          {precioSugerido > 0 && (
            <span className={styles.priceHint}>
              Sugerido: Bs {precioSugerido.toFixed(2)}
              {precioTocado && (
                <button type="button" className={styles.priceHintBtn} onClick={() => { setPrecioTocado(false); setPrecioPaquete(String(precioSugerido)); }}>usar</button>
              )}
            </span>
          )}
        </div>
        <div className={fields.field}>
          <label htmlFor="cb-moneda">Moneda</label>
          <input id="cb-moneda" value={moneda} onChange={(e) => setMoneda(e.target.value)} maxLength={3} placeholder="BOB" />
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

        <div className={fields.formDivider}><span className={fields.formDividerLabel}>Servicios incluidos</span></div>

        {loadingServiciosCombo ? (
          <div className={fields.colSpan2}>
            <p className={styles.hint}>Cargando servicios del paquete…</p>
          </div>
        ) : sinId ? (
          <div className={fields.colSpan2}>
            <p className={styles.hint}>La edición de servicios no está disponible para este paquete (requiere ID numérico).</p>
          </div>
        ) : (
          <div className={fields.colSpan2}>
            <p className={styles.hint}>Servicios que incluye cada visita del paquete (referencia). El precio arriba se sugiere sumando sus costos.</p>
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
                    <button type="button" className={styles.removeLinea} onClick={() => removeLinea(i)} aria-label="Quitar servicio" disabled={lineas.length === 1}>
                      <Trash2 size={14} strokeWidth={2} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" className={styles.addLinea} onClick={addLinea}>
              <Plus size={13} strokeWidth={2.2} /> Agregar servicio
            </button>
          </div>
        )}
      </div>
    </FormModal>
  );
}
