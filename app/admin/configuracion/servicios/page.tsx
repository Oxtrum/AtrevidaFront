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
import { getCategoriasDB, getLocalesDB, getServiciosDB, crearServicioDB } from '@/lib/api/servicios';
import styles from './page.module.css';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ServicioRow extends Record<string, unknown> {
  nombre: string;
  categoria: string;
  local: string;
  tiempo: string;
  costo: string;
  sesiones: number;
  tipoEspacio: string;
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
}

interface FormErrors {
  nombre?: string;
  categoria?: string;
  local?: string;
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
  const hasFilter = !!(filtroLocal || filtroCategoria);

  // Options
  const [categorias, setCategorias] = useState<CategoriaOption[]>([]);
  const [locales, setLocales] = useState<LocalOption[]>([]);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(FORM_INITIAL);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // ─── Data fetching ───────────────────────────────────────────────────────────

  const fetchServicios = useCallback(async () => {
    // Requiere al menos un filtro para consultar
    if (!filtroLocal && !filtroCategoria) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getServiciosDB({
        local: filtroLocal,
        categoria: filtroCategoria || undefined,
        nombre: filtroNombre || undefined,
        sesiones: filtroSesiones ? Number(filtroSesiones) : undefined,
      }) as { data?: { servicios?: ServicioRow[]; total?: number } };
      setServicios(res?.data?.servicios ?? []);
      setTotal(res?.data?.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar servicios');
    } finally {
      setLoading(false);
    }
  }, [filtroLocal, filtroCategoria, filtroNombre, filtroSesiones]);

  const fetchOptions = useCallback(async () => {
    try {
      const [catRes, locRes] = await Promise.all([
        getCategoriasDB() as Promise<{ data?: { categorias?: CategoriaOption[] } }>,
        getLocalesDB() as Promise<{ data?: { locales?: LocalOption[] } }>,
      ]);
      setCategorias(catRes?.data?.categorias ?? []);
      setLocales(locRes?.data?.locales ?? []);
    } catch { /* silencioso — opciones de filtro no críticas */ }
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
  };

  const validate = (): boolean => {
    const errors: FormErrors = {};
    if (!form.nombre.trim()) errors.nombre = 'El nombre es obligatorio';
    if (!form.categoria) errors.categoria = 'Selecciona una categoría';
    if (!form.local) errors.local = 'Selecciona un local';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async () => {
    if (!validate()) return;
    setSaving(true);
    setFormErrors({});
    try {
      await crearServicioDB({
        nombre: form.nombre.trim(),
        categoria: form.categoria,
        tiempo: form.tiempo,
        costo: Number(form.costo),
        sesiones: form.sesiones,
        tipo_espacio_requerido: form.tipo_espacio_requerido,
        local: form.local,
      });
      setModalOpen(false);
      setForm({ nombre: '', categoria: '', tiempo: '', costo: '', sesiones: 1, tipo_espacio_requerido: 'M', local: '' });
      await fetchServicios();
      toast.success('Servicio creado correctamente');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear servicio');
    } finally {
      setSaving(false);
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
              onClick={() => { resetModal(); setModalOpen(true); }}
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
                <label>Local</label>
                <CustomSelect
                  value={filtroLocal}
                  onChange={setFiltroLocal}
                  options={[
                    { value: '', label: 'Seleccionar local' },
                    ...locales.map((l) => ({ value: l.nombre, label: l.nombre })),
                  ]}
                />
              </div>
              <div className={styles.filterGroup}>
                <label>Categoría</label>
                <CustomSelect
                  value={filtroCategoria}
                  onChange={setFiltroCategoria}
                  options={[
                    { value: '', label: 'Todas' },
                    ...categorias.map((c) => ({ value: c.Nombre, label: c.Nombre })),
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
                getRowKey={(s) => `${s.nombre}-${s.local}-${s.categoria}`}
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
        title="Nuevo Servicio"
        onSubmit={handleCreate}
        loading={saving}
        submitLabel="Crear"
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
            <label htmlFor="srv-categoria">Categoría</label>
            <CustomSelect
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
            <label htmlFor="srv-local">Local</label>
            <CustomSelect
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
            {formErrors.local && <span className={styles.fieldError}>{formErrors.local}</span>}
          </div>

          {/* Tiempo */}
          <div className={styles.field}>
            <label htmlFor="srv-tiempo">Tiempo (Min)</label>
            <input
              id="srv-tiempo"
              type="number"
              value={form.tiempo}
              onChange={(e) => patchForm({ tiempo: e.target.value })}
              placeholder="Ej: 60 min"
            />
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
              onChange={(e) => patchForm({ costo: e.target.value })}
              placeholder="0.00"
            />
          </div>

          {/* Sesiones */}
          <div className={styles.field}>
            <label htmlFor="srv-sesiones">Sesiones</label>
            <input
              id="srv-sesiones"
              type="number"
              min={1}
              value={form.sesiones}
              onChange={(e) => patchForm({ sesiones: Number(e.target.value) })}
            />
          </div>

          {/* Tipo espacio */}
          <div className={styles.field}>
            <label htmlFor="srv-espacio">Tipo espacio</label>
            <CustomSelect
              value={form.tipo_espacio_requerido}
              onChange={(v) => patchForm({ tipo_espacio_requerido: v })}
              options={[
                { value: 'M', label: 'Mesas' },
                { value: 'B', label: 'Bicicletas' },
              ]}
            />
          </div>
        </div>

        {/* Submit error */}
        {formErrors.submit && (
          <div className={styles.submitError}>{formErrors.submit}</div>
        )}
      </FormModal>
    </div>
  );
}