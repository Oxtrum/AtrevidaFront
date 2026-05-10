'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import gsap from 'gsap';
import { Plus } from 'lucide-react';
import Header from '@/components/AdminHeader/Header';
import { PageHeader, DataTable, FormModal } from '@/components/AdminConfig';
import type { Column } from '@/components/AdminConfig';
import { toast } from '@/components/Shared/Toast';
import { getCategoriasDB, crearCategoriaDB } from '@/lib/api/servicios';
import styles from './page.module.css';

interface Categoria extends Record<string, unknown> {
  ID: number;
  Nombre: string;
}

interface FormErrors {
  nombre?: string;
  submit?: string;
}

export default function CategoriasPage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [nombre, setNombre] = useState('');
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

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

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) { router.push('/admin/login'); return; }
    fetchData();
  }, [router, fetchData]);

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
    setNombre('');
    setFormErrors({});
  };

  const handleCreate = async () => {
    if (!nombre.trim()) {
      setFormErrors({ nombre: 'El nombre es obligatorio' });
      return;
    }

    setSaving(true);
    setFormErrors({});
    try {
      await crearCategoriaDB(nombre.trim());
      setModalOpen(false);
      setNombre('');
      await fetchData();
      toast.success('Categoría creada correctamente');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear categoría');
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<Categoria>[] = [
    { key: 'ID', label: 'ID', searchable: false },
    { key: 'Nombre', label: 'Nombre' },
  ];

  return (
    <div ref={containerRef} className={styles.pageContainer}>
      <Header />
      <main className={styles.main}>
        <PageHeader
          title="Categorías"
          subtitle="Administra las categorías de servicios"
          backHref="/admin/configuracion"
          actions={
            <button
              className="admin-button admin-button-primary"
              onClick={() => { resetModal(); setModalOpen(true); }}
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
            getRowKey={(c) => c.ID}
            searchPlaceholder="Buscar por nombre..."
            emptyMessage="No hay categorías registradas"
          />
        </div>
      </main>

      <FormModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); resetModal(); }}
        title="Nueva Categoría"
        onSubmit={handleCreate}
        loading={saving}
        submitLabel="Crear"
      >
        <div className={styles.field}>
          <label htmlFor="cat-nombre">Nombre</label>
          <input
            id="cat-nombre"
            type="text"
            value={nombre}
            onChange={(e) => {
              setNombre(e.target.value);
              if (formErrors.nombre) setFormErrors({});
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

        {formErrors.submit && (
          <div className={styles.submitError}>{formErrors.submit}</div>
        )}
      </FormModal>
    </div>
  );
}