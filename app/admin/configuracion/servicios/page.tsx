'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import gsap from 'gsap';
import { Plus } from 'lucide-react';
import Header from '@/components/AdminHeader/Header';
import { PageHeader, DataTable, FormModal } from '@/components/AdminConfig';
import type { Column } from '@/components/AdminConfig';
import { CustomSelect } from '@/components/Custom/CustomSelectAdmin';
import { toast } from '@/components/Shared/Toast';
import {
  getCategoriasDB,
  getLocalesDB,
  getServiciosDB,
  crearServicioDB,
  actualizarServicio,
  eliminarServicioDB,
  activarServicioEnLocal,
} from '@/lib/api/servicios';
import styles from './page.module.css';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ServicioRow extends Record<string, unknown> {
  id: number;
  nombre: string;
  categoria: string;
  local: string;
  tiempo: string;
  costo: string;
  sesiones: number;
  tipoEspacio: string;
  activo?: boolean;
  requiere_evaluacion?: boolean;
}

interface CategoriaOption {
  ID: number;
  Nombre: string;
}

interface LocalOption {
  id: number;
  nombre: string;
}

interface FormState {
  nombre: string;
  categoria: string;
  tiempo: string;
  costo: string;
  sesiones: number;
  tipo_espacio_requerido: string;
  local: string;
  requiere_evaluacion: boolean;
}

