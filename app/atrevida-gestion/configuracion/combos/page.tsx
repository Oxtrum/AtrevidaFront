'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import gsap from 'gsap';
import { Filter, Package2, ChevronRight, ChevronDown, Plus, Pencil, Trash2 } from 'lucide-react';
import Header from '@/components/AdminHeader/Header';
import { PageHeader, FormModal, RowActionsMenu } from '@/components/AdminConfig';
import { CustomSelect } from '@/components/Custom/CustomSelectAdmin';
import { toast } from '@/components/Shared/Toast';
import {
  getCombosDB,
  getLocalesDB,
  getServiciosDB,
  getComboServiciosDB,
  crearComboServicio,
  actualizarComboServicio,
  eliminarComboServicio,
} from '@/lib/api/servicios';
import styles from './page.module.css';

// ─── Types ───────────────────────────────────────────────────────

interface ServicioIncluido {
  nombre: string;
  tiempo: string;
  costo: string;
  sesiones: number;
}

interface ComboItem {
  id: number;
  nombre: string;
  categoria: string;
  local: string;
  costo_total: string;
  sesiones_totales: number;
  servicios_incluidos: ServicioIncluido[];
}

interface LocalOption {
  id: number;
  nombre: string;
}

interface ComboServicioDetalle {
  id: number;
  combo_id: number;
  combo_nombre: string;
  servicio_id?: number | null;
  servicio_texto?: string | null;
  servicio_nombre: string;
  tiempo: string;
  costo: number;
  sesiones: number;
  orden?: number;
}

interface ServicioOption {
  id: number;
  nombre: string;
  tiempo: string;
  costo: string;
  sesiones: number;
}

interface ComboServicioForm {
  servicio_id: number | null;
  tiempo: string;
  costo: string;
  sesiones: number;
  orden: string;
}

interface ComboServicioFormErrors {
  servicio_id?: string;
  tiempo?: string;
  costo?: string;
  sesiones?: string;
}

interface ConfirmState {
  message: string;
  onConfirm: () => void;
}

function formatTiempoMin(tiempo: string): string {
  if (!tiempo) return '—';
  if (tiempo.includes('min')) return tiempo;
  const match = tiempo.match(/^(\d{1,2}):(\d{2})$/);
  if (match) {
    const total = parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
    return `${total} min`;
  }
  return tiempo;
}

const SERVICIO_FORM_INITIAL: ComboServicioForm = {
  servicio_id: null,
  tiempo: '',
  costo: '',
  sesiones: 1,
  orden: '',
};

