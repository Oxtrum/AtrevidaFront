'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import gsap from 'gsap';
import { Building2, Plus } from 'lucide-react';
import Header from '@/components/AdminHeader/Header';
import { PageHeader, DataTable, FormModal } from '@/components/AdminConfig';
import type { Column } from '@/components/AdminConfig';
import { toast } from '@/components/Shared/Toast';
import { getLocalesDB, crearLocalDB, actualizarLocal, actualizarEspaciosLocal } from '@/lib/api/servicios';
import { useAdminLocalScopeState } from '@/lib/auth/useAdminLocalScope';
import { LocalFormFields, type Espacio } from '@/components/AdminLocales';
import styles from './page.module.css';

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

const ESPACIOS_VACIOS: Espacio[] = [
  { tipo_espacio: 'M', cantidad_espacios: 0 },
  { tipo_espacio: 'B', cantidad_espacios: 0 },
];

/** Siempre Mesas y Bicicletas, en ese orden; el tipo que el local no tiene queda en 0. */
function normalizeEspacios(items: Espacio[] | null): Espacio[] {
  return ESPACIOS_VACIOS.map((vacio) => items?.find((e) => e.tipo_espacio === vacio.tipo_espacio) ?? vacio);
}

function getScopedLocales(
  locales: LocalRow[],
  workplace: { local_id: number; nombre_local: string } | null,
): LocalRow[] {
  if (!workplace) return locales;

  const scoped = locales.filter((local) =>
    local.id === workplace.local_id || local.nombre === workplace.nombre_local
  );

  return scoped.length > 0
    ? scoped
    : [{ id: workplace.local_id, nombre: workplace.nombre_local, activo: true, espacios: null }];
}

export default function LocalesPage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const [locales, setLocales] = useState<LocalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  // null = modal en modo "Nuevo Local"; con id = modo "Editar Local" sobre esa fila.
  const [editando, setEditando] = useState<LocalRow | null>(null);
  const [nombre, setNombre] = useState('');
  const [espacios, setEspacios] = useState<Espacio[]>(ESPACIOS_VACIOS);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const adminLocalScope = useAdminLocalScopeState();
  const hasScopedLocal = !!adminLocalScope.workplace;

  const fetchData = useCallback(async () => {
    if (!adminLocalScope.ready) return;

    setLoading(true);
    setError(null);
    try {
      const res = await getLocalesDB() as { data?: { locales?: LocalRow[] } };
      setLocales(getScopedLocales(res?.data?.locales ?? [], adminLocalScope.workplace));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar locales');
    } finally {
      setLoading(false);
    }
  }, [adminLocalScope.ready, adminLocalScope.workplace]);

  useEffect(() => {
    if (!adminLocalScope.ready) return;

    const token = localStorage.getItem('adminToken');
    if (!token) { router.push('/atrevida-gestion/login'); return; }
    fetchData();
  }, [adminLocalScope.ready, router, fetchData]);

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
    setEditando(null);
    setNombre('');
    setEspacios(ESPACIOS_VACIOS);
    setFormErrors({});
  };

  const openCreate = () => {
    resetModal();
    setModalOpen(true);
  };

  const openEdit = (local: LocalRow) => {
    setEditando(local);
    setNombre(local.nombre);
    setEspacios(normalizeEspacios(local.espacios));
    setFormErrors({});
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    resetModal();
  };

  const validate = (): boolean => {
    const errors: FormErrors = {};
    if (!nombre.trim()) errors.nombre = 'El nombre es obligatorio';
    // Un local nuevo necesita algún espacio; al editar, 0 en todo es válido (mantenimiento).
    const todasCero = espacios.every((e) => e.cantidad_espacios === 0);
    if (!editando && todasCero) errors.espacios = 'Debe haber al menos un espacio con cantidad > 0';
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
      closeModal();
      await fetchData();
      toast.success('Local creado correctamente');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear local');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editando || !validate()) return;

    const originales = normalizeEspacios(editando.espacios);
    const nombreCambio = nombre.trim() !== editando.nombre;
    const espaciosCambiaron = espacios.some((e, i) => e.cantidad_espacios !== originales[i].cantidad_espacios);
    if (!nombreCambio && !espaciosCambiaron) {
      closeModal();
      return;
    }

    setSaving(true);
    try {
      // El nombre va por PATCH /bd/locales/{id}; mesas y bicicletas tienen su propio endpoint.
      if (nombreCambio) await actualizarLocal(editando.id, { nombre: nombre.trim() });
      if (espaciosCambiaron) await actualizarEspaciosLocal(editando.id, espacios);
      closeModal();
      await fetchData();
      toast.success('Local actualizado correctamente');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar local');
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
      <div className="admin-mesh" />
      <Header />
      <main className={styles.main}>
        <div className={styles.container}>
          <PageHeader
          kicker="Configuración"
          kickerIcon={<Building2 size={14} strokeWidth={2} />}
          title="Locales y Sucursales"
          accentWord="Locales"
          subtitle="Gestiona las sucursales y sus espacios disponibles"
          backHref="/atrevida-gestion/configuracion"
          actions={!hasScopedLocal ? (
            <button
              className="admin-button admin-button-primary"
              onClick={openCreate}
            >
              <Plus size={18} strokeWidth={2} />
              Nuevo Local
            </button>
          ) : undefined}
        />

        {/* ── DataTable ya tiene su propio wrapper (border/shadow) ── */}
        <div ref={contentRef}>
          <DataTable<LocalRow>
            columns={columns}
            data={locales}
            loading={loading}
            error={error}
            onRefresh={fetchData}
            onEdit={openEdit}
            getRowKey={(l) => l.id}
            searchPlaceholder="Buscar por nombre..."
            emptyMessage="No hay locales registrados"
          />
        </div>
        </div>
      </main>

      <FormModal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editando ? 'Editar Local' : 'Nuevo Local'}
        onSubmit={editando ? handleUpdate : handleCreate}
        loading={saving}
        submitLabel={editando ? 'Guardar' : 'Crear'}
      >
        <LocalFormFields
          nombre={nombre}
          onNombreChange={(value) => {
            setNombre(value);
            if (formErrors.nombre) setFormErrors((p) => ({ ...p, nombre: undefined }));
          }}
          nombreError={formErrors.nombre}
          autoFocusNombre
          espacios={espacios}
          onCantidadChange={updateCantidad}
          espaciosError={formErrors.espacios}
          espaciosHint={editando
            ? 'Pon 0 para dejar un tipo sin espacios (por ejemplo, por mantenimiento). Las reservas ya hechas no se cancelan: solo se limitan las nuevas.'
            : undefined}
        />

        {/* Error general de submit */}
        {formErrors.submit && (
          <div className={styles.submitError}>{formErrors.submit}</div>
        )}
      </FormModal>
    </div>
  );
}
