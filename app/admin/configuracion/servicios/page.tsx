'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import gsap from 'gsap';
import { Filter, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import Header from '@/components/AdminHeader/Header';
import { PageHeader, DataTable, FormModal, RowActionsMenu } from '@/components/AdminConfig';
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

interface ConfirmState {
  message: string;
  onConfirm: () => void;
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
  /** 'all' | 'true' | 'false' — filtro tri-estado */
  const [filtroEvaluacion, setFiltroEvaluacion] = useState<'all' | 'true' | 'false'>('all');
  const hasFilter = !!(filtroLocal || filtroCategoria);

  // Contar filtros secundarios activos para mostrar indicador
  const activeSecondaryFilters = [
    filtroNombre,
    filtroSesiones,
    filtroEvaluacion !== 'all' ? filtroEvaluacion : '',
  ].filter(Boolean).length;

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

  // ─── Confirm dialog ───────────────────────────────────────────────────────
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  // ─── Debounced nombre filter ──────────────────────────────────────────────
  const [filtroNombreDebounced, setFiltroNombreDebounced] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setFiltroNombreDebounced(filtroNombre), 350);
    return () => clearTimeout(timer);
  }, [filtroNombre]);

  // ─── Data fetching ───────────────────────────────────────────────────────────

  const fetchServicios = useCallback(async () => {
    if (!filtroLocal && !filtroCategoria) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getServiciosDB({
        local: filtroLocal || undefined,
        categoria: filtroCategoria || undefined,
        nombre: filtroNombreDebounced || undefined,
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
  }, [filtroLocal, filtroCategoria, filtroNombreDebounced, filtroSesiones, filtroEvaluacion]);

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
        { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out', clearProps: 'transform' }
      );
    }, containerRef);
    return () => ctx.revert();
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
          ? 'No se pudo actualizar el servicio.'
          : 'No se pudo crear el servicio.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActivo = (row: ServicioRow) => {
    const next = !(row.activo ?? true);
    const verb = next ? 'activar' : 'desactivar';
    setConfirmState({
      message: `¿Seguro que quieres ${verb} "${row.nombre}"?`,
      onConfirm: async () => {
        try {
          await actualizarServicio(row.id, { activo: next });
          toast.success(next ? 'Servicio activado' : 'Servicio desactivado');
          await fetchServicios();
        } catch (err) {
          if (err instanceof Error) console.error('actualizarServicio.activo', err);
          toast.error(`No se pudo ${verb} el servicio.`);
        }
      },
    });
  };

  const handleDelete = (row: ServicioRow) => {
    setConfirmState({
      message: `¿Eliminar el servicio "${row.nombre}"? Se hará borrado lógico.`,
      onConfirm: async () => {
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
      },
    });
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
        val === 'M' ? 'Mesas'
        : val === 'B' ? 'Bicicletas'
        : String(val),
    },
    {
      key: 'requiere_evaluacion',
      label: 'Evaluación',
      searchable: false,
      render: (_val, row) =>
        row.requiere_evaluacion ? (
          <span className={styles.evaluacionBadge}>Requerida</span>
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
            title={activo ? 'Clic para desactivar' : 'Clic para activar'}
          >
            {activo ? 'Activo' : 'Inactivo'}
          </button>
        );
      },
    },
    {
      key: 'acciones',
      label: '',
      searchable: false,
      render: (_val, row) => (
        <RowActionsMenu actions={[
          { label: 'Editar', icon: <Pencil size={12} strokeWidth={2} />, onClick: () => openEdit(row) },
          { label: 'Activar local', icon: <Plus size={12} strokeWidth={2} />, onClick: () => openActivarLocal(row) },
          { label: 'Eliminar', icon: <Trash2 size={12} strokeWidth={2} />, onClick: () => handleDelete(row), variant: 'danger', disabled: deletingId === row.id },
        ]} />
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
            <button className="admin-button admin-button-primary" onClick={openCreate}>
              <Plus size={16} strokeWidth={2.2} />
              Nuevo Servicio
            </button>
          }
        />

        <div ref={contentRef} className={styles.contentStack}>

          {/* ── Filter card ── */}
          <div className={styles.filterCard}>
            <div className={styles.filterCardInner}>
              <div className={styles.filterSectionLabel}>
                <Filter size={12} />
                Filtros de búsqueda
                {activeSecondaryFilters > 0 && (
                  <span className={styles.filterActiveChip}>
                    {activeSecondaryFilters} activo{activeSecondaryFilters !== 1 ? 's' : ''}
                    <button
                      type="button"
                      onClick={() => {
                        setFiltroNombre('');
                        setFiltroSesiones('');
                        setFiltroEvaluacion('all');
                      }}
                      aria-label="Limpiar filtros secundarios"
                    >
                      <X size={9} strokeWidth={2.5} />
                    </button>
                  </span>
                )}
              </div>

              <div className={styles.filterBar}>
                {/* Local — requerido */}
                <div className={styles.filterGroup}>
                  <label id="lbl-filtro-local" htmlFor="filtro-local" className={styles.filterLabel}>
                    Local
                  </label>
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

                {/* Categoría */}
                <div className={styles.filterGroup}>
                  <label id="lbl-filtro-categoria" htmlFor="filtro-categoria" className={styles.filterLabel}>
                    Categoría
                  </label>
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

                {/* Nombre — filtro servidor */}
                <div className={styles.filterGroup}>
                  <label htmlFor="filtro-nombre" className={styles.filterLabel}>
                    <Search size={10} strokeWidth={2} />
                    Nombre
                  </label>
                  <input
                    id="filtro-nombre"
                    type="text"
                    value={filtroNombre}
                    onChange={(e) => setFiltroNombre(e.target.value)}
                    placeholder="Buscar por nombre…"
                    disabled={!hasFilter}
                  />
                </div>

                {/* Sesiones */}
                <div className={styles.filterGroup}>
                  <label htmlFor="filtro-sesiones" className={styles.filterLabel}>
                    Sesiones
                  </label>
                  <input
                    id="filtro-sesiones"
                    type="number"
                    min={1}
                    value={filtroSesiones}
                    onChange={(e) => setFiltroSesiones(e.target.value)}
                    placeholder="Ej: 10"
                    disabled={!hasFilter}
                  />
                </div>

                {/* Evaluación */}
                <div className={styles.filterGroup}>
                  <label id="lbl-filtro-eval" htmlFor="filtro-eval" className={styles.filterLabel}>
                    Evaluación previa
                  </label>
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
          </div>

          {/* ── Hint ── */}
          {!hasFilter && (
            <div className={styles.hint}>
              <div className={styles.hintIcon}>
                <Filter size={20} strokeWidth={1.5} />
              </div>
              <p className={styles.hintText}>Selecciona un <strong>local</strong> o una <strong>categoría</strong></p>
              <p className={styles.hintSub}>Los servicios aparecerán aquí una vez que apliques al menos un filtro principal.</p>
            </div>
          )}

          {/* ── Tabla ── */}
          {hasFilter && (
            <>
              {total > 0 && (
                <p className={styles.totalLabel}>
                  <strong>{total}</strong> servicio{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}
                </p>
              )}
              <DataTable<ServicioRow>
                columns={columns}
                data={servicios}
                loading={loading}
                error={error}
                onRefresh={fetchServicios}
                getRowKey={(s) => s.id ?? `${s.nombre}-${s.local}-${s.categoria}`}
                searchPlaceholder="Filtrar resultados locales…"
                emptyMessage="No se encontraron servicios con los filtros actuales"
              />
            </>
          )}
        </div>
      </main>

      {/* ── Modal: Crear / Editar ── */}
      <FormModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); resetModal(); }}
        title={isEdit ? 'Editar Servicio' : 'Nuevo Servicio'}
        onSubmit={handleSubmit}
        loading={saving}
        submitLabel={isEdit ? 'Guardar cambios' : 'Crear servicio'}
      >
        <div className={styles.formGrid}>

          {/* ── Sección: Información básica ── */}
          <div className={styles.formDivider}>
            <span className={styles.formDividerLabel}>Información básica</span>
          </div>

          {/* Nombre */}
          <div className={`${styles.field} ${styles.colSpan2}`}>
            <label htmlFor="srv-nombre">Nombre del servicio</label>
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
                  { value: '', label: 'Seleccionar local' },
                  ...locales.map((l) => ({ value: l.nombre, label: l.nombre })),
                ]}
                hasError={!!formErrors.local}
              />
            )}
            {formErrors.local && <span className={styles.fieldError}>{formErrors.local}</span>}
          </div>

          {/* ── Sección: Detalles de sesión ── */}
          <div className={styles.formDivider}>
            <span className={styles.formDividerLabel}>Detalles de sesión</span>
          </div>

          {/* Tiempo */}
          <div className={styles.field}>
            <label htmlFor="srv-tiempo">Duración (min)</label>
            <input
              id="srv-tiempo"
              type="number"
              min={1}
              value={form.tiempo}
              onChange={(e) => {
                patchForm({ tiempo: e.target.value });
                if (formErrors.tiempo) setFormErrors((p) => ({ ...p, tiempo: undefined }));
              }}
              placeholder="60"
              aria-invalid={!!formErrors.tiempo}
              className={formErrors.tiempo ? styles.inputError : ''}
            />
            {formErrors.tiempo && <span className={styles.fieldError}>{formErrors.tiempo}</span>}
          </div>

          {/* Costo */}
          <div className={styles.field}>
            <label htmlFor="srv-costo">Costo (Bs.)</label>
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
            <label htmlFor="srv-sesiones">N.° de sesiones</label>
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
            <label id="lbl-srv-espacio" htmlFor="srv-espacio">Tipo de espacio</label>
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

          {/* ── Sección: Requisitos ── */}
          <div className={styles.formDivider}>
            <span className={styles.formDividerLabel}>Requisitos</span>
          </div>

          {/* Requiere evaluación — card estilo mejorado */}
          <label className={`${styles.checkboxCard} ${styles.colSpan2}`} htmlFor="srv-requiere-eval">
            <input
              id="srv-requiere-eval"
              type="checkbox"
              checked={form.requiere_evaluacion}
              onChange={(e) => patchForm({ requiere_evaluacion: e.target.checked })}
            />
            <div className={styles.checkboxCardContent}>
              <span className={styles.checkboxCardTitle}>Requiere evaluación previa</span>
              <span className={styles.checkboxCardDesc}>
                El cliente deberá completar una evaluación antes de poder reservar este servicio.
              </span>
            </div>
          </label>

        </div>

        {formErrors.submit && (
          <div className={styles.submitError}>{formErrors.submit}</div>
        )}
      </FormModal>

      {/* ── Modal: Confirmar acción ── */}
      <FormModal
        isOpen={confirmState !== null}
        onClose={() => setConfirmState(null)}
        title="Confirmar acción"
        onSubmit={() => {
          confirmState?.onConfirm();
          setConfirmState(null);
        }}
        submitLabel="Confirmar"
      >
        <p style={{ color: 'var(--admin-foreground)', fontSize: '0.9rem', lineHeight: 1.6 }}>
          {confirmState?.message}
        </p>
      </FormModal>

      {/* ── Modal: Activar en otro local ── */}
      <FormModal
        isOpen={activarLocalRow !== null}
        onClose={closeActivarLocal}
        title={activarLocalRow ? `Activar en otro local` : 'Activar en local'}
        onSubmit={handleActivarLocal}
        loading={activarLocalSaving}
        submitLabel="Activar servicio"
      >
        {activarLocalRow && (
          <div className={styles.formGrid}>
            {/* Chip con el servicio de origen */}
            <div className={`${styles.field} ${styles.colSpan2}`}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 0.875rem',
                borderRadius: 'var(--admin-radius-md)',
                background: 'rgba(236, 0, 140, 0.06)',
                border: '1px solid rgba(236, 0, 140, 0.2)',
                fontSize: '0.8rem',
                color: 'var(--admin-foreground)',
              }}>
                <span style={{ color: '#EC008C', fontWeight: 700 }}>Servicio:</span>
                <span style={{ fontWeight: 500 }}>{activarLocalRow.nombre}</span>
                <span style={{ marginLeft: 'auto', color: 'var(--admin-text-dim)', fontSize: '0.72rem' }}>
                  Local actual: {activarLocalRow.local}
                </span>
              </div>
            </div>

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
                El servicio quedará disponible también en el local seleccionado sin modificar el original.
              </p>
            </div>
          </div>
        )}
      </FormModal>
    </div>
  );
}