interface FormErrors {
  nombre?: string;
  categoria?: string;
  local?: string;
  costo?: string;
  tiempo?: string;
  sesiones?: string;
  submit?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FORM_INITIAL: FormState = {
  nombre: '',
  categoria: '',
  tiempo: '',
  costo: '',
  sesiones: 1,
  tipo_espacio_requerido: 'M',
  local: '',
  requiere_evaluacion: false,
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ServiciosPage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const [servicios, setServicios] = useState<ServicioRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filtroLocal, setFiltroLocal] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroNombre, setFiltroNombre] = useState('');
  const [filtroSesiones, setFiltroSesiones] = useState('');
  /** 'all' | 'true' | 'false' — filtro tri-estado (incluye opción sin filtrar). */
  const [filtroEvaluacion, setFiltroEvaluacion] = useState<'all' | 'true' | 'false'>('all');
  const hasFilter = !!(filtroLocal || filtroCategoria);

  // Row-action state
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [activarLocalRow, setActivarLocalRow] = useState<ServicioRow | null>(null);
  const [activarLocalValue, setActivarLocalValue] = useState('');
  const [activarLocalSaving, setActivarLocalSaving] = useState(false);

  // Options
  const [categorias, setCategorias] = useState<CategoriaOption[]>([]);
  const [locales, setLocales] = useState<LocalOption[]>([]);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(FORM_INITIAL);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const isEdit = editingId !== null;

  // ─── Data fetching ───────────────────────────────────────────────────────────

  const fetchServicios = useCallback(async () => {
    // Requiere al menos un filtro para consultar
    if (!filtroLocal && !filtroCategoria) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getServiciosDB({
        local: filtroLocal || undefined,
        categoria: filtroCategoria || undefined,
        nombre: filtroNombre || undefined,
        sesiones: filtroSesiones ? Number(filtroSesiones) : undefined,
        requiere_evaluacion:
          filtroEvaluacion === 'all' ? undefined : filtroEvaluacion === 'true',
      }) as { data?: { servicios?: ServicioRow[]; total?: number } };
      setServicios(res?.data?.servicios ?? []);
      setTotal(res?.data?.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar servicios');
    } finally {
      setLoading(false);
    }
  }, [filtroLocal, filtroCategoria, filtroNombre, filtroSesiones, filtroEvaluacion]);

  const fetchOptions = useCallback(async () => {
    try {
      const [catRes, locRes] = await Promise.all([
        getCategoriasDB() as Promise<{ data?: { categorias?: CategoriaOption[] } }>,
        getLocalesDB() as Promise<{ data?: { locales?: LocalOption[] } }>,
      ]);
      setCategorias(catRes?.data?.categorias ?? []);
      setLocales(locRes?.data?.locales ?? []);
    } catch (err) {
      console.error('fetchOptions', err);
      toast.error('No se cargaron categorías o locales');
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) { router.push('/admin/login'); return; }
    fetchOptions();
  }, [router, fetchOptions]);

  useEffect(() => {
    if (hasFilter) fetchServicios();
    else { setServicios([]); setTotal(0); }
  }, [fetchServicios, hasFilter]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        contentRef.current,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' }
      );
    }, containerRef);
    return () => ctx.revert(); // era ctx.kill()
  }, []);

  // ─── Form ────────────────────────────────────────────────────────────────────

  const patchForm = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }));

  const resetModal = () => {
    setForm(FORM_INITIAL);
    setFormErrors({});
    setEditingId(null);
  };

  const openCreate = () => {
    resetModal();
    setModalOpen(true);
  };

  const openEdit = (row: ServicioRow) => {
    setEditingId(row.id);
    setFormErrors({});
    setForm({
      nombre: row.nombre,
      categoria: row.categoria,
      tiempo: String(row.tiempo ?? ''),
      costo: String(row.costo ?? ''),
      sesiones: row.sesiones,
      tipo_espacio_requerido:
        row.tipoEspacio === 'Mesas' ? 'M'
        : row.tipoEspacio === 'Bicicletas' ? 'B'
        : (row.tipoEspacio || 'M'),
      local: row.local,
      requiere_evaluacion: row.requiere_evaluacion ?? false,
    });
    setModalOpen(true);
  };

  const validate = (): boolean => {
    const errors: FormErrors = {};
    if (!form.nombre.trim()) errors.nombre = 'El nombre es obligatorio';
    if (!form.categoria) errors.categoria = 'Selecciona una categoría';
    if (!isEdit && !form.local) errors.local = 'Selecciona un local';

    const costoNum = Number(form.costo);
    if (!form.costo || Number.isNaN(costoNum) || costoNum < 0) {
      errors.costo = 'Costo inválido';
    }

    const tiempoNum = Number(form.tiempo);
    if (!form.tiempo || Number.isNaN(tiempoNum) || tiempoNum <= 0) {
      errors.tiempo = 'Tiempo inválido';
    }

    if (!Number.isInteger(form.sesiones) || form.sesiones < 1) {
      errors.sesiones = 'Mínimo 1 sesión';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    setFormErrors({});

    const sesiones = Math.max(1, Math.floor(form.sesiones));
    const costo = Number(form.costo);
    const tiempo = form.tiempo.trim();

    try {
      if (isEdit && editingId !== null) {
        // PATCH spec: nombre, categoria, tiempo, costo, sesiones, tipo_espacio_requerido, activo
        // (NO local — backend ignores it on PATCH)
        await actualizarServicio(editingId, {
          nombre: form.nombre.trim(),
          categoria: form.categoria,
          tiempo,
          costo,
          sesiones,
          tipo_espacio_requerido: form.tipo_espacio_requerido,
          requiere_evaluacion: form.requiere_evaluacion,
        });
        toast.success('Servicio actualizado correctamente');
      } else {
        await crearServicioDB({
          nombre: form.nombre.trim(),
          categoria: form.categoria,
          tiempo,
          costo,
          sesiones,
          tipo_espacio_requerido: form.tipo_espacio_requerido,
          local: form.local,
          requiere_evaluacion: form.requiere_evaluacion,
        });
        toast.success('Servicio creado correctamente');
      }
      setModalOpen(false);
      resetModal();
      await fetchServicios();
    } catch (err) {
      if (err instanceof Error) console.error(isEdit ? 'actualizarServicio' : 'crearServicioDB', err);
      toast.error(
        isEdit
          ? 'No se pudo actualizar el servicio. Verifica los datos e inténtalo de nuevo.'
          : 'No se pudo crear el servicio. Verifica los datos e inténtalo de nuevo.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActivo = async (row: ServicioRow) => {
    const next = !(row.activo ?? true);
    const verb = next ? 'activar' : 'desactivar';
    if (!confirm(`¿Seguro que quieres ${verb} "${row.nombre}"?`)) return;
    try {
      await actualizarServicio(row.id, { activo: next });
      toast.success(next ? 'Servicio activado' : 'Servicio desactivado');
      await fetchServicios();
    } catch (err) {
      if (err instanceof Error) console.error('actualizarServicio.activo', err);
      toast.error(`No se pudo ${verb} el servicio.`);
    }
  };

  const handleDelete = async (row: ServicioRow) => {
    if (!confirm(`¿Eliminar el servicio "${row.nombre}"? Se hará borrado lógico (activo = false).`)) return;
    setDeletingId(row.id);
    try {
      await eliminarServicioDB(row.id);
      toast.success('Servicio eliminado');
      await fetchServicios();
    } catch (err) {
      if (err instanceof Error) console.error('eliminarServicioDB', err);
      toast.error('No se pudo eliminar el servicio.');
    } finally {
      setDeletingId(null);
    }
  };

  const openActivarLocal = (row: ServicioRow) => {
    setActivarLocalRow(row);
    setActivarLocalValue('');
  };

  const closeActivarLocal = () => {
    setActivarLocalRow(null);
    setActivarLocalValue('');
  };

  const handleActivarLocal = async () => {
    if (!activarLocalRow || !activarLocalValue) {
      toast.error('Selecciona un local');
      return;
    }
    setActivarLocalSaving(true);
    try {
      await activarServicioEnLocal(activarLocalRow.id, { local: activarLocalValue });
      toast.success(`Servicio activado en ${activarLocalValue}`);
      closeActivarLocal();
      await fetchServicios();
    } catch (err) {
      if (err instanceof Error) console.error('activarServicioEnLocal', err);
      toast.error('No se pudo activar el servicio en el local seleccionado.');
    } finally {
      setActivarLocalSaving(false);
    }
  };

  // ─── Columns ─────────────────────────────────────────────────────────────────

  const columns: Column<ServicioRow>[] = [
    { key: 'nombre', label: 'Nombre' },
    { key: 'categoria', label: 'Categoría' },
    { key: 'local', label: 'Local', searchable: false },
    { key: 'tiempo', label: 'Tiempo', searchable: false },
    { key: 'costo', label: 'Costo', searchable: false },
    { key: 'sesiones', label: 'Sesiones', searchable: false },
    {
      key: 'tipoEspacio',
      label: 'Espacio',
      searchable: false,
      render: (val) =>
        val === 'M'
          ? 'Mesas'
          : val === 'B'
            ? 'Bicicletas'
            : String(val),
    },
    {
      key: 'requiere_evaluacion',
      label: 'Evaluación',
      searchable: false,
      render: (_val, row) =>
        row.requiere_evaluacion ? (
          <span className={styles.evaluacionBadge} title="Requiere evaluación previa">
            Requerida
          </span>
        ) : (
          <span className={styles.evaluacionMuted}>—</span>
        ),
    },
    {
      key: 'activo',
      label: 'Estado',
      searchable: false,
      render: (_val, row) => {
        const activo = row.activo ?? true;
        return (
          <button
            type="button"
            onClick={() => handleToggleActivo(row)}
            className={activo ? styles.statusActive : styles.statusInactive}
            aria-label={activo ? 'Desactivar servicio' : 'Activar servicio'}
            title={activo ? 'Desactivar' : 'Activar'}
          >
            {activo ? 'Activo' : 'Inactivo'}
          </button>
        );
      },
    },
    {
      key: 'acciones',
      label: 'Acciones',
      searchable: false,
      render: (_val, row) => (
        <div className={styles.rowActions}>
          <button
            type="button"
            className={styles.linkAction}
            onClick={() => openActivarLocal(row)}
            title="Activar este servicio en otro local"
          >
            Activar en otro local
          </button>
          <button
            type="button"
            className={styles.dangerAction}
            onClick={() => handleDelete(row)}
            disabled={deletingId === row.id}
            title="Eliminar servicio (borrado lógico)"
          >
            {deletingId === row.id ? 'Eliminando…' : 'Eliminar'}
          </button>
        </div>
      ),
    },
  ];

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div ref={containerRef} className={styles.pageContainer}>
      <Header />
      <main className={styles.main}>
        <PageHeader
          title="Servicios"
          subtitle="Configura los servicios ofrecidos por local"
          backHref="/admin/configuracion"
          actions={
            <button
              className="admin-button admin-button-primary"
              onClick={openCreate}
            >
              <Plus size={18} strokeWidth={2} />
              Nuevo Servicio
            </button>
          }
        />

        <div ref={contentRef} className={styles.contentStack}>
          {/* ── Filter bar — card propio ── */}
          <div className={styles.filterCard}>
            <div className={styles.filterBar}>
              <div className={styles.filterGroup}>
                <label id="lbl-filtro-local" htmlFor="filtro-local">Local</label>
                <CustomSelect
                  id="filtro-local"
                  ariaLabelledBy="lbl-filtro-local"
                  value={filtroLocal}
                  onChange={setFiltroLocal}
                  options={[
                    { value: '', label: 'Seleccionar local' },
                    ...locales.map((l) => ({ value: l.nombre, label: l.nombre })),
                  ]}
                />
              </div>
              <div className={styles.filterGroup}>
                <label id="lbl-filtro-categoria" htmlFor="filtro-categoria">Categoría</label>
                <CustomSelect
                  id="filtro-categoria"
                  ariaLabelledBy="lbl-filtro-categoria"
                  value={filtroCategoria}
                  onChange={setFiltroCategoria}
                  options={[
                    { value: '', label: 'Todas' },
                    ...categorias.map((c) => ({ value: c.Nombre, label: c.Nombre })),
                  ]}
                />
              </div>
              <div className={styles.filterGroup}>
                <label id="lbl-filtro-eval" htmlFor="filtro-eval">Requiere evaluación</label>
                <CustomSelect
                  id="filtro-eval"
                  ariaLabelledBy="lbl-filtro-eval"
                  value={filtroEvaluacion}
                  onChange={(v) => setFiltroEvaluacion(v as 'all' | 'true' | 'false')}
                  options={[
                    { value: 'all', label: 'Todos' },
                    { value: 'true', label: 'Requieren' },
                    { value: 'false', label: 'No requieren' },
                  ]}
                />
              </div>

            </div>
          </div>

          {/* ── Hint: pide seleccionar filtro ── */}
          {!hasFilter && (
            <div className={styles.hint}>
              Selecciona un <strong>local</strong> o una <strong>categoría</strong> para ver los servicios.
            </div>
          )}

          {/* ── Tabla (DataTable es self-contained) ── */}
          {hasFilter && (
            <>
              {total > 0 && (
                <p className={styles.totalLabel}>
                  {total} servicio{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}
                </p>
              )}
              <DataTable<ServicioRow>
                columns={columns}
                data={servicios}
                loading={loading}
                error={error}
                onRefresh={fetchServicios}
                onEdit={openEdit}
                getRowKey={(s) => s.id ?? `${s.nombre}-${s.local}-${s.categoria}`}
                searchPlaceholder="Filtrar resultados..."
                emptyMessage="No se encontraron servicios con los filtros actuales"
              />
            </>
          )}
        </div>
      </main>

      {/* ── Modal ── */}
      <FormModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); resetModal(); }}
        title={isEdit ? 'Editar Servicio' : 'Nuevo Servicio'}
        onSubmit={handleSubmit}
        loading={saving}
        submitLabel={isEdit ? 'Guardar cambios' : 'Crear'}
      >
        <div className={styles.formGrid}>
          {/* Nombre */}
          <div className={`${styles.field} ${styles.colSpan2}`}>
            <label htmlFor="srv-nombre">Nombre</label>
            <input
              id="srv-nombre"
              type="text"
              value={form.nombre}
              onChange={(e) => {
                patchForm({ nombre: e.target.value });
                if (formErrors.nombre) setFormErrors((p) => ({ ...p, nombre: undefined }));
              }}
              placeholder="Ej: Masaje relajante"
              autoFocus
              aria-invalid={!!formErrors.nombre}
              className={formErrors.nombre ? styles.inputError : ''}
            />
            {formErrors.nombre && <span className={styles.fieldError}>{formErrors.nombre}</span>}
          </div>

          {/* Categoría */}
          <div className={styles.field}>
            <label id="lbl-srv-categoria" htmlFor="srv-categoria">Categoría</label>
            <CustomSelect
              id="srv-categoria"
              ariaLabelledBy="lbl-srv-categoria"
              value={form.categoria}
              onChange={(v) => {
                patchForm({ categoria: v });
                if (formErrors.categoria) setFormErrors((p) => ({ ...p, categoria: undefined }));
              }}
              options={[
                { value: '', label: 'Seleccionar' },
                ...categorias.map((c) => ({ value: c.Nombre, label: c.Nombre })),
              ]}
              hasError={!!formErrors.categoria}
            />
            {formErrors.categoria && <span className={styles.fieldError}>{formErrors.categoria}</span>}
          </div>

          {/* Local */}
          <div className={styles.field}>
            <label id="lbl-srv-local" htmlFor="srv-local">Local</label>
            {isEdit ? (
              <input
                id="srv-local"
                type="text"
                value={form.local}
                readOnly
                disabled
                title="El local no se puede modificar al editar"
              />
            ) : (
              <CustomSelect
                id="srv-local"
                ariaLabelledBy="lbl-srv-local"
                value={form.local}
                onChange={(v) => {
                  patchForm({ local: v });
                  if (formErrors.local) setFormErrors((p) => ({ ...p, local: undefined }));
                }}
                options={[
                  { value: '', label: 'Seleccionar' },
                  ...locales.map((l) => ({ value: l.nombre, label: l.nombre })),
                ]}
                hasError={!!formErrors.local}
              />
            )}
            {formErrors.local && <span className={styles.fieldError}>{formErrors.local}</span>}
          </div>

          {/* Tiempo */}
          <div className={styles.field}>
            <label htmlFor="srv-tiempo">Tiempo (Min)</label>
            <input
              id="srv-tiempo"
              type="number"
              min={1}
              value={form.tiempo}
              onChange={(e) => {
                patchForm({ tiempo: e.target.value });
                if (formErrors.tiempo) setFormErrors((p) => ({ ...p, tiempo: undefined }));
              }}
              placeholder="Ej: 60"
              aria-invalid={!!formErrors.tiempo}
              className={formErrors.tiempo ? styles.inputError : ''}
            />
            {formErrors.tiempo && <span className={styles.fieldError}>{formErrors.tiempo}</span>}
          </div>

          {/* Costo */}
          <div className={styles.field}>
            <label htmlFor="srv-costo">Costo</label>
            <input
              id="srv-costo"
              type="number"
              step="0.01"
              min={0}
              value={form.costo}
              onChange={(e) => {
                patchForm({ costo: e.target.value });
                if (formErrors.costo) setFormErrors((p) => ({ ...p, costo: undefined }));
              }}
              placeholder="0.00"
              aria-invalid={!!formErrors.costo}
              className={formErrors.costo ? styles.inputError : ''}
            />
            {formErrors.costo && <span className={styles.fieldError}>{formErrors.costo}</span>}
          </div>

          {/* Sesiones */}
          <div className={styles.field}>
            <label htmlFor="srv-sesiones">Sesiones</label>
            <input
              id="srv-sesiones"
              type="number"
              min={1}
              value={form.sesiones}
              onChange={(e) => {
                const n = Number(e.target.value);
                patchForm({ sesiones: Number.isFinite(n) ? n : 1 });
                if (formErrors.sesiones) setFormErrors((p) => ({ ...p, sesiones: undefined }));
              }}
              aria-invalid={!!formErrors.sesiones}
              className={formErrors.sesiones ? styles.inputError : ''}
            />
            {formErrors.sesiones && <span className={styles.fieldError}>{formErrors.sesiones}</span>}
          </div>

          {/* Tipo espacio */}
          <div className={styles.field}>
            <label id="lbl-srv-espacio" htmlFor="srv-espacio">Tipo espacio</label>
            <CustomSelect
              id="srv-espacio"
              ariaLabelledBy="lbl-srv-espacio"
              value={form.tipo_espacio_requerido}
              onChange={(v) => patchForm({ tipo_espacio_requerido: v })}
              options={[
                { value: 'M', label: 'Mesas' },
                { value: 'B', label: 'Bicicletas' },
              ]}
            />
          </div>

          {/* Requiere evaluación */}
          <div className={`${styles.field} ${styles.colSpan2}`}>
            <label className={styles.checkboxRow} htmlFor="srv-requiere-eval">
              <input
                id="srv-requiere-eval"
                type="checkbox"
                checked={form.requiere_evaluacion}
                onChange={(e) => patchForm({ requiere_evaluacion: e.target.checked })}
              />
              <span>Requiere evaluación previa antes de reservar</span>
            </label>
          </div>
        </div>

        {/* Submit error */}
        {formErrors.submit && (
          <div className={styles.submitError}>{formErrors.submit}</div>
        )}
      </FormModal>

      {/* ── Modal: Activar en otro local ── */}
      <FormModal
        isOpen={activarLocalRow !== null}
        onClose={closeActivarLocal}
        title={activarLocalRow ? `Activar "${activarLocalRow.nombre}" en otro local` : 'Activar en local'}
        onSubmit={handleActivarLocal}
        loading={activarLocalSaving}
        submitLabel="Activar"
      >
        <div className={styles.formGrid}>
          <div className={`${styles.field} ${styles.colSpan2}`}>
            <label id="lbl-act-local" htmlFor="act-local">Local destino</label>
            <CustomSelect
              id="act-local"
              ariaLabelledBy="lbl-act-local"
              value={activarLocalValue}
              onChange={setActivarLocalValue}
              options={[
                { value: '', label: 'Seleccionar local' },
                ...locales
                  .filter((l) => l.nombre !== activarLocalRow?.local)
                  .map((l) => ({ value: l.nombre, label: l.nombre })),
              ]}
            />
            <p className={styles.helpText}>
              El servicio quedará disponible también en el local seleccionado. No se modifica el local original.
            </p>
          </div>
        </div>
      </FormModal>
    </div>
  );
}