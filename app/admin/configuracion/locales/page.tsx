'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import gsap from 'gsap';
import { Plus } from 'lucide-react';
import Header from '@/components/AdminHeader/Header';
import { PageHeader, DataTable, FormModal } from '@/components/AdminConfig';
import type { Column } from '@/components/AdminConfig';
import { toast } from '@/components/Shared/Toast';
import { getLocalesDB, crearLocalDB } from '@/lib/api/servicios';
import styles from './page.module.css';

interface Espacio {
  tipo_espacio: string;
  cantidad_espacios: number;
}

interface LocalRow {
  [key: string]: unknown;
  id: number;
  nombre: string;
  activo: boolean;
  espacios: Espacio[] | null;
}

interface FormErrors {
  nombre?: string;
  espacios?: string;
  submit?: string;
}

export default function LocalesPage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const [locales, setLocales] = useState<LocalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [nombre, setNombre] = useState('');
  const [espacios, setEspacios] = useState<Espacio[]>([
  { tipo_espacio: 'M', cantidad_espacios: 0 },
  { tipo_espacio: 'B', cantidad_espacios: 0 },
]);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getLocalesDB() as { data?: { locales?: LocalRow[] } };
      setLocales(res?.data?.locales ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar locales');
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
      gsap.fromTo(contentRef.current,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' }
      );
    }, containerRef);
    return () => ctx.revert();
  }, []);

  const resetModal = () => {
    setNombre('');
    setEspacios([
      { tipo_espacio: 'M', cantidad_espacios: 0 },
      { tipo_espacio: 'B', cantidad_espacios: 0 },
    ]);
    setFormErrors({});
  };

  const validate = (): boolean => {
    const errors: FormErrors = {};
    if (!nombre.trim()) errors.nombre = 'El nombre es obligatorio';
    const todasCero = espacios.every((e) => e.cantidad_espacios === 0);
    if (todasCero) errors.espacios = 'Debe haber al menos un espacio con cantidad > 0';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async () => {
    if (!validate()) return;

    const espaciosValidos = espacios.filter((e) => e.cantidad_espacios > 0);

    setSaving(true);
    setFormErrors({});
    try {
      await crearLocalDB({ nombre: nombre.trim(), espacios: espaciosValidos });
      setModalOpen(false);
      setNombre('');
      setEspacios([
        { tipo_espacio: 'M', cantidad_espacios: 0 },
        { tipo_espacio: 'B', cantidad_espacios: 0 },
      ]);
      await fetchData();
      toast.success('Local creado correctamente');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear local');
    } finally {
      setSaving(false);
    }
  };

  const updateCantidad = (i: number, value: number) => {
    setEspacios((prev) => prev.map((e, idx) => (idx === i ? { ...e, cantidad_espacios: value } : e)));
    if (formErrors.espacios) setFormErrors((prev) => ({ ...prev, espacios: undefined }));
  };

  const columns: Column<LocalRow>[] = [
    { key: 'id', label: 'ID', searchable: false },
    { key: 'nombre', label: 'Nombre' },
    {
      key: 'activo',
      label: 'Estado',
      searchable: false,
      render: (val) => (
        <span className={val ? 'admin-status-active' : 'admin-status-inactive'}>
          {val ? 'Activo' : 'Inactivo'}
        </span>
      ),
    },
    {
      key: 'espacios',
      label: 'Espacios',
      render: (val) => {
        if (!val) return '—';
        return (val as Espacio[]).map((e) => {
          const label = e.tipo_espacio === 'M' ? 'Mesas' : 'Bicicletas';
          return `${label}: ${e.cantidad_espacios}`;
        }).join(', ');
      },
    },
  ];

  return (
    <div ref={containerRef} className={styles.pageContainer}>
      <Header />
      <main className={styles.main}>
        <PageHeader
          title="Locales"
          subtitle="Gestiona las sucursales y sus espacios disponibles"
          backHref="/admin/configuracion"
          actions={
            <button
              className="admin-button admin-button-primary"
              onClick={() => { resetModal(); setModalOpen(true); }}
            >
              <Plus size={18} strokeWidth={2} />
              Nuevo Local
            </button>
          }
        />

        {/* ── DataTable ya tiene su propio wrapper (border/shadow) ── */}
        <div ref={contentRef}>
          <DataTable<LocalRow>
            columns={columns}
            data={locales}
            loading={loading}
            error={error}
            onRefresh={fetchData}
            onEdit={(item) => router.push(`/admin/configuracion/locales/${item.id}`)}
            getRowKey={(l) => l.id}
            searchPlaceholder="Buscar por nombre..."
            emptyMessage="No hay locales registrados"
          />
        </div>
      </main>

      <FormModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); resetModal(); }}
        title="Nuevo Local"
        onSubmit={handleCreate}
        loading={saving}
        submitLabel="Crear"
      >
        {/* Nombre */}
        <div className={styles.field}>
          <label htmlFor="loc-nombre">Nombre del local</label>
          <input
            id="loc-nombre"
            type="text"
            value={nombre}
            onChange={(e) => {
              setNombre(e.target.value);
              if (formErrors.nombre) setFormErrors((p) => ({ ...p, nombre: undefined }));
            }}
            placeholder="Ej: SAN MARTIN"
            autoFocus
            aria-invalid={!!formErrors.nombre}
            className={formErrors.nombre ? styles.inputError : ''}
          />
          {formErrors.nombre && (
            <span className={styles.fieldError}>{formErrors.nombre}</span>
          )}
        </div>

        {/* Espacios */}
        <div className={styles.espaciosSection}>
          <label className={styles.sectionLabel}>Espacios</label>

          {espacios.map((esp, i) => (
            <div key={esp.tipo_espacio} className={styles.espacioRow}>
              <div className={styles.tipoLabel}>
                {esp.tipo_espacio === 'M' ? 'Mesas' : 'Bicicletas'}
              </div>
              <div className={styles.field}>
                <label>Cantidad</label>
                <input
                  type="number"
                  min={0}
                  value={esp.cantidad_espacios}
                  onChange={(e) => updateCantidad(i, Number(e.target.value))}
                />
              </div>
            </div>
          ))}

          {formErrors.espacios && (
            <span className={styles.fieldError}>{formErrors.espacios}</span>
          )}
        </div>

        {/* Error general de submit */}
        {formErrors.submit && (
          <div className={styles.submitError}>{formErrors.submit}</div>
        )}
      </FormModal>
    </div>
  );
}