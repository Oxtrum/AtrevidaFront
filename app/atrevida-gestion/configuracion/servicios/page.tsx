'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import gsap from 'gsap';
import { Filter, Pencil, Plus, Scissors, Search, Trash2, X } from 'lucide-react';
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
  togglePacienteNuevo,
} from '@/lib/api/servicios';
import { useAdminLocalScopeState } from '@/lib/auth/useAdminLocalScope';
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
  visible_paciente_nuevo?: boolean;
}

interface CategoriaOption {
  id: number;
  nombre: string;
}

interface FormCategoriasState {
  local: string;
  categorias: CategoriaOption[];
  error: string | null;
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
  visible_paciente_nuevo: boolean;
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
  visible_paciente_nuevo: false,
};

// ─── Tiempo helpers ───────────────────────────────────────────────────────────

function getScopedLocales(
  locales: LocalOption[],
  workplace: { local_id: number; nombre_local: string } | null,
): LocalOption[] {
  if (!workplace) return locales;

  const scoped = locales.filter((local) =>
    local.id === workplace.local_id || local.nombre === workplace.nombre_local
  );

  return scoped.length > 0
    ? scoped
    : [{ id: workplace.local_id, nombre: workplace.nombre_local }];
}

function minutosATexto(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return h === 1 ? '1 hora' : `${h} horas`;
  return h === 1 ? `1 hora y ${m} min` : `${h} horas y ${m} min`;
}

