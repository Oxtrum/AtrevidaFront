'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import gsap from 'gsap';
import { Pencil, Plus, Search, Trash2, Users } from 'lucide-react';
import Header from '@/components/AdminHeader/Header';
import { PageHeader, DataTable, FormModal, RowActionsMenu } from '@/components/AdminConfig';
import type { Column } from '@/components/AdminConfig';
import { toast } from '@/components/Shared/Toast';
import {
  getClientesDB,
  crearClienteDB,
  actualizarClienteDB,
  eliminarClienteDB,
} from '@/lib/api/clientes';
import type { ClientePG } from '@/lib/api/clientes';
import styles from './page.module.css';

interface ClienteRow extends Record<string, unknown> {
  id: number;
  nombre: string;
  apellido: string;
  numero_telefono: string;
}

interface FormState {
  nombre: string;
  apellido: string;
  numero_telefono: string;
}

interface FormErrors {
  nombre?: string;
  apellido?: string;
  numero_telefono?: string;
  submit?: string;
}

interface ConfirmState {
  message: string;
  onConfirm: () => void;
}

const FORM_INITIAL: FormState = { nombre: '', apellido: '', numero_telefono: '' };

export default function ClientesPage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const [clientes, setClientes] = useState<ClienteRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(FORM_INITIAL);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);

  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getClientesDB({ nombre: searchDebounced || undefined });
      const data = (res as { data?: { clientes?: ClientePG[]; total?: number } }).data;
      setClientes((data?.clientes ?? []) as ClienteRow[]);
      setTotal(data?.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  }, [searchDebounced]);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) { router.push('/atrevida-gestion/login'); return; }
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
    return () => ctx.revert();
  }, []);

  const patchForm = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }));

  const resetModal = () => {
    setForm(FORM_INITIAL);
    setFormErrors({});
    setEditingId(null);
  };

  const openCreate = () => { resetModal(); setModalOpen(true); };

  const openEdit = (row: ClienteRow) => {
    setEditingId(row.id);
    setForm({ nombre: row.nombre, apellido: row.apellido, numero_telefono: row.numero_telefono });
    setFormErrors({});
    setModalOpen(true);
  };

  const validate = (): boolean => {
    const errors: FormErrors = {};
    if (!form.nombre.trim()) errors.nombre = 'El nombre es obligatorio';
    if (!form.apellido.trim()) errors.apellido = 'El apellido es obligatorio';
    if (!form.numero_telefono.trim()) errors.numero_telefono = 'El teléfono es obligatorio';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    setFormErrors({});
    try {
      if (editingId !== null) {
        await actualizarClienteDB(editingId, {
          nombre: form.nombre.trim(),
          apellido: form.apellido.trim(),
          numero_telefono: form.numero_telefono.trim(),
        });
        toast.success('Cliente actualizado correctamente');
      } else {
        await crearClienteDB({
          nombre: form.nombre.trim(),
          apellido: form.apellido.trim(),
          numero_telefono: form.numero_telefono.trim(),
        });
        toast.success('Cliente creado correctamente');
      }
      setModalOpen(false);
      resetModal();
      await fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar cliente');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (row: ClienteRow) => {
    setConfirmState({
      message: `¿Eliminar a ${row.nombre} ${row.apellido}? Esta acción es permanente y no se puede deshacer.`,
      onConfirm: async () => {
        try {
          await eliminarClienteDB(row.id);
          toast.success('Cliente eliminado');
          await fetchData();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Error al eliminar cliente');
        }
      },
    });
  };

  const columns: Column<ClienteRow>[] = [
    { key: 'id', label: 'ID', searchable: false },
    { key: 'nombre', label: 'Nombre' },
    { key: 'apellido', label: 'Apellido' },
    { key: 'numero_telefono', label: 'Teléfono', searchable: false },
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
          kicker="Directorio"
          kickerIcon={<Users size={14} strokeWidth={2} />}
          title="Clientes"
          accentWord="Clientes"
          subtitle="Directorio de clientes del centro"
        
          actions={
            <button className="admin-button admin-button-primary" onClick={openCreate}>
              <Plus size={16} strokeWidth={2.2} />
              Nuevo Cliente
            </button>
          }
        />

        <div ref={contentRef} className={styles.contentStack}>
         
          <DataTable<ClienteRow>
            columns={columns}
            data={clientes}
            loading={loading}
            error={error}
            onRefresh={fetchData}
            getRowKey={(c) => c.id}
            searchPlaceholder="Buscar por nombre..."
            emptyMessage="No se encontraron clientes"
          />
        </div>
        </div>
      </main>

      {/* Modal crear / editar */}
      <FormModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); resetModal(); }}
        title={editingId !== null ? 'Editar Cliente' : 'Nuevo Cliente'}
        onSubmit={handleSubmit}
        loading={saving}
        submitLabel={editingId !== null ? 'Guardar cambios' : 'Crear cliente'}
      >
        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label htmlFor="cli-nombre">Nombre</label>
            <input
              id="cli-nombre"
              type="text"
              value={form.nombre}
              onChange={(e) => { patchForm({ nombre: e.target.value }); if (formErrors.nombre) setFormErrors((p) => ({ ...p, nombre: undefined })); }}
              placeholder="Ej: María"
              autoFocus
              aria-invalid={!!formErrors.nombre}
              className={formErrors.nombre ? styles.inputError : ''}
            />
            {formErrors.nombre && <span className={styles.fieldError}>{formErrors.nombre}</span>}
          </div>

          <div className={styles.field}>
            <label htmlFor="cli-apellido">Apellido</label>
            <input
              id="cli-apellido"
              type="text"
              value={form.apellido}
              onChange={(e) => { patchForm({ apellido: e.target.value }); if (formErrors.apellido) setFormErrors((p) => ({ ...p, apellido: undefined })); }}
              placeholder="Ej: López"
              aria-invalid={!!formErrors.apellido}
              className={formErrors.apellido ? styles.inputError : ''}
            />
            {formErrors.apellido && <span className={styles.fieldError}>{formErrors.apellido}</span>}
          </div>

          <div className={`${styles.field} ${styles.colSpan2}`}>
            <label htmlFor="cli-telefono">Teléfono</label>
            <input
              id="cli-telefono"
              type="tel"
              value={form.numero_telefono}
              onChange={(e) => { patchForm({ numero_telefono: e.target.value }); if (formErrors.numero_telefono) setFormErrors((p) => ({ ...p, numero_telefono: undefined })); }}
              placeholder="Ej: +59170011223"
              aria-invalid={!!formErrors.numero_telefono}
              className={formErrors.numero_telefono ? styles.inputError : ''}
            />
            {formErrors.numero_telefono && <span className={styles.fieldError}>{formErrors.numero_telefono}</span>}
          </div>
        </div>

        {formErrors.submit && <div className={styles.submitError}>{formErrors.submit}</div>}
      </FormModal>

      {/* Modal confirmar eliminación */}
      <FormModal
        isOpen={confirmState !== null}
        onClose={() => setConfirmState(null)}
        title="Confirmar eliminación"
        onSubmit={() => { confirmState?.onConfirm(); setConfirmState(null); }}
        submitLabel="Eliminar"
      >
        <p style={{ color: 'var(--admin-foreground)', fontSize: '0.9rem', lineHeight: 1.6 }}>
          {confirmState?.message}
        </p>
      </FormModal>
    </div>
  );
}
