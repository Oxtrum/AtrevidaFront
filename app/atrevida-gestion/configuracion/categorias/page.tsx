'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import gsap from 'gsap';
import { Pencil, Plus, Tags, Trash2 } from 'lucide-react';
import Header from '@/components/AdminHeader/Header';
import { PageHeader, DataTable, FormModal, RowActionsMenu } from '@/components/AdminConfig';
import type { Column } from '@/components/AdminConfig';
import { CustomSelect } from '@/components/Custom/CustomSelectAdmin';
import { toast } from '@/components/Shared/Toast';
import {
  getCategoriasDB,
  crearCategoriaDB,
  actualizarCategoriaDB,
  eliminarCategoriaDB,
  getLocalesDeCategoriaDB,
  asociarCategoriaLocalDB,
  desasociarCategoriaLocalDB,
  getLocalesDB,
} from '@/lib/api/servicios';
import styles from './page.module.css';

interface Categoria extends Record<string, unknown> {
  id: number;
  nombre: string;
}

interface LocalOption {
  id: number;
  nombre: string;
  activo: boolean;
}

interface FormErrors {
  nombre?: string;
  local?: string;
  submit?: string;
}

interface ConfirmState {
  message: string;
  onConfirm: () => void;
}

export default function CategoriasPage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [locales, setLocales] = useState<LocalOption[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [nombre, setNombre] = useState('');
  const [localId, setLocalId] = useState('');
  const [localesSeleccionados, setLocalesSeleccionados] = useState<Set<number>>(new Set());
  const [localesOriginales, setLocalesOriginales] = useState<Set<number>>(new Set());
  const [loadingLocalesCategoria, setLoadingLocalesCategoria] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getCategoriasDB() as { data?: { categorias?: Categoria[] } };
      setCategorias(res?.data?.categorias ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar categorías');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLocales = useCallback(async () => {
    try {
      const res = await getLocalesDB();
      const activos = (res?.data?.locales ?? []).filter((l) => l.activo !== false);
      setLocales(activos as LocalOption[]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al cargar locales');
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) { router.push('/atrevida-gestion/login'); return; }
    fetchData();
    fetchLocales();
  }, [router, fetchData, fetchLocales]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        contentRef.current,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' }
      );
    }, containerRef);
    return () => ctx.revert(); // era ctx.kill() — revert es el correcto
  }, []);

  const resetModal = () => {
    setEditingId(null);
    setNombre('');
    setLocalId('');
    setLocalesSeleccionados(new Set());
    setLocalesOriginales(new Set());
    setFormErrors({});
  };

  const openCreate = () => {
    resetModal();
    setModalOpen(true);
  };

  const openEdit = async (row: Categoria) => {
    setEditingId(row.id);
    setNombre(row.nombre);
    setLocalId('');
    setFormErrors({});
    setModalOpen(true);
    setLoadingLocalesCategoria(true);
    try {
      const res = await getLocalesDeCategoriaDB(row.id);
      const ids = new Set((res?.data?.locales ?? []).map((l) => l.id));
      setLocalesSeleccionados(ids);
      setLocalesOriginales(new Set(ids));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al cargar locales de la categoría');
    } finally {
      setLoadingLocalesCategoria(false);
    }
  };

  const toggleLocal = (id: number) => {
    setLocalesSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!nombre.trim()) {
      setFormErrors({ nombre: 'El nombre es obligatorio' });
      return;
    }

    if (editingId === null && !localId) {
      setFormErrors({ local: 'Selecciona el local donde se creará' });
      return;
    }

    setSaving(true);
    setFormErrors({});
    try {
      if (editingId !== null) {
        await actualizarCategoriaDB(editingId, nombre.trim());

        const aAgregar = [...localesSeleccionados].filter((id) => !localesOriginales.has(id));
        const aQuitar = [...localesOriginales].filter((id) => !localesSeleccionados.has(id));
        await Promise.all([
          ...aAgregar.map((id) => asociarCategoriaLocalDB(editingId, id)),
          ...aQuitar.map((id) => desasociarCategoriaLocalDB(editingId, id)),
        ]);

        toast.success('Categoría actualizada correctamente');
      } else {
        await crearCategoriaDB(nombre.trim(), Number(localId));
        toast.success('Categoría creada correctamente');
      }
      setModalOpen(false);
      resetModal();
      await fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar categoría');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (row: Categoria) => {
    setConfirmState({
      message: `¿Eliminar la categoría "${row.nombre}"? Esta acción no se puede deshacer.`,
      onConfirm: async () => {
        try {
          await eliminarCategoriaDB(row.id);
          toast.success('Categoría eliminada');
          await fetchData();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Error al eliminar categoría');
        }
      },
    });
  };

  const columns: Column<Categoria>[] = [
    { key: 'id', label: 'ID', searchable: false },
    { key: 'nombre', label: 'Nombre' },
    {
      key: 'acciones',
      label: '',
      searchable: false,
      render: (_val, row) => (
        <RowActionsMenu actions={[
          { label: 'Editar', icon: <Pencil size={12} strokeWidth={2} />, onClick: () => openEdit(row) },
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
          kickerIcon={<Tags size={14} strokeWidth={2} />}
          title="Categorías de Servicios"
          accentWord="Categorías"
          subtitle="Administra las categorías de servicios"
          backHref="/atrevida-gestion/configuracion"
          actions={
            <button
              className="admin-button admin-button-primary"
              onClick={openCreate}
            >
              <Plus size={18} strokeWidth={2} />
              Nueva Categoría
            </button>
          }
        />

        {/* DataTable ya tiene su propio wrapper */}
        <div ref={contentRef}>
          <DataTable<Categoria>
            columns={columns}
            data={categorias}
            loading={loading}
            error={error}
            onRefresh={fetchData}
            getRowKey={(c) => c.id}
            searchPlaceholder="Buscar por nombre..."
            emptyMessage="No hay categorías registradas"
          />
        </div>
        </div>
      </main>

      <FormModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); resetModal(); }}
        title={editingId !== null ? 'Editar Categoría' : 'Nueva Categoría'}
        onSubmit={handleSubmit}
        loading={saving}
        submitLabel={editingId !== null ? 'Guardar' : 'Crear'}
      >
        <div className={styles.field}>
          <label htmlFor="cat-nombre">Nombre</label>
          <input
            id="cat-nombre"
            type="text"
            value={nombre}
            onChange={(e) => {
              setNombre(e.target.value);
              if (formErrors.nombre) setFormErrors((p) => ({ ...p, nombre: undefined }));
            }}
            placeholder="Ej: SERVICIOS MANUALES"
            autoFocus
            aria-invalid={!!formErrors.nombre}
            className={formErrors.nombre ? styles.inputError : ''}
          />
          {formErrors.nombre && (
            <span className={styles.fieldError}>{formErrors.nombre}</span>
          )}
        </div>

        {editingId === null ? (
          <div className={styles.field} style={{ marginTop: '1rem' }}>
            <label id="lbl-cat-local" htmlFor="cat-local">Local donde se creará</label>
            <CustomSelect
              id="cat-local"
              ariaLabelledBy="lbl-cat-local"
              value={localId}
              onChange={(v) => {
                setLocalId(v);
                if (formErrors.local) setFormErrors((p) => ({ ...p, local: undefined }));
              }}
              options={[
                { value: '', label: 'Seleccionar local…' },
                ...locales.map((l) => ({ value: String(l.id), label: l.nombre })),
              ]}
              hasError={!!formErrors.local}
            />
            {formErrors.local && (
              <span className={styles.fieldError}>{formErrors.local}</span>
            )}
          </div>
        ) : (
          <div className={styles.localesSection}>
            <label className={styles.sectionLabel}>Locales asociados</label>
            {loadingLocalesCategoria && (
              <p className={styles.helperText}>Cargando locales…</p>
            )}
            {!loadingLocalesCategoria && locales.length === 0 && (
              <p className={styles.helperText}>No hay locales activos registrados.</p>
            )}
            {!loadingLocalesCategoria && locales.map((l) => (
              <label key={l.id} className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={localesSeleccionados.has(l.id)}
                  onChange={() => toggleLocal(l.id)}
                />
                {l.nombre}
              </label>
            ))}
          </div>
        )}

        {formErrors.submit && (
          <div className={styles.submitError}>{formErrors.submit}</div>
        )}
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
