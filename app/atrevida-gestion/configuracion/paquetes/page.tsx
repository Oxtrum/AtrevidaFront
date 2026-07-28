'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Filter, Layers, MapPin, Package2, Plus, Pencil, Trash2 } from 'lucide-react';
import Header from '@/components/AdminHeader/Header';
import { PageHeader, FormModal, RowActionsMenu } from '@/components/AdminConfig';
import { CustomSelect } from '@/components/Custom/CustomSelectAdmin';
import { toast } from '@/components/Shared/Toast';
import { getLocalesDB } from '@/lib/api/servicios';
import { getPaquetesDB, eliminarPaquete, type PaqueteDetalle } from '@/lib/api/paquetes';
import { useAdminLocalScopeState } from '@/lib/auth/useAdminLocalScope';
import PaqueteFormModal, { type EditablePaquete } from './PaqueteFormModal';
import styles from './page.module.css';

interface LocalOption {
  id: number;
  nombre: string;
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

export default function PaquetesPage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const [paquetes, setPaquetes] = useState<PaqueteDetalle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locales, setLocales] = useState<LocalOption[]>([]);

  const [filtroLocal, setFiltroLocal] = useState('');
  const [filtroNombre, setFiltroNombre] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroNombreDebounced, setFiltroNombreDebounced] = useState('');
  const adminLocalScope = useAdminLocalScopeState();
  const scopedLocalName = adminLocalScope.workplace?.nombre_local ?? '';
  const effectiveFiltroLocal = scopedLocalName || filtroLocal;
  const hasScopedLocal = !!scopedLocalName;
  const hasFilter = adminLocalScope.ready;

  const localOptions = useMemo(() => [
    ...(hasScopedLocal ? [] : [{ value: '', label: 'Todas las sucursales' }]),
    ...locales.map((l) => ({ value: l.nombre, label: l.nombre })),
  ], [hasScopedLocal, locales]);

  const [paqueteModalOpen, setPaqueteModalOpen] = useState(false);
  const [paqueteModalMode, setPaqueteModalMode] = useState<'crear' | 'editar'>('crear');
  const [editingPaquete, setEditingPaquete] = useState<EditablePaquete | null>(null);

  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setFiltroNombreDebounced(filtroNombre), 350);
    return () => clearTimeout(timer);
  }, [filtroNombre]);

  const fetchPaquetes = useCallback(async () => {
    if (!adminLocalScope.ready) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getPaquetesDB({
        local: effectiveFiltroLocal || undefined,
        nombre: filtroNombreDebounced || undefined,
        categoria: filtroCategoria || undefined,
        activo: true,
      });
      setPaquetes(res?.data?.paquetes ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar paquetes');
    } finally {
      setLoading(false);
    }
  }, [adminLocalScope.ready, effectiveFiltroLocal, filtroNombreDebounced, filtroCategoria]);

  const fetchLocales = useCallback(async () => {
    if (!adminLocalScope.ready) return;
    try {
      const res = await getLocalesDB() as { data?: { locales?: LocalOption[] } };
      setLocales(getScopedLocales(res?.data?.locales ?? [], adminLocalScope.workplace));
    } catch {}
  }, [adminLocalScope.ready, adminLocalScope.workplace]);

  useEffect(() => {
    if (!adminLocalScope.ready) return;
    const token = localStorage.getItem('adminToken');
    if (!token) { router.push('/atrevida-gestion/login'); return; }
    fetchLocales();
  }, [adminLocalScope.ready, router, fetchLocales]);

  useEffect(() => {
    if (hasFilter) fetchPaquetes();
    else { setPaquetes([]); }
  }, [fetchPaquetes, hasFilter]);

  const openCrear = () => {
    setPaqueteModalMode('crear');
    setEditingPaquete(null);
    setPaqueteModalOpen(true);
  };

  const openEditar = (p: PaqueteDetalle) => {
    setPaqueteModalMode('editar');
    setEditingPaquete(p);
    setPaqueteModalOpen(true);
  };

  const handleDelete = (p: PaqueteDetalle) => {
    setConfirmState({
      message: `¿Eliminar el paquete "${p.paquete.nombre}"?`,
      onConfirm: async () => {
        try {
          await eliminarPaquete(p.paquete.id);
          toast.success('Paquete eliminado');
          fetchPaquetes();
        } catch {
          toast.error('No se pudo eliminar el paquete.');
        }
      },
    });
  };

  const cardActions = (p: PaqueteDetalle) => [
    { label: 'Editar', icon: <Pencil size={12} strokeWidth={2} />, onClick: () => openEditar(p) },
    { label: 'Eliminar', icon: <Trash2 size={12} strokeWidth={2} />, onClick: () => handleDelete(p), variant: 'danger' as const },
  ];

  return (
    <div ref={containerRef} className={styles.pageContainer}>
      <div className="admin-mesh" />
      <Header />
      <main className={styles.main}>
        <div className={styles.container}>
          <PageHeader
            kicker="Configuración"
            kickerIcon={<Package2 size={14} strokeWidth={2} />}
            title="Catálogo de Paquetes"
            accentWord="Paquetes"
            subtitle="Crea y edita paquetes, y gestiona sus tiers de sesiones"
            backHref="/atrevida-gestion/configuracion"
            actions={
              <button type="button" className={styles.btnPrimary} onClick={openCrear}>
                <Plus size={14} strokeWidth={2.2} />
                Nuevo paquete
              </button>
            }
          />

          <div ref={contentRef} className={styles.contentStack}>
            <div className={styles.filterCard}>
              <div className={styles.filterCardInner}>
                <div className={styles.filterSectionLabel}>
                  <Filter size={12} />
                  Filtros de búsqueda
                </div>
                <div className={styles.filterBar}>
                  <div className={styles.filterGroup}>
                    <label id="lbl-filtro-local" htmlFor="filtro-local" className={styles.filterLabel}>Local</label>
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
                    <input id="filtro-nombre" type="text" value={filtroNombre} onChange={(e) => setFiltroNombre(e.target.value)} placeholder="Buscar por nombre…" disabled={!hasFilter} />
                  </div>
                  <div className={styles.filterGroup}>
                    <label htmlFor="filtro-categoria" className={styles.filterLabel}>Categoría</label>
                    <input id="filtro-categoria" type="text" value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} placeholder="Ej: Corporal" disabled={!hasFilter} />
                  </div>
                </div>
              </div>
            </div>

            {loading ? (
              <div className={styles.grid} aria-busy="true">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className={styles.cardSkeleton} />
                ))}
              </div>
            ) : error ? (
              <div className={styles.stateBox}>
                <div className={styles.hintIcon}><Package2 size={22} strokeWidth={1.8} /></div>
                <p className={styles.hintText}>{error}</p>
                <button type="button" className={styles.btnSm} onClick={fetchPaquetes}>Reintentar</button>
              </div>
            ) : paquetes.length === 0 ? (
              <div className={styles.stateBox}>
                <div className={styles.hintIcon}><Package2 size={22} strokeWidth={1.8} /></div>
                <p className={styles.hintText}>No hay paquetes que coincidan</p>
                <p className={styles.hintSub}>Ajusta los filtros o crea un nuevo paquete.</p>
              </div>
            ) : (
              <>
                <div className={styles.totalLabel}>
                  {paquetes.length} {paquetes.length === 1 ? 'paquete' : 'paquetes'}
                </div>
                <div className={styles.grid}>
                  {paquetes.map((p) => {
                    const localesText = p.locales?.map((l) => l.nombre).join(' · ') ?? '';
                    const serviciosBase = p.servicios_base ?? [];
                    const serviciosVisibles = serviciosBase.slice(0, 4);
                    const serviciosRestantes = serviciosBase.length - serviciosVisibles.length;
                    const tiers = p.tiers ?? [];
                    return (
                      <article
                        key={p.paquete.id}
                        className={styles.card}
                        role="button"
                        tabIndex={0}
                        onClick={() => openEditar(p)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openEditar(p); }
                        }}
                      >
                        <div className={styles.cardPlaceholder}>
                          <Package2 size={42} strokeWidth={1.2} />
                        </div>
                        <div className={styles.cardOverlay} />

                        <div className={styles.cardTopRow}>
                          {p.paquete.categoria ? (
                            <span className={styles.cardTag}>{p.paquete.categoria}</span>
                          ) : <span />}
                          <div className={styles.cardActions} onClick={(e) => e.stopPropagation()}>
                            <RowActionsMenu actions={cardActions(p)} />
                          </div>
                        </div>

                        <div className={styles.cardBody}>
                          <h3 className={styles.cardTitle}>{p.paquete.nombre}</h3>
                          {serviciosVisibles.length > 0 && (
                            <p className={styles.cardDesc}>
                              {serviciosVisibles.map((s) => s.servicio_texto || '—').join(' · ')}
                              {serviciosRestantes > 0 ? ` +${serviciosRestantes} más` : ''}
                            </p>
                          )}
                          {tiers.length > 0 && (
                            <div className={styles.tiersRow}>
                              {tiers.map((t) => (
                                <span key={t.id ?? `${t.sesiones_totales}-${t.precio_final}`} className={styles.tierChip}>
                                  <Layers size={11} strokeWidth={2} />
                                  {t.sesiones_totales} ses · {t.precio_final} Bs
                                </span>
                              ))}
                            </div>
                          )}
                          {localesText && (
                            <span className={styles.cardLocale}>
                              <MapPin size={12} strokeWidth={2} />
                              {localesText}
                            </span>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      <PaqueteFormModal
        open={paqueteModalOpen}
        mode={paqueteModalMode}
        paquete={editingPaquete}
        locales={locales}
        onClose={() => setPaqueteModalOpen(false)}
        onSaved={fetchPaquetes}
      />

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
