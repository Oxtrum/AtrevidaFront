'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import gsap from 'gsap';
import { KeyRound, Plus, UserX, UserCheck } from 'lucide-react';
import Header from '@/components/AdminHeader/Header';
import { PageHeader, DataTable, FormModal, RowActionsMenu } from '@/components/AdminConfig';
import type { Column } from '@/components/AdminConfig';
import { toast } from '@/components/Shared/Toast';
import { ApiError } from '@/lib/api/client';
import {
  getUsuarios,
  registrarUsuario,
  cambiarPassword,
  toggleUsuarioActivo,
} from '@/lib/api/auth';
import type { UsuarioResumen } from '@/lib/api/auth';
import styles from './page.module.css';

interface UsuarioRow extends Record<string, unknown> {
  username: string;
  activo: boolean;
  fecha_registro: string;
}

interface NewUserForm {
  username: string;
  password: string;
}

interface NewUserErrors {
  username?: string;
  password?: string;
  submit?: string;
}

interface PwErrors {
  password?: string;
  submit?: string;
}

interface ConfirmState {
  message: string;
  onConfirm: () => void;
}

export default function UsuariosPage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const [usuarios, setUsuarios] = useState<UsuarioRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newUserModalOpen, setNewUserModalOpen] = useState(false);
  const [newUserForm, setNewUserForm] = useState<NewUserForm>({ username: '', password: '' });
  const [newUserErrors, setNewUserErrors] = useState<NewUserErrors>({});
  const [saving, setSaving] = useState(false);

  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [pwErrors, setPwErrors] = useState<PwErrors>({});
  const [pwSaving, setPwSaving] = useState(false);

  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getUsuarios();
      const data = (res as { data?: { usuarios?: UsuarioResumen[] } }).data;
      setUsuarios((data?.usuarios ?? []) as UsuarioRow[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar usuarios');
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

  // ─── Crear usuario ────────────────────────────────────────────────────────

  const resetNewUser = () => { setNewUserForm({ username: '', password: '' }); setNewUserErrors({}); };

  const validateNewUser = (): boolean => {
    const errors: NewUserErrors = {};
    if (!newUserForm.username.trim()) errors.username = 'El usuario es obligatorio';
    if (!newUserForm.password.trim()) errors.password = 'La contraseña es obligatoria';
    setNewUserErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateUser = async () => {
    if (!validateNewUser()) return;
    setSaving(true);
    setNewUserErrors({});
    try {
      await registrarUsuario(newUserForm.username.trim(), newUserForm.password);
      toast.success('Usuario creado correctamente');
      setNewUserModalOpen(false);
      resetNewUser();
      await fetchData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al crear usuario';
      setNewUserErrors({ submit: msg });
    } finally {
      setSaving(false);
    }
  };

  // ─── Cambiar contraseña ───────────────────────────────────────────────────

  const handleChangePassword = async () => {
    if (!newPassword.trim()) { setPwErrors({ password: 'La contraseña es obligatoria' }); return; }
    setPwSaving(true);
    setPwErrors({});
    try {
      await cambiarPassword(newPassword);
      toast.success('Contraseña actualizada correctamente');
      setChangePasswordModalOpen(false);
      setNewPassword('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al cambiar contraseña';
      setPwErrors({ submit: msg });
    } finally {
      setPwSaving(false);
    }
  };

  // ─── Toggle activo ────────────────────────────────────────────────────────

  const handleToggle = (row: UsuarioRow) => {
    const next = !row.activo;
    const verb = next ? 'reactivar' : 'desactivar';
    setConfirmState({
      message: `¿Seguro que quieres ${verb} al usuario "${row.username}"?`,
      onConfirm: async () => {
        try {
          await toggleUsuarioActivo(row.username, next);
          toast.success(next ? 'Usuario reactivado' : 'Usuario desactivado');
          await fetchData();
        } catch (err) {
          if (err instanceof ApiError && err.status === 403) {
            toast.error('No puedes modificar tu propia cuenta');
          } else {
            toast.error(err instanceof Error ? err.message : `No se pudo ${verb} el usuario`);
          }
        }
      },
    });
  };

  // ─── Columns ─────────────────────────────────────────────────────────────

  const columns: Column<UsuarioRow>[] = [
    { key: 'username', label: 'Usuario' },
    {
      key: 'activo',
      label: 'Estado',
      searchable: false,
      render: (_val, row) => (
        <span className={row.activo ? styles.badgeActive : styles.badgeInactive}>
          {row.activo ? 'Activo' : 'Inactivo'}
        </span>
      ),
    },
    {
      key: 'fecha_registro',
      label: 'Fecha de registro',
      searchable: false,
      render: (val) => {
        try { return new Date(String(val)).toLocaleDateString('es-BO'); } catch { return String(val); }
      },
    },
    {
      key: 'acciones',
      label: '',
      searchable: false,
      render: (_val, row) => (
        <RowActionsMenu actions={[
          row.activo
            ? { label: 'Desactivar', icon: <UserX size={12} strokeWidth={2} />, onClick: () => handleToggle(row), variant: 'danger' }
            : { label: 'Reactivar', icon: <UserCheck size={12} strokeWidth={2} />, onClick: () => handleToggle(row) },
        ]} />
      ),
    },
  ];

  return (
    <div ref={containerRef} className={styles.pageContainer}>
      <Header />
      <main className={styles.main}>
        <PageHeader
          title="Usuarios"
          subtitle="Gestiona los usuarios del sistema administrativo"
          backHref="/atrevida-gestion/configuracion"
          actions={
            <div className={styles.headerActions}>
              <button
                className="admin-button admin-button-secondary"
                onClick={() => { setNewPassword(''); setPwErrors({}); setChangePasswordModalOpen(true); }}
              >
                <KeyRound size={15} strokeWidth={2} />
                Cambiar mi contraseña
              </button>
              <button
                className="admin-button admin-button-primary"
                onClick={() => { resetNewUser(); setNewUserModalOpen(true); }}
              >
                <Plus size={16} strokeWidth={2.2} />
                Nuevo usuario
              </button>
            </div>
          }
        />

        <div ref={contentRef}>
          <DataTable<UsuarioRow>
            columns={columns}
            data={usuarios}
            loading={loading}
            error={error}
            onRefresh={fetchData}
            getRowKey={(u) => u.username}
            searchPlaceholder="Buscar usuario..."
            emptyMessage="No hay usuarios registrados"
          />
        </div>
      </main>

      {/* Modal: Nuevo usuario */}
      <FormModal
        isOpen={newUserModalOpen}
        onClose={() => { setNewUserModalOpen(false); resetNewUser(); }}
        title="Nuevo usuario"
        onSubmit={handleCreateUser}
        loading={saving}
        submitLabel="Crear usuario"
      >
        <div className={styles.formStack}>
          <div className={styles.field}>
            <label htmlFor="usr-username">Nombre de usuario</label>
            <input
              id="usr-username"
              type="text"
              value={newUserForm.username}
              onChange={(e) => { setNewUserForm((p) => ({ ...p, username: e.target.value })); if (newUserErrors.username) setNewUserErrors((p) => ({ ...p, username: undefined })); }}
              placeholder="Ej: recepcion01"
              autoFocus
              autoComplete="off"
              aria-invalid={!!newUserErrors.username}
              className={newUserErrors.username ? styles.inputError : ''}
            />
            {newUserErrors.username && <span className={styles.fieldError}>{newUserErrors.username}</span>}
          </div>

          <div className={styles.field}>
            <label htmlFor="usr-password">Contraseña</label>
            <input
              id="usr-password"
              type="password"
              value={newUserForm.password}
              onChange={(e) => { setNewUserForm((p) => ({ ...p, password: e.target.value })); if (newUserErrors.password) setNewUserErrors((p) => ({ ...p, password: undefined })); }}
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
              aria-invalid={!!newUserErrors.password}
              className={newUserErrors.password ? styles.inputError : ''}
            />
            {newUserErrors.password && <span className={styles.fieldError}>{newUserErrors.password}</span>}
          </div>

          {newUserErrors.submit && <div className={styles.submitError}>{newUserErrors.submit}</div>}
        </div>
      </FormModal>

      {/* Modal: Cambiar contraseña propia */}
      <FormModal
        isOpen={changePasswordModalOpen}
        onClose={() => { setChangePasswordModalOpen(false); setNewPassword(''); setPwErrors({}); }}
        title="Cambiar mi contraseña"
        onSubmit={handleChangePassword}
        loading={pwSaving}
        submitLabel="Actualizar contraseña"
      >
        <div className={styles.formStack}>
          <div className={styles.field}>
            <label htmlFor="pw-nueva">Nueva contraseña</label>
            <input
              id="pw-nueva"
              type="password"
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); if (pwErrors.password) setPwErrors((p) => ({ ...p, password: undefined })); }}
              placeholder="Nueva contraseña"
              autoFocus
              autoComplete="new-password"
              aria-invalid={!!pwErrors.password}
              className={pwErrors.password ? styles.inputError : ''}
            />
            {pwErrors.password && <span className={styles.fieldError}>{pwErrors.password}</span>}
          </div>

          {pwErrors.submit && <div className={styles.submitError}>{pwErrors.submit}</div>}
        </div>
      </FormModal>

      {/* Modal: Confirmar toggle */}
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
