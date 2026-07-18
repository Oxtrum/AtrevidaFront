'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ImagePlus, Plus, Trash2 } from 'lucide-react';
import { FormModal } from '@/components/AdminConfig';
import { CustomSelect } from '@/components/Custom/CustomSelectAdmin';
import { toast } from '@/components/Shared/Toast';
import { getCategoriasDB, getServiciosDB } from '@/lib/api/servicios';
import {
  crearPaquete,
  actualizarPaquete,
  subirImagenPaquete,
  eliminarImagenPaquete,
  validarImagenPaquete,
  type PaqueteDetalle,
  type CrearPaqueteBody,
} from '@/lib/api/paquetes';
import fields from './page.module.css';
import styles from './PaqueteFormModal.module.css';

export type EditablePaquete = PaqueteDetalle;

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

// Fila del picker de servicios base: se elige del catálogo (servicioId) o se
// escribe texto libre; el back copia nombre/costo cuando hay servicioId.
interface ServicioBaseForm {
  servicioId: number | null;
  texto: string;
  costo: string;
  orden: number;
}

// Fila del editor de tiers (niveles de sesiones/precio).
interface TierForm {
  id?: number;
  sesiones: string;
  precioContado: string;
  precioRegular: string;
  nota: string;
}

interface PaqueteFormModalProps {
  open: boolean;
  mode: 'crear' | 'editar';
  paquete?: EditablePaquete | null;
  locales: LocalOpt[];
  onClose: () => void;
  onSaved: () => void;
}

const nuevoServicioBase = (orden = 0): ServicioBaseForm => ({ servicioId: null, texto: '', costo: '', orden });
const nuevoTier = (): TierForm => ({ sesiones: '', precioContado: '', precioRegular: '', nota: '' });

