'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Filter, Package2, Plus, Pencil, Trash2 } from 'lucide-react';
import Header from '@/components/AdminHeader/Header';
import { PageHeader, DataTable, FormModal, RowActionsMenu } from '@/components/AdminConfig';
import type { Column } from '@/components/AdminConfig';
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
  precio_final?: number;
  sesiones_totales: number;
  imagen_url?: string;
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
  sesion_numero?: number;
  orden?: number;
}

interface ComboRow extends ComboItem, Record<string, unknown> {}

function agruparPorSesion(servicios: ComboServicioDetalle[]) {
  const map = new Map<number, ComboServicioDetalle[]>();
  for (const s of servicios) {
    const n = s.sesion_numero ?? 1;
    (map.get(n) ?? map.set(n, []).get(n)!).push(s);
  }
  return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([numero, servs]) => ({ numero, servs }));
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

export default function CombosPage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const [combos, setCombos] = useState<ComboRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locales, setLocales] = useState<LocalOption[]>([]);

  const [filtroLocal, setFiltroLocal] = useState('');
  const [filtroNombre, setFiltroNombre] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroSesiones, setFiltroSesiones] = useState('');
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

  const [comboModalOpen, setComboModalOpen] = useState(false);
  const [comboModalMode, setComboModalMode] = useState<'crear' | 'editar'>('crear');
  const [editingCombo, setEditingCombo] = useState<EditableCombo | null>(null);

  const [detalleCombo, setDetalleCombo] = useState<ComboRow | null>(null);
  const [detalleServicios, setDetalleServicios] = useState<ComboServicioDetalle[]>([]);
  const [detalleLoading, setDetalleLoading] = useState(false);

  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setFiltroNombreDebounced(filtroNombre), 350);
    return () => clearTimeout(timer);
  }, [filtroNombre]);

  const fetchCombos = useCallback(async () => {
    if (!adminLocalScope.ready) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getCombosDB({
        local: effectiveFiltroLocal || undefined,
        nombre: filtroNombreDebounced || undefined,
        categoria: filtroCategoria || undefined,
        sesiones: filtroSesiones ? Number(filtroSesiones) : undefined,
      }) as { data?: { combos?: ComboItem[]; total?: number } };
      setCombos((res?.data?.combos ?? []) as unknown as ComboRow[]);
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
    } catch {}
  }, [adminLocalScope.ready, adminLocalScope.workplace]);

  const loadDetalle = useCallback(async (combo: ComboRow) => {
    setDetalleCombo(combo);
    setDetalleLoading(true);
    try {
      if (combo.id != null) {
        const res = await getComboServiciosDB(combo.id) as {
          data?: { servicios?: ComboServicioDetalle[] };
        };
        setDetalleServicios(res?.data?.servicios ?? []);
      } else {
        const fallback: ComboServicioDetalle[] = (combo.servicios_incluidos ?? []).map((s, i) => ({
          id: -(i + 1), combo_id: 0, combo_nombre: combo.nombre,
          servicio_nombre: s.nombre, servicio_texto: s.nombre,
          tiempo: s.tiempo, costo: parseFloat(s.costo) || 0, sesiones: s.sesiones,
        }));
        setDetalleServicios(fallback);
      }
    } catch {
      const fallback: ComboServicioDetalle[] = (combo.servicios_incluidos ?? []).map((s, i) => ({
        id: -(i + 1), combo_id: 0, combo_nombre: combo.nombre,
        servicio_nombre: s.nombre, servicio_texto: s.nombre,
        tiempo: s.tiempo, costo: parseFloat(s.costo) || 0, sesiones: s.sesiones,
      }));
      setDetalleServicios(fallback);
    } finally {
      setDetalleLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!adminLocalScope.ready) return;
    const token = localStorage.getItem('adminToken');
    if (!token) { router.push('/atrevida-gestion/login'); return; }
    fetchLocales();
  }, [adminLocalScope.ready, router, fetchLocales]);

  useEffect(() => {
    if (hasFilter) fetchCombos();
    else { setCombos([]); }
  }, [fetchCombos, hasFilter]);

  const openCrear = () => {
    setComboModalMode('crear');
    setEditingCombo(null);
    setComboModalOpen(true);
  };

  const openEditar = (combo: ComboRow) => {
    setComboModalMode('editar');
    setEditingCombo({
      id: combo.id,
      nombre: combo.nombre,
      descripcion: combo.descripcion,
      categoria_id: combo.categoria_id,
      precio_paquete: combo.precio_paquete,
      moneda: combo.moneda,
      sesiones_totales: combo.sesiones_totales,
      imagen_url: combo.imagen_url,
      locales: combo.locales,
    });
    setComboModalOpen(true);
  };

  const handleDelete = (combo: ComboRow) => {
    setConfirmState({
      message: `¿Eliminar el paquete "${combo.nombre}"?`,
      onConfirm: async () => {
        try {
          await eliminarCombo(combo.id);
          toast.success('Paquete eliminado');
          fetchCombos();
        } catch {
          toast.error('No se pudo eliminar el paquete.');
        }
      },
    });
  };

  const columns: Column<ComboRow>[] = [
    {
      key: 'imagen_url',
      label: '',
      searchable: false,
      render: (_v, row) => (
        <div style={{
          width: 44, height: 44, flexShrink: 0, borderRadius: 'var(--admin-radius-md)',
          overflow: 'hidden', display: 'grid', placeItems: 'center',
          background: 'rgba(255,255,255,0.04)', border: '1px solid var(--admin-border-subtle)',
        }}>
          {row.imagen_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={row.imagen_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <Package2 size={16} strokeWidth={1.8} style={{ color: 'var(--admin-text-dim)' }} />
          )}
        </div>
      ),
    },
    { key: 'nombre', label: 'Nombre' },
    { key: 'categoria', label: 'Categoría' },
    {
      key: 'locales_display',
      label: 'Locales',
      searchable: false,
      render: (_v, row) => {
        const names = row.locales?.map((l) => l.nombre).join(', ') ?? row.local ?? '—';
        return <span>{names}</span>;
      },
    },
    {
      key: 'sesiones_totales',
      label: 'Sesiones',
      searchable: false,
    },
    {
      key: 'precio_final',
      label: 'Precio',
      searchable: false,
      render: (_v, row) => <span>{row.precio_final != null ? `${row.precio_final} Bs.` : '—'}</span>,
    },
    {
      key: 'acciones',
      label: '',
      searchable: false,
      render: (_v, row) => (
        <RowActionsMenu actions={[
          { label: 'Ver detalle', icon: <Eye size={12} strokeWidth={2} />, onClick: () => loadDetalle(row) },
          { label: 'Editar', icon: <Pencil size={12} strokeWidth={2} />, onClick: () => openEditar(row) },
          { label: 'Eliminar', icon: <Trash2 size={12} strokeWidth={2} />, onClick: () => handleDelete(row), variant: 'danger' },
        ]} />
      ),
    },
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
            subtitle="Crea y edita paquetes, y gestiona los servicios que incluyen"
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
                  <div className={styles.filterGroup}>
                    <label htmlFor="filtro-sesiones" className={styles.filterLabel}>Sesiones</label>
                    <input id="filtro-sesiones" type="number" min={1} value={filtroSesiones} onChange={(e) => setFiltroSesiones(e.target.value)} placeholder="Ej: 4" disabled={!hasFilter} />
                  </div>
                </div>
              </div>
            </div>

            <DataTable<ComboRow>
              columns={columns}
              data={combos}
              loading={loading}
              error={error}
              onRefresh={fetchCombos}
              getRowKey={(c) => c.id ?? c.nombre}
              searchPlaceholder="Buscar por nombre..."
              emptyMessage="No hay paquetes que coincidan"
            />
          </div>
        </div>
      </main>

      <FormModal
        isOpen={detalleCombo !== null}
        onClose={() => { setDetalleCombo(null); setDetalleServicios([]); }}
        title={detalleCombo?.nombre ?? 'Detalle del paquete'}
        onSubmit={() => { setDetalleCombo(null); setDetalleServicios([]); }}
        submitLabel="Cerrar"
      >
        {detalleLoading ? (
          <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.9rem' }}>Cargando servicios…</p>
        ) : detalleServicios.length === 0 ? (
          <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.9rem' }}>Este paquete no tiene servicios registrados.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {agruparPorSesion(detalleServicios).map((ses) => (
              <div key={ses.numero} style={{
                display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                padding: '0.6rem 0.75rem', borderRadius: 'var(--admin-radius-md)',
                background: 'rgba(255,255,255,0.02)', border: '1px solid var(--admin-border-subtle)',
              }}>
                <span style={{
                  flexShrink: 0, padding: '0.15rem 0.55rem', borderRadius: '9999px',
                  fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase',
                  color: '#EC008C', background: 'rgba(236,0,140,0.1)',
                  border: '1px solid rgba(236,0,140,0.25)',
                }}>
                  Sesión {ses.numero}
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  {ses.servs.map((svc) => (
                    <span key={svc.id} style={{
                      padding: '0.2rem 0.6rem', borderRadius: '9999px',
                      fontSize: '0.75rem', color: 'var(--admin-foreground)',
                      background: 'rgba(255,255,255,0.05)', border: '1px solid var(--admin-border-subtle)',
                    }}>
                      {svc.servicio_nombre || svc.servicio_texto || '—'}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </FormModal>

      <ComboFormModal
        open={comboModalOpen}
        mode={comboModalMode}
        combo={editingCombo}
        locales={locales}
        onClose={() => setComboModalOpen(false)}
        onSaved={() => {
          setDetalleServicios([]);
          fetchCombos();
        }}
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