function minToHHMM(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function hhmmToMin(tiempo: string): string {
  if (!tiempo) return '';
  const match = tiempo.match(/^(\d{1,2}):(\d{2})$/);
  if (match) return String(parseInt(match[1], 10) * 60 + parseInt(match[2], 10));
  const n = parseInt(tiempo, 10);
  return Number.isFinite(n) ? String(n) : '';
}

// ─── Component ───────────────────────────────────────────────────

export default function CombosPage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Combo list state
  const [combos, setCombos] = useState<ComboItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locales, setLocales] = useState<LocalOption[]>([]);

  // Filters — local is required to trigger fetch
  const [filtroLocal, setFiltroLocal] = useState('');
  const [filtroNombre, setFiltroNombre] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroSesiones, setFiltroSesiones] = useState('');
  const [filtroNombreDebounced, setFiltroNombreDebounced] = useState('');
  const hasFilter = !!filtroLocal;

  // Expansion state — keyed by combo.nombre (API may omit id)
  const [expandedComboKey, setExpandedComboKey] = useState<string | null>(null);
  const [comboServicios, setComboServicios] = useState<Record<string, ComboServicioDetalle[]>>({});
  const [comboServiciosLoading, setComboServiciosLoading] = useState<Record<string, boolean>>({});

  // CRUD modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<number | null>(null);
  const [activeComboId, setActiveComboId] = useState<number | null>(null);
  const [activeComboKey, setActiveComboKey] = useState<string | null>(null);
  const [form, setForm] = useState<ComboServicioForm>(SERVICIO_FORM_INITIAL);
  const [formErrors, setFormErrors] = useState<ComboServicioFormErrors>({});
  const isEdit = editingServiceId !== null;

  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  // Service dropdown options for the add/edit modal
  const [servicioOptions, setServicioOptions] = useState<ServicioOption[]>([]);
  const [loadingServicioOptions, setLoadingServicioOptions] = useState(false);

  // ─── Debounce ─────────────────────────────────────────────────

  useEffect(() => {
    const timer = setTimeout(() => setFiltroNombreDebounced(filtroNombre), 350);
    return () => clearTimeout(timer);
  }, [filtroNombre]);

  // ─── Load servicio options when modal opens ────────────────────

  useEffect(() => {
    if (!modalOpen || !filtroLocal) return;
    setLoadingServicioOptions(true);
    getServiciosDB({ local: filtroLocal })
      .then((res) => {
        const data = res as { data?: { servicios?: ServicioOption[] } };
        setServicioOptions(data?.data?.servicios ?? []);
      })
      .catch(() => setServicioOptions([]))
      .finally(() => setLoadingServicioOptions(false));
  }, [modalOpen, filtroLocal]);

  const handleSelectServicio = (value: string) => {
    const id = value ? Number(value) : null;
    const svc = servicioOptions.find((s) => s.id === id);
    patchForm({
      servicio_id: id,
      tiempo: svc ? String(parseInt(svc.tiempo, 10) || '') : '',
      costo: svc ? String(svc.costo) : '',
      sesiones: svc?.sesiones ?? 1,
    });
    if (formErrors.servicio_id) setFormErrors((p) => ({ ...p, servicio_id: undefined }));
  };

  // ─── Data fetching ─────────────────────────────────────────────

  const fetchCombos = useCallback(async () => {
    if (!filtroLocal) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getCombosDB({
        local: filtroLocal,
        nombre: filtroNombreDebounced || undefined,
        categoria: filtroCategoria || undefined,
        sesiones: filtroSesiones ? Number(filtroSesiones) : undefined,
      }) as { data?: { combos?: ComboItem[]; total?: number } };
      setCombos(res?.data?.combos ?? []);
      setTotal(res?.data?.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar combos');
    } finally {
      setLoading(false);
    }
  }, [filtroLocal, filtroNombreDebounced, filtroCategoria, filtroSesiones]);

  const fetchLocales = useCallback(async () => {
    try {
      const res = await getLocalesDB() as { data?: { locales?: LocalOption[] } };
      setLocales(res?.data?.locales ?? []);
    } catch {
      // best-effort
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) { router.push('/atrevida-gestion/login'); return; }
    fetchLocales();
  }, [router, fetchLocales]);

  useEffect(() => {
    if (hasFilter) fetchCombos();
    else { setCombos([]); setTotal(0); }
  }, [fetchCombos, hasFilter]);

  // ─── Entry animation ───────────────────────────────────────────

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        contentRef.current,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out', clearProps: 'transform' },
      );
    }, containerRef);
    return () => ctx.revert();
  }, []);

  // ─── Expansion ────────────────────────────────────────────────

  const handleToggleExpand = useCallback(async (combo: ComboItem) => {
    const key = combo.nombre;
    if (expandedComboKey === key) {
      setExpandedComboKey(null);
      return;
    }
    setExpandedComboKey(key);
    if (comboServicios[key]) return; // already loaded

    // No combo.id → API call would hit /bd/combos/undefined/servicios → fallback to snapshot
    if (combo.id == null) {
      const fallback: ComboServicioDetalle[] = (combo.servicios_incluidos ?? []).map((s, i) => ({
        id: -(i + 1),
        combo_id: 0,
        combo_nombre: combo.nombre,
        servicio_nombre: s.nombre,
        servicio_texto: s.nombre,
        tiempo: s.tiempo,
        costo: parseFloat(s.costo) || 0,
        sesiones: s.sesiones,
      }));
      setComboServicios((prev) => ({ ...prev, [key]: fallback }));
      return;
    }

    setComboServiciosLoading((prev) => ({ ...prev, [key]: true }));
    try {
      const res = await getComboServiciosDB(combo.id) as {
        data?: { servicios?: ComboServicioDetalle[] };
      };
      setComboServicios((prev) => ({ ...prev, [key]: res?.data?.servicios ?? [] }));
    } catch {
      // Fallback to snapshot on API error
      const fallback: ComboServicioDetalle[] = (combo.servicios_incluidos ?? []).map((s, i) => ({
        id: -(i + 1),
        combo_id: 0,
        combo_nombre: combo.nombre,
        servicio_nombre: s.nombre,
        servicio_texto: s.nombre,
        tiempo: s.tiempo,
        costo: parseFloat(s.costo) || 0,
        sesiones: s.sesiones,
      }));
      setComboServicios((prev) => ({ ...prev, [key]: fallback }));
    } finally {
      setComboServiciosLoading((prev) => ({ ...prev, [key]: false }));
    }
  }, [expandedComboKey, comboServicios]);

  const reloadComboServicios = async (comboId: number, key: string) => {
    try {
      const res = await getComboServiciosDB(comboId) as {
        data?: { servicios?: ComboServicioDetalle[] };
      };
      setComboServicios((prev) => ({ ...prev, [key]: res?.data?.servicios ?? [] }));
    } catch {
      // best-effort
    }
  };

  // ─── CRUD handlers ────────────────────────────────────────────

  const patchForm = (patch: Partial<ComboServicioForm>) =>
    setForm((prev) => ({ ...prev, ...patch }));

  const resetModal = () => {
    setForm(SERVICIO_FORM_INITIAL);
    setFormErrors({});
    setEditingServiceId(null);
    setActiveComboId(null);
    setActiveComboKey(null);
  };

  const openAddServicio = (combo: ComboItem) => {
    resetModal();
    setActiveComboId(combo.id);
    setActiveComboKey(combo.nombre);
    setModalOpen(true);
  };

  const openEditServicio = (svc: ComboServicioDetalle) => {
    setEditingServiceId(svc.id);
    setActiveComboId(svc.combo_id);
    setActiveComboKey(svc.combo_nombre);
    setFormErrors({});
    setForm({
      servicio_id: svc.servicio_id ?? null,
      tiempo: hhmmToMin(svc.tiempo ?? ''),
      costo: String(svc.costo ?? ''),
      sesiones: svc.sesiones ?? 1,
      orden: svc.orden != null ? String(svc.orden) : '',
    });
    setModalOpen(true);
  };

  const validateForm = (): boolean => {
    const errors: ComboServicioFormErrors = {};
    if (form.servicio_id == null) errors.servicio_id = 'Selecciona un servicio';
    const tiempoNum = Number(form.tiempo);
    if (!form.tiempo || Number.isNaN(tiempoNum) || tiempoNum <= 0) errors.tiempo = 'Duración inválida (mínimo 1 min)';
    const costoNum = Number(form.costo);
    if (form.costo === '' || Number.isNaN(costoNum) || costoNum < 0) errors.costo = 'Costo inválido';
    if (!Number.isInteger(form.sesiones) || form.sesiones < 1) errors.sesiones = 'Mínimo 1 sesión';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitServicio = async () => {
    if (!validateForm()) return;
    if (activeComboId == null) {
      toast.error('El combo no tiene ID — operación no disponible (requiere actualización del backend).');
      return;
    }
    setSaving(true);
    setFormErrors({});
    const costo = Number(form.costo);
    const tiempo = minToHHMM(Number(form.tiempo));
    const orden = form.orden !== '' ? Number(form.orden) : undefined;

    try {
      if (isEdit && editingServiceId !== null) {
        await actualizarComboServicio(editingServiceId, {
          servicio_id: form.servicio_id ?? undefined,
          tiempo,
          costo,
          sesiones: form.sesiones,
          orden,
        });
        toast.success('Servicio actualizado');
      } else {
        await crearComboServicio({
          combo_id: activeComboId,
          servicio_id: form.servicio_id ?? undefined,
          tiempo,
          costo,
          sesiones: form.sesiones,
          orden,
        });
        toast.success('Servicio agregado al combo');
      }
      setModalOpen(false);
      resetModal();
      if (activeComboKey) await reloadComboServicios(activeComboId, activeComboKey);
    } catch (err) {
      if (err instanceof Error) console.error('comboServicio submit', err);
      toast.error(isEdit ? 'No se pudo actualizar el servicio.' : 'No se pudo agregar el servicio.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteServicio = (svc: ComboServicioDetalle) => {
    setConfirmState({
      message: `¿Eliminar "${svc.servicio_nombre || svc.servicio_texto}" del combo?`,
      onConfirm: async () => {
        try {
          await eliminarComboServicio(svc.id);
          toast.success('Servicio eliminado del combo');
          await reloadComboServicios(svc.combo_id, svc.combo_nombre);
        } catch (err) {
          if (err instanceof Error) console.error('eliminarComboServicio', err);
          toast.error('No se pudo eliminar el servicio.');
        }
      },
    });
  };

  // ─── Render ───────────────────────────────────────────────────

  return (
    <div ref={containerRef} className={styles.pageContainer}>
      <div className="admin-mesh" />
      <Header />
      <main className={styles.main}>
        <PageHeader
          title="Combos"
          subtitle="Visualiza combos y gestiona sus servicios incluidos"
          backHref="/atrevida-gestion/configuracion"
        />

        <div ref={contentRef} className={styles.contentStack}>

          {/* ── Filter card ── */}
          <div className={styles.filterCard}>
            <div className={styles.filterCardInner}>
              <div className={styles.filterSectionLabel}>
                <Filter size={12} />
                Filtros de búsqueda
              </div>
              <div className={styles.filterBar}>
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

                <div className={styles.filterGroup}>
                  <label htmlFor="filtro-nombre" className={styles.filterLabel}>Nombre</label>
                  <input
                    id="filtro-nombre"
                    type="text"
                    value={filtroNombre}
                    onChange={(e) => setFiltroNombre(e.target.value)}
                    placeholder="Buscar por nombre…"
                    disabled={!hasFilter}
                  />
                </div>

                <div className={styles.filterGroup}>
                  <label htmlFor="filtro-categoria" className={styles.filterLabel}>Categoría</label>
                  <input
                    id="filtro-categoria"
                    type="text"
                    value={filtroCategoria}
                    onChange={(e) => setFiltroCategoria(e.target.value)}
                    placeholder="Ej: Corporal"
                    disabled={!hasFilter}
                  />
                </div>

                <div className={styles.filterGroup}>
                  <label htmlFor="filtro-sesiones" className={styles.filterLabel}>Sesiones</label>
                  <input
                    id="filtro-sesiones"
                    type="number"
                    min={1}
                    value={filtroSesiones}
                    onChange={(e) => setFiltroSesiones(e.target.value)}
                    placeholder="Ej: 4"
                    disabled={!hasFilter}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Hint ── */}
          {!hasFilter && (
            <div className={styles.hint}>
              <div className={styles.hintIcon}>
                <Package2 size={20} strokeWidth={1.5} />
              </div>
              <p className={styles.hintText}>Selecciona un <strong>local</strong> para ver los combos</p>
              <p className={styles.hintSub}>Los combos disponibles para el local seleccionado aparecerán aquí.</p>
            </div>
          )}

          {/* ── Combo list ── */}
          {hasFilter && (
            <>
              {loading && <p className={styles.totalLabel}>Cargando…</p>}
              {error && (
                <p style={{ color: 'var(--admin-accent-danger)', fontSize: '0.82rem' }}>{error}</p>
              )}
              {!loading && !error && total > 0 && (
                <p className={styles.totalLabel}>
                  <strong>{total}</strong> combo{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}
                </p>
              )}
              {!loading && !error && combos.length === 0 && (
                <p className={styles.totalLabel}>No se encontraron combos con los filtros actuales.</p>
              )}

              <div className={styles.comboList}>
                {combos.map((combo) => {
                  const key = combo.nombre;
                  const isExpanded = expandedComboKey === key;
                  return (
                  <div
                    key={key}
                    className={`${styles.comboRow} ${isExpanded ? styles.comboRowExpanded : ''}`}
                  >
                    {/* ── Row header ── */}
                    <div
                      className={styles.comboRowHeader}
                      onClick={() => handleToggleExpand(combo)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && handleToggleExpand(combo)}
                      aria-expanded={isExpanded}
                    >
                      <span className={styles.comboName}>{combo.nombre}</span>
                      <span className={styles.comboMeta}>{combo.categoria}</span>
                      <span className={styles.comboBadge}>{combo.sesiones_totales} ses.</span>
                      <span className={styles.comboCosto}>{combo.costo_total} Bs.</span>
                      <button
                        type="button"
                        className={`${styles.expandToggle} ${isExpanded ? styles.expandToggleOpen : ''}`}
                        aria-label={isExpanded ? 'Cerrar' : 'Expandir'}
                        tabIndex={-1}
                      >
                        {isExpanded
                          ? <ChevronDown size={14} strokeWidth={2} />
                          : <ChevronRight size={14} strokeWidth={2} />
                        }
                      </button>
                    </div>

                    {/* ── Expanded servicios ── */}
                    {isExpanded && (
                      <div className={styles.serviciosSection}>
                        <div className={styles.serviciosSectionHeader}>
                          <span className={styles.serviciosSectionTitle}>Servicios incluidos</span>
                          {combo.id != null && (
                            <button
                              type="button"
                              className={styles.btnSm}
                              onClick={(e) => { e.stopPropagation(); openAddServicio(combo); }}
                            >
                              <Plus size={12} strokeWidth={2.2} />
                              Agregar
                            </button>
                          )}
                        </div>

                        {comboServiciosLoading[key] && (
                          <p className={styles.emptyServicios}>Cargando servicios…</p>
                        )}

                        {!comboServiciosLoading[key] && (comboServicios[key] ?? []).length === 0 && (
                          <p className={styles.emptyServicios}>Este combo no tiene servicios registrados.</p>
                        )}

                        {!comboServiciosLoading[key] && (comboServicios[key] ?? []).length > 0 && (
                          <table className={styles.serviciosTable}>
                            <thead>
                              <tr>
                                <th>Nombre</th>
                                <th>Tiempo</th>
                                <th>Costo</th>
                                <th>Sesiones</th>
                                <th></th>
                              </tr>
                            </thead>
                            <tbody>
                              {(comboServicios[key] ?? []).map((svc) => (
                                <tr key={svc.id}>
                                  <td className={styles.servicioNombre}>
                                    {svc.servicio_nombre || svc.servicio_texto || '—'}
                                  </td>
                                  <td>{formatTiempoMin(svc.tiempo)}</td>
                                  <td>{svc.costo} Bs.</td>
                                  <td>{svc.sesiones}</td>
                                  <td>
                                    {svc.id > 0 && (
                                      <RowActionsMenu actions={[
                                        {
                                          label: 'Editar',
                                          icon: <Pencil size={12} strokeWidth={2} />,
                                          onClick: () => openEditServicio(svc),
                                        },
                                        {
                                          label: 'Eliminar',
                                          icon: <Trash2 size={12} strokeWidth={2} />,
                                          onClick: () => handleDeleteServicio(svc),
                                          variant: 'danger' as const,
                                        },
                                      ]} />
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            </>
          )}

        </div>
      </main>

      {/* ── Modal: Agregar / Editar servicio ── */}
      <FormModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); resetModal(); }}
        title={isEdit ? 'Editar servicio del combo' : 'Agregar servicio al combo'}
        onSubmit={handleSubmitServicio}
        loading={saving}
        submitLabel={isEdit ? 'Guardar cambios' : 'Agregar servicio'}
      >
        <div className={styles.formGrid}>

          <div className={styles.formDivider}>
            <span className={styles.formDividerLabel}>Identificación</span>
          </div>

          <div className={`${styles.field} ${styles.colSpan2}`}>
            <label id="lbl-cs-servicio" htmlFor="cs-servicio">Servicio</label>
            <CustomSelect
              id="cs-servicio"
              ariaLabelledBy="lbl-cs-servicio"
              value={form.servicio_id != null ? String(form.servicio_id) : ''}
              onChange={handleSelectServicio}
              options={[
                { value: '', label: loadingServicioOptions ? 'Cargando servicios…' : 'Seleccionar servicio…' },
                ...servicioOptions.map((s) => ({ value: String(s.id), label: s.nombre })),
              ]}
              hasError={!!formErrors.servicio_id}
            />
            {formErrors.servicio_id && (
              <span className={styles.fieldError}>{formErrors.servicio_id}</span>
            )}
          </div>

          <div className={styles.formDivider}>
            <span className={styles.formDividerLabel}>Detalles</span>
          </div>

          <div className={styles.field}>
            <label htmlFor="cs-tiempo">Duración (min)</label>
            <input
              id="cs-tiempo"
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

          <div className={styles.field}>
            <label htmlFor="cs-costo">Costo (Bs.)</label>
            <input
              id="cs-costo"
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

          <div className={styles.field}>
            <label htmlFor="cs-sesiones">Sesiones</label>
            <input
              id="cs-sesiones"
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

          <div className={styles.field}>
            <label htmlFor="cs-orden">
              Orden{' '}
              <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(opcional)</span>
            </label>
            <input
              id="cs-orden"
              type="number"
              min={1}
              value={form.orden}
              onChange={(e) => patchForm({ orden: e.target.value })}
              placeholder="1"
            />
          </div>

        </div>
      </FormModal>

      {/* ── Confirm dialog ── */}
      <FormModal
        isOpen={confirmState !== null}
        onClose={() => setConfirmState(null)}
        title="Confirmar acción"
        onSubmit={() => { confirmState?.onConfirm(); setConfirmState(null); }}
        submitLabel="Confirmar"
      >
        <p style={{ color: 'var(--admin-foreground)', fontSize: '0.9rem', lineHeight: 1.6 }}>
          {confirmState?.message}
        </p>
      </FormModal>
    </div>
  );
}
