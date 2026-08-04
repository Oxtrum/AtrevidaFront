'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import gsap from 'gsap';
import { Pencil, Plus, Trash2, Users } from 'lucide-react';
import Header from '@/components/AdminHeader/Header';
import { PageHeader, DataTable, FormModal, RowActionsMenu } from '@/components/AdminConfig';
import type { Column } from '@/components/AdminConfig';
import { toast } from '@/components/Shared/Toast';
import { getClientesDB, eliminarClienteDB } from '@/lib/api/clientes';
import type { ClientePG } from '@/lib/api/clientes';
import { ClienteFormModal } from '@/components/AdminClientes';
import styles from './page.module.css';

interface ClienteRow extends Record<string, unknown> {
  id: number;
  nombre: string;
  apellido: string;
  numero_telefono: string;
  ci?: string;
  nit?: string;
}

interface ConfirmState {
  message: string;
  onConfirm: () => void;
}

export default function ClientesPage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const [clientes, setClientes] = useState<ClienteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<ClientePG | undefined>(undefined);

  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getClientesDB({});
      const data = (res as { data?: { clientes?: ClientePG[] } }).data;
      setClientes((data?.clientes ?? []) as ClienteRow[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  }, []);

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

  const openCreate = () => { setEditingCliente(undefined); setModalOpen(true); };

  const openEdit = (row: ClienteRow) => {
    setEditingCliente(row as unknown as ClientePG);
    setModalOpen(true);
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
    { key: 'apellido', label: 'Apellidos' },
    { key: 'numero_telefono', label: 'Teléfono', searchable: false },
    {
      key: 'ci',
      label: 'CI',
      searchable: false,
      render: (_val, row) => <span>{(row.ci as string) || '—'}</span>,
    },
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
      <ClienteFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        cliente={editingCliente}
        onSaved={fetchData}
      />

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