function textoAMinutos(texto: string): number {
  const raw = Number(texto.trim());
  if (!isNaN(raw) && raw > 0) return raw;
  let total = 0;
  const horasMatch = texto.match(/(\d+)\s*hora/);
  const minsMatch = texto.match(/(\d+)\s*min/);
  if (horasMatch) total += parseInt(horasMatch[1], 10) * 60;
  if (minsMatch) total += parseInt(minsMatch[1], 10);
  return total || 0;
}

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
  const adminLocalScope = useAdminLocalScopeState();
  const scopedLocalName = adminLocalScope.workplace?.nombre_local ?? '';
  const effectiveFiltroLocal = scopedLocalName || filtroLocal;
  const hasScopedLocal = !!scopedLocalName;
  const hasFilter = adminLocalScope.ready && !!(effectiveFiltroLocal || filtroCategoria);

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
  const [formCategorias, setFormCategorias] = useState<FormCategoriasState>({
    local: '',
    categorias: [],
    error: null,
  });

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(FORM_INITIAL);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const isEdit = editingId !== null;
  const formCategoriasLoading = modalOpen && !!form.local && formCategorias.local !== form.local;
  const localOptions = useMemo(() => [
    ...(hasScopedLocal ? [] : [{ value: '', label: 'Seleccionar local' }]),
    ...locales.map((l) => ({ value: l.nombre, label: l.nombre })),
  ], [hasScopedLocal, locales]);
  const categoriaOptions = useMemo(() => {
    const categoriasDisponibles = formCategorias.local === form.local ? formCategorias.categorias : [];

    if (!form.local) {
      return [{ value: '', label: 'Elige un local primero', disabled: true }];
    }

    if (formCategoriasLoading) {
      return [{ value: '', label: 'Cargando categorías...', disabled: true }];
    }

    if (formCategorias.error && formCategorias.local === form.local) {
      return [{ value: '', label: 'No se cargaron categorías', disabled: true }];
    }

    if (categoriasDisponibles.length === 0) {
      return [{ value: '', label: 'Sin categorías para este local', disabled: true }];
    }

    return [
      { value: '', label: 'Seleccionar' },
      ...categoriasDisponibles.map((c) => ({ value: c.nombre, label: c.nombre })),
    ];
  }, [form.local, formCategorias.categorias, formCategorias.error, formCategorias.local, formCategoriasLoading]);

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
    if (!adminLocalScope.ready || (!effectiveFiltroLocal && !filtroCategoria)) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getServiciosDB({
        local: effectiveFiltroLocal || undefined,
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
  }, [adminLocalScope.ready, effectiveFiltroLocal, filtroCategoria, filtroNombreDebounced, filtroSesiones, filtroEvaluacion]);

  const fetchOptions = useCallback(async () => {
    if (!adminLocalScope.ready) return;

    try {
      const [catRes, locRes] = await Promise.all([
        getCategoriasDB() as Promise<{ data?: { categorias?: CategoriaOption[] } }>,
        getLocalesDB() as Promise<{ data?: { locales?: LocalOption[] } }>,
      ]);
      setCategorias(catRes?.data?.categorias ?? []);
      setLocales(getScopedLocales(locRes?.data?.locales ?? [], adminLocalScope.workplace));
    } catch (err) {
      console.error('fetchOptions', err);
      toast.error('No se cargaron categorías o locales');
    }
  }, [adminLocalScope.ready, adminLocalScope.workplace]);

  useEffect(() => {
    if (!adminLocalScope.ready) return;

    const token = localStorage.getItem('adminToken');
    if (!token) { router.push('/atrevida-gestion/login'); return; }
    fetchOptions();
  }, [adminLocalScope.ready, router, fetchOptions]);

  useEffect(() => {
    if (!modalOpen || !form.local) return;

    let cancelled = false;

    getCategoriasDB({ local: form.local })
      .then((res) => {
        if (cancelled) return;
        const data = res as { data?: { categorias?: CategoriaOption[] } };
        setFormCategorias({
          local: form.local,
          categorias: data.data?.categorias ?? [],
          error: null,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setFormCategorias({
          local: form.local,
          categorias: [],
          error: err instanceof Error ? err.message : 'No se cargaron categorías',
        });
      });

    return () => {
      cancelled = true;
    };
  }, [modalOpen, form.local]);

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
    setForm({ ...FORM_INITIAL, local: scopedLocalName });
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
      tiempo: String(textoAMinutos(String(row.tiempo ?? ''))),
      costo: String(row.costo ?? ''),
      sesiones: row.sesiones,
      tipo_espacio_requerido:
        row.tipoEspacio === 'Mesas' ? 'M'
        : row.tipoEspacio === 'Bicicletas' ? 'B'
        : (row.tipoEspacio || 'M'),
      local: row.local,
      requiere_evaluacion: row.requiere_evaluacion ?? false,
      visible_paciente_nuevo: row.visible_paciente_nuevo ?? false,
    });
    setModalOpen(true);
  };

  const validate = (): boolean => {
    const errors: FormErrors = {};
    if (!form.nombre.trim()) errors.nombre = 'El nombre es obligatorio';
    if (!form.categoria) errors.categoria = 'Selecciona una categoría';
    else if (
      form.local
      && formCategorias.local === form.local
      && !formCategorias.categorias.some((categoria) => categoria.nombre === form.categoria)
    ) {
      errors.categoria = 'Selecciona una categoría disponible para este local';
    }
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
    const tiempo = minutosATexto(Number(form.tiempo));

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
        const localForToggle = locales.find((l) => l.nombre === form.local);
        if (localForToggle) {
          await togglePacienteNuevo(editingId, localForToggle.id, form.visible_paciente_nuevo);
        }
        toast.success('Servicio actualizado correctamente');
      } else {
        await crearServicioDB({
          nombre: form.nombre.trim(),
          categoria: form.categoria,
          tiempo,
          costo,
          sesiones,
          tipo_espacio_requerido: form.tipo_espacio_requerido,
          local: scopedLocalName || form.local,
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

  const handleTogglePacienteNuevo = (row: ServicioRow) => {
    const local = locales.find((l) => l.nombre === row.local);
    if (!local) {
      toast.error('Local no encontrado');
      return;
    }
    const next = !row.visible_paciente_nuevo;
    const verb = next ? 'activar' : 'desactivar';
    setConfirmState({
      message: `¿Seguro que quieres ${verb} "${row.nombre}" para pacientes nuevos en ${row.local}?`,
      onConfirm: async () => {
        try {
          await togglePacienteNuevo(row.id, local.id, next);
          toast.success(next ? 'Visible para pacientes nuevos' : 'Oculto para pacientes nuevos');
          await fetchServicios();
        } catch (err) {
          if (err instanceof Error) console.error('togglePacienteNuevo', err);
          toast.error(`No se pudo ${verb} el servicio para pacientes nuevos.`);
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
    if (scopedLocalName) {
      toast.error('Tu sesiÃ³n estÃ¡ limitada a un local');
      return;
    }

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
      key: 'visible_paciente_nuevo',
      label: 'Pac. Nuevo',
      searchable: false,
      render: (_val, row) => (
        <button
          type="button"
          onClick={() => handleTogglePacienteNuevo(row)}
          className={row.visible_paciente_nuevo ? styles.statusActive : styles.statusInactive}
          aria-label={row.visible_paciente_nuevo ? 'Desactivar para pacientes nuevos' : 'Activar para pacientes nuevos'}
          title={row.visible_paciente_nuevo ? 'Clic para desactivar para pacientes nuevos' : 'Clic para activar para pacientes nuevos'}
        >
          {row.visible_paciente_nuevo ? 'Visible' : 'Oculto'}
        </button>
      ),
    },
    {
      key: 'acciones',
      label: '',
      searchable: false,
      render: (_val, row) => {
        const actions = [
          { label: 'Editar', icon: <Pencil size={12} strokeWidth={2} />, onClick: () => openEdit(row) },
          ...(!scopedLocalName
            ? [{ label: 'Activar local', icon: <Plus size={12} strokeWidth={2} />, onClick: () => openActivarLocal(row) }]
            : []),
          { label: 'Eliminar', icon: <Trash2 size={12} strokeWidth={2} />, onClick: () => handleDelete(row), variant: 'danger' as const, disabled: deletingId === row.id },
        ];

        return <RowActionsMenu actions={actions} />;
      },
    },
  ];

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div ref={containerRef} className={styles.pageContainer}>
      <div className="admin-mesh" />
      <Header />
      <main className={styles.main}>
        <div className={styles.container}>
          <PageHeader
          kicker="Configuración"
          kickerIcon={<Scissors size={14} strokeWidth={2} />}
          title="Servicios del Centro"
          accentWord="Servicios"
          subtitle="Configura los servicios ofrecidos por local"
          backHref="/atrevida-gestion/configuracion"
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
                    value={effectiveFiltroLocal}
                    onChange={(value) => setFiltroLocal(scopedLocalName || value)}
                    options={localOptions}
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
                      ...categorias.map((c) => ({ value: c.nombre, label: c.nombre })),
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
                  patchForm({ local: scopedLocalName || v, categoria: '' });
                  if (formErrors.local || formErrors.categoria) {
                    setFormErrors((p) => ({ ...p, local: undefined, categoria: undefined }));
                  }
                }}
                options={localOptions}
                hasError={!!formErrors.local}
              />
            )}
            {formErrors.local && <span className={styles.fieldError}>{formErrors.local}</span>}
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
              options={categoriaOptions}
              hasError={!!formErrors.categoria}
            />
            {!form.local && !isEdit && (
              <p className={styles.localFirstHint}>Elige un local para ver sus categorias.</p>
            )}
            {form.local && formCategoriasLoading && (
              <p className={styles.localFirstHint}>Cargando categorias de {form.local}...</p>
            )}
            {formErrors.categoria && <span className={styles.fieldError}>{formErrors.categoria}</span>}
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

          {/* Visible para pacientes nuevos */}
          {isEdit && (
            <label className={`${styles.checkboxCard} ${styles.colSpan2}`} htmlFor="srv-paciente-nuevo">
              <input
                id="srv-paciente-nuevo"
                type="checkbox"
                checked={form.visible_paciente_nuevo}
                onChange={(e) => patchForm({ visible_paciente_nuevo: e.target.checked })}
              />
              <div className={styles.checkboxCardContent}>
                <span className={styles.checkboxCardTitle}>Visible para pacientes nuevos</span>
                <span className={styles.checkboxCardDesc}>
                  Este servicio aparecerá en el formulario de reserva para clientes que se registran por primera vez.
                </span>
              </div>
            </label>
          )}

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