export default function PaqueteFormModal({ open, mode, paquete, locales, onClose, onSaved }: PaqueteFormModalProps) {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [moneda, setMoneda] = useState('BOB');
  const [localIds, setLocalIds] = useState<number[]>([]);
  const [serviciosBase, setServiciosBase] = useState<ServicioBaseForm[]>([nuevoServicioBase()]);
  const [tiers, setTiers] = useState<TierForm[]>([nuevoTier()]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [serviciosDisponibles, setServiciosDisponibles] = useState<ServicioOpt[]>([]);
  const [loadingServicios, setLoadingServicios] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Portada: archivo pendiente (aún no subido), URL actual guardada, y flag de quitar.
  const [imagenFile, setImagenFile] = useState<File | null>(null);
  const [imagenPreview, setImagenPreview] = useState<string | null>(null);
  const [imagenActual, setImagenActual] = useState<string | null>(null);
  const [imagenQuitar, setImagenQuitar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // La vista previa muestra el archivo pendiente; si no hay, la imagen guardada
  // (salvo que se haya marcado para quitar).
  const previewSrc = imagenPreview ?? (imagenQuitar ? null : imagenActual);

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

  // Cargar servicios del catálogo según el primer local seleccionado (picker de servicios base).
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
    setImagenFile(null);
    setImagenPreview(null);
    setImagenQuitar(false);
    setImagenActual(mode === 'editar' && paquete ? (paquete.paquete.imagen_url ?? null) : null);

    if (mode === 'editar' && paquete) {
      setNombre(paquete.paquete.nombre ?? '');
      setDescripcion(paquete.paquete.descripcion ?? '');
      setCategoriaId(paquete.paquete.categoria_id != null ? String(paquete.paquete.categoria_id) : '');
      setMoneda(paquete.paquete.moneda ?? 'BOB');
      setLocalIds((paquete.locales ?? []).map((l) => l.id));

      const loadedServicios: ServicioBaseForm[] = (paquete.servicios_base ?? []).map((s, i) => ({
        servicioId: s.servicio_id ?? null,
        texto: s.servicio_texto ?? '',
        costo: String(s.costo ?? ''),
        orden: s.orden ?? i,
      }));
      setServiciosBase(loadedServicios.length > 0 ? loadedServicios : [nuevoServicioBase()]);

      const loadedTiers: TierForm[] = (paquete.tiers ?? []).map((t) => ({
        id: t.id,
        sesiones: t.sesiones_totales != null ? String(t.sesiones_totales) : '',
        precioContado: t.precio_paquete != null ? String(t.precio_paquete) : (t.precio_final != null ? String(t.precio_final) : ''),
        precioRegular: t.precio_regular != null ? String(t.precio_regular) : '',
        nota: t.nota ?? '',
      }));
      setTiers(loadedTiers.length > 0 ? loadedTiers : [nuevoTier()]);
    } else {
      setNombre('');
      setDescripcion('');
      setCategoriaId('');
      setMoneda('BOB');
      setLocalIds([]);
      setServiciosBase([nuevoServicioBase()]);
      setTiers([nuevoTier()]);
    }
  }, [open, mode, paquete]);

  // Revoca el object URL de la vista previa al reemplazarlo o desmontar.
  useEffect(() => {
    return () => { if (imagenPreview) URL.revokeObjectURL(imagenPreview); };
  }, [imagenPreview]);

  const seleccionarImagen = (file: File | undefined) => {
    if (!file) return;
    const err = validarImagenPaquete(file);
    if (err) { toast.error(err); return; }
    if (imagenPreview) URL.revokeObjectURL(imagenPreview);
    setImagenFile(file);
    setImagenPreview(URL.createObjectURL(file));
    setImagenQuitar(false);
  };

  const quitarImagen = () => {
    if (imagenPreview) URL.revokeObjectURL(imagenPreview);
    setImagenFile(null);
    setImagenPreview(null);
    setImagenQuitar(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleLocal = (id: number) =>
    setLocalIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  // ── Servicios base ──────────────────────────────────────────────
  // v === '' limpia la selección (vuelve a texto libre); si no, busca en el catálogo.
  const seleccionarServicioBase = (i: number, v: string) => {
    if (v === '') {
      setServiciosBase((prev) => prev.map((s, idx) => (idx === i ? { ...s, servicioId: null } : s)));
      return;
    }
    const svc = serviciosDisponibles.find((s) => s.id === Number(v));
    if (!svc) return;
    setServiciosBase((prev) => prev.map((s, idx) =>
      idx === i
        ? { ...s, servicioId: svc.id, texto: svc.nombre, costo: String(svc.costo ?? '') }
        : s,
    ));
  };

  const addServicioBase = () => setServiciosBase((prev) => [...prev, nuevoServicioBase(prev.length)]);
  const removeServicioBase = (i: number) => setServiciosBase((prev) => prev.filter((_, idx) => idx !== i));

  // ── Tiers ────────────────────────────────────────────────────────
  const updateTier = (i: number, patch: Partial<TierForm>) =>
    setTiers((prev) => prev.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  const addTier = () => setTiers((prev) => [...prev, nuevoTier()]);
  const removeTier = (i: number) => setTiers((prev) => prev.filter((_, idx) => idx !== i));

  const validar = (): string | null => {
    if (!nombre.trim()) return 'El nombre es obligatorio.';
    if (localIds.length === 0) return 'Selecciona al menos un local.';
    if (tiers.length === 0) return 'Agrega al menos un tier.';
    for (const t of tiers) {
      const sesiones = Number(t.sesiones);
      const precioContado = Number(t.precioContado);
      if (!t.sesiones || Number.isNaN(sesiones) || !Number.isInteger(sesiones) || sesiones < 1) return 'Cada tier debe tener un número de sesiones válido (mínimo 1).';
      if (t.precioContado === '' || Number.isNaN(precioContado) || precioContado < 0) return 'Cada tier debe tener un precio de contado válido.';
      if (t.precioRegular.trim()) {
        const precioRegular = Number(t.precioRegular);
        if (Number.isNaN(precioRegular) || precioRegular < 0) return 'El precio regular debe ser un número válido.';
      }
    }
    for (const s of serviciosBase) {
      if (s.servicioId == null && !s.texto.trim()) return 'Cada servicio base debe seleccionarse del catálogo o tener un texto.';
    }
    return null;
  };

  const handleSubmit = async () => {
    const err = validar();
    if (err) { setError(err); return; }
    setSaving(true);
    setError(null);

    const body: CrearPaqueteBody = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || undefined,
      categoria_id: categoriaId ? Number(categoriaId) : undefined,
      moneda: (moneda.trim() || 'BOB').toUpperCase(),
      local_ids: localIds,
      servicios_base: serviciosBase.map((s, i) => ({
        servicio_id: s.servicioId ?? undefined,
        servicio_texto: s.texto.trim() || undefined,
        costo: Number(s.costo) || 0,
        orden: i,
      })),
      tiers: tiers.map((t) => ({
        id: t.id,
        sesiones: Number(t.sesiones),
        precio_contado: Number(t.precioContado),
        precio_regular: t.precioRegular.trim() ? Number(t.precioRegular) : undefined,
        nota: t.nota.trim() || undefined,
      })),
    };

    try {
      let paqueteId: number | null = null;
      if (mode === 'crear') {
        const res = await crearPaquete(body);
        paqueteId = res.data?.id ?? null;
      } else if (paquete) {
        paqueteId = paquete.paquete.id;
        await actualizarPaquete(paquete.paquete.id, body);
      }

      const okMsg = mode === 'crear' ? 'Paquete creado' : 'Paquete actualizado';
      // La imagen se gestiona aparte: un fallo aquí no invalida el paquete guardado.
      if (paqueteId != null && (imagenFile || (imagenQuitar && imagenActual))) {
        try {
          if (imagenFile) await subirImagenPaquete(paqueteId, imagenFile);
          else await eliminarImagenPaquete(paqueteId);
          toast.success(okMsg);
        } catch {
          toast.error('El paquete se guardó, pero la imagen no se pudo actualizar.');
        }
      } else {
        toast.success(okMsg);
      }
      onSaved();
      onClose();
    } catch (e) {
      if (e instanceof Error) console.error('paquete submit', e);
      toast.error(mode === 'crear' ? 'No se pudo crear el paquete.' : 'No se pudo actualizar el paquete.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormModal
      isOpen={open}
      onClose={onClose}
      title={mode === 'crear' ? 'Nuevo paquete' : 'Editar paquete'}
      onSubmit={handleSubmit}
      loading={saving}
      size="xl"
      submitLabel={mode === 'crear' ? 'Crear paquete' : 'Guardar cambios'}
    >
      {error && <div className={styles.formError}>{error}</div>}

      <div className={styles.groupLabel}>Portada <span className={styles.optional}>(opcional)</span></div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className={styles.imagenInput}
        onChange={(e) => { seleccionarImagen(e.target.files?.[0]); e.target.value = ''; }}
      />
      {previewSrc ? (
        <div className={styles.imagenPreview}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewSrc} alt="Portada del paquete" className={styles.imagenThumb} />
          <div className={styles.imagenActions}>
            <button type="button" className={styles.imagenBtn} onClick={() => fileInputRef.current?.click()}>Cambiar</button>
            <button type="button" className={styles.imagenBtnDanger} onClick={quitarImagen}>Quitar</button>
          </div>
        </div>
      ) : (
        <button type="button" className={styles.imagenDrop} onClick={() => fileInputRef.current?.click()}>
          <ImagePlus size={20} strokeWidth={1.8} />
          <span className={styles.imagenDropTitle}>Subir imagen</span>
          <span className={styles.imagenHint}>JPG o PNG · máx 5 MB</span>
        </button>
      )}

      <div className={styles.groupLabel}>Datos</div>

      <div className={fields.field}>
        <label htmlFor="pq-nombre">Nombre</label>
        <input id="pq-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="PAQUETE FIT" />
      </div>

      <div className={fields.field}>
        <label htmlFor="pq-desc">Descripción <span className={styles.optional}>(opcional)</span></label>
        <textarea id="pq-desc" rows={2} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Plan progresivo de sesiones…" />
      </div>

      <div className={styles.pairGrid}>
        <div className={fields.field}>
          <label id="lbl-pq-cat" htmlFor="pq-cat">Categoría <span className={styles.optional}>(opcional)</span></label>
          <CustomSelect
            id="pq-cat"
            ariaLabelledBy="lbl-pq-cat"
            value={categoriaId}
            onChange={setCategoriaId}
            options={[{ value: '', label: 'Sin categoría' }, ...categorias.map((c) => ({ value: String(c.id), label: c.nombre }))]}
          />
        </div>
        <div className={fields.field}>
          <label htmlFor="pq-moneda">Moneda</label>
          <input id="pq-moneda" value={moneda} onChange={(e) => setMoneda(e.target.value)} maxLength={3} placeholder="BOB" />
        </div>
      </div>

      <div className={styles.groupLabel}>Locales</div>
      <div className={styles.checkboxGrid}>
        {locales.map((l) => (
          <label key={l.id} className={styles.checkbox}>
            <input type="checkbox" checked={localIds.includes(l.id)} onChange={() => toggleLocal(l.id)} />
            {l.nombre}
          </label>
        ))}
        {locales.length === 0 && <span className={styles.optional}>No hay locales disponibles.</span>}
      </div>

      <div className={styles.groupLabel}>Servicios base</div>
      <p className={styles.hint}>Selecciona un servicio del catálogo del primer local elegido, o escribe un texto libre.</p>
      <div className={styles.rowsList}>
        {serviciosBase.map((s, i) => (
          <div key={i} className={styles.serviceRow}>
            <CustomSelect
              value={s.servicioId != null ? String(s.servicioId) : ''}
              onChange={(v) => seleccionarServicioBase(i, v)}
              placeholder={loadingServicios ? 'Cargando servicios…' : 'Seleccionar servicio del catálogo…'}
              options={serviciosDisponibles.map((sv) => ({ value: String(sv.id), label: sv.nombre }))}
            />
            <input
              className={styles.serviceTextInput}
              value={s.texto}
              onChange={(e) => setServiciosBase((prev) => prev.map((row, idx) => (idx === i ? { ...row, texto: e.target.value } : row)))}
              placeholder="…o texto libre"
              disabled={s.servicioId != null}
            />
            <input
              className={styles.serviceCostInput}
              type="number"
              min={0}
              step="0.01"
              value={s.costo}
              onChange={(e) => setServiciosBase((prev) => prev.map((row, idx) => (idx === i ? { ...row, costo: e.target.value } : row)))}
              placeholder="Costo"
              aria-label="Costo del servicio"
              disabled={s.servicioId != null}
            />
            <button type="button" className={styles.removeBtn} onClick={() => removeServicioBase(i)} aria-label="Quitar servicio" disabled={serviciosBase.length === 1}>
              <Trash2 size={14} strokeWidth={2} />
            </button>
          </div>
        ))}
      </div>
      <button type="button" className={styles.addBtn} onClick={addServicioBase}>
        <Plus size={13} strokeWidth={2.2} /> Agregar servicio
      </button>

      <div className={styles.groupLabel}>Tiers</div>
      <p className={styles.hint}>Cada tier es un nivel de sesiones con su propio precio.</p>
      <div className={styles.rowsList}>
        {tiers.map((t, i) => (
          <div key={i} className={styles.tierRow}>
            <div className={styles.tiersGrid}>
              <div className={styles.fieldMini}>
                <label htmlFor={`pq-tier-sesiones-${i}`}>Sesiones</label>
                <input
                  id={`pq-tier-sesiones-${i}`}
                  type="number"
                  min={1}
                  value={t.sesiones}
                  onChange={(e) => updateTier(i, { sesiones: e.target.value })}
                  placeholder="10"
                />
              </div>
              <div className={styles.fieldMini}>
                <label htmlFor={`pq-tier-contado-${i}`}>Precio contado</label>
                <input
                  id={`pq-tier-contado-${i}`}
                  type="number"
                  step="0.01"
                  min={0}
                  value={t.precioContado}
                  onChange={(e) => updateTier(i, { precioContado: e.target.value })}
                  placeholder="679"
                />
              </div>
              <div className={styles.fieldMini}>
                <label htmlFor={`pq-tier-regular-${i}`}>Precio regular <span className={styles.optional}>(opcional)</span></label>
                <input
                  id={`pq-tier-regular-${i}`}
                  type="number"
                  step="0.01"
                  min={0}
                  value={t.precioRegular}
                  onChange={(e) => updateTier(i, { precioRegular: e.target.value })}
                  placeholder="799"
                />
              </div>
              <div className={styles.fieldMini}>
                <label htmlFor={`pq-tier-nota-${i}`}>Nota <span className={styles.optional}>(opcional)</span></label>
                <input
                  id={`pq-tier-nota-${i}`}
                  value={t.nota}
                  onChange={(e) => updateTier(i, { nota: e.target.value })}
                  placeholder="Promoción de lanzamiento"
                />
              </div>
            </div>
            <button type="button" className={styles.removeBtn} onClick={() => removeTier(i)} aria-label="Quitar tier" disabled={tiers.length === 1}>
              <Trash2 size={14} strokeWidth={2} />
            </button>
          </div>
        ))}
      </div>
      <button type="button" className={styles.addBtn} onClick={addTier}>
        <Plus size={13} strokeWidth={2.2} /> Agregar tier
      </button>
    </FormModal>
  );
}
