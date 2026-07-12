'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  getComboServiciosDB,
} from '@/lib/api/servicios';
import { eliminarCombo } from '@/lib/api/combos';
import { useAdminLocalScopeState } from '@/lib/auth/useAdminLocalScope';
import ComboFormModal, { type EditableCombo } from './ComboFormModal';
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
  descripcion?: string;
  categoria: string;
  categoria_id?: number;
  tipo_precio?: 'POR_ITEMS' | 'PRECIO_PAQUETE';
  precio_paquete?: number;
  moneda?: string;
  local: string;
  costo_total: string;
  sesiones_totales: number;
  duracion_min?: number;
  locales?: { id: number; nombre: string }[];
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

interface ConfirmState {
  message: string;
  onConfirm: () => void;
}

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
  const adminLocalScope = useAdminLocalScopeState();
  const scopedLocalName = adminLocalScope.workplace?.nombre_local ?? '';
  const effectiveFiltroLocal = scopedLocalName || filtroLocal;
  const hasScopedLocal = !!scopedLocalName;
  const hasFilter = adminLocalScope.ready && !!effectiveFiltroLocal;
  const localOptions = useMemo(() => [
    ...(hasScopedLocal ? [] : [{ value: '', label: 'Seleccionar local' }]),
    ...locales.map((l) => ({ value: l.nombre, label: l.nombre })),
  ], [hasScopedLocal, locales]);

  // Expansion state — keyed by combo.nombre (API may omit id)
  const [expandedComboKey, setExpandedComboKey] = useState<string | null>(null);
  const [comboServicios, setComboServicios] = useState<Record<string, ComboServicioDetalle[]>>({});
  const [comboServiciosLoading, setComboServiciosLoading] = useState<Record<string, boolean>>({});

  // CRUD modal state
  const [comboModalOpen, setComboModalOpen] = useState(false);
  const [comboModalMode, setComboModalMode] = useState<'crear' | 'editar'>('crear');
  const [editingCombo, setEditingCombo] = useState<EditableCombo | null>(null);

  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  // ─── Debounce ─────────────────────────────────────────────────

  useEffect(() => {
    const timer = setTimeout(() => setFiltroNombreDebounced(filtroNombre), 350);
    return () => clearTimeout(timer);
  }, [filtroNombre]);

  // ─── Data fetching ─────────────────────────────────────────────

  const fetchCombos = useCallback(async () => {
    if (!adminLocalScope.ready || !effectiveFiltroLocal) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getCombosDB({
        local: effectiveFiltroLocal,
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
  }, [adminLocalScope.ready, effectiveFiltroLocal, filtroNombreDebounced, filtroCategoria, filtroSesiones]);

  const fetchLocales = useCallback(async () => {
    if (!adminLocalScope.ready) return;

    try {
      const res = await getLocalesDB() as { data?: { locales?: LocalOption[] } };
      setLocales(getScopedLocales(res?.data?.locales ?? [], adminLocalScope.workplace));
    } catch {
      // best-effort
    }
  }, [adminLocalScope.ready, adminLocalScope.workplace]);

  useEffect(() => {
    if (!adminLocalScope.ready) return;

    const token = localStorage.getItem('adminToken');
    if (!token) { router.push('/atrevida-gestion/login'); return; }
    fetchLocales();
  }, [adminLocalScope.ready, router, fetchLocales]);

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

  const openCrearCombo = () => {
    setComboModalMode('crear');
    setEditingCombo(null);
    setComboModalOpen(true);
  };

  const openEditarCombo = (combo: ComboItem) => {
    setComboModalMode('editar');
    setEditingCombo({
      id: combo.id,
      nombre: combo.nombre,
      descripcion: combo.descripcion,
      categoria_id: combo.categoria_id,
      precio_paquete: combo.precio_paquete,
      moneda: combo.moneda,
      sesiones_totales: combo.sesiones_totales,
      duracion_min: combo.duracion_min,
      locales: combo.locales,
    });
    setComboModalOpen(true);
  };

  const handleDeleteCombo = (combo: ComboItem) => {
    setConfirmState({
      message: `¿Eliminar el paquete "${combo.nombre}"?`,
      onConfirm: async () => {
        try {
          await eliminarCombo(combo.id);
          toast.success('Paquete eliminado');
          fetchCombos();
        } catch (err) {
          if (err instanceof Error) console.error('eliminarCombo', err);
          toast.error('No se pudo eliminar el paquete.');
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
        <div className={styles.container}>
          <PageHeader
          kicker="Configuración"
          kickerIcon={<Package2 size={14} strokeWidth={2} />}
          title="Paquetes"
          accentWord="Paquetes"
          subtitle="Crea y edita paquetes, y gestiona los servicios que incluyen"
          backHref="/atrevida-gestion/configuracion"
          actions={
            <button type="button" className={styles.btnPrimary} onClick={openCrearCombo}>
              <Plus size={14} strokeWidth={2.2} />
              Nuevo paquete
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
              </div>
              <div className={styles.filterBar}>
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

          <div className={styles.resultsCard}>
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
                    <strong>{total}</strong> paquete{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}
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
                      <div className={styles.comboMain}>
                        <span className={styles.comboName}>{combo.nombre}</span>
                        <span className={styles.comboMeta}>{combo.categoria}</span>
                      </div>
                      <span className={styles.comboBadge}>
                        {combo.sesiones_totales} ses.{combo.duracion_min ? ` · ${combo.duracion_min} min` : ''}
                      </span>
                      <span className={styles.comboCosto}>{combo.costo_total} Bs.</span>
                      <span className={styles.comboActions} onClick={(e) => e.stopPropagation()}>
                        <RowActionsMenu actions={[
                          {
                            label: 'Editar paquete',
                            icon: <Pencil size={12} strokeWidth={2} />,
                            onClick: () => openEditarCombo(combo),
                          },
                          {
                            label: 'Eliminar paquete',
                            icon: <Trash2 size={12} strokeWidth={2} />,
                            onClick: () => handleDeleteCombo(combo),
                            variant: 'danger' as const,
                          },
                        ]} />
                      </span>
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
                                <th>Servicio</th>
                                <th>Costo</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(comboServicios[key] ?? []).map((svc) => (
                                <tr key={svc.id}>
                                  <td className={styles.servicioNombre}>
                                    {svc.servicio_nombre || svc.servicio_texto || '—'}
                                  </td>
                                  <td>{svc.costo} Bs.</td>
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

        </div>
        </div>
      </main>

      {/* ── Modal: Crear / Editar combo ── */}
      <ComboFormModal
        open={comboModalOpen}
        mode={comboModalMode}
        combo={editingCombo}
        locales={locales}
        onClose={() => setComboModalOpen(false)}
        onSaved={() => {
          // Invalida el cache de servicios expandidos para reflejar cambios recién guardados.
          setComboServicios({});
          setExpandedComboKey(null);
          fetchCombos();
        }}
      />

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
