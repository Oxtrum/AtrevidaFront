'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import gsap from 'gsap';
import { ArrowRight, KeyRound, MapPin, Plus, ShieldCheck, UserX, UserCheck } from 'lucide-react';
import Header from '@/components/AdminHeader/Header';
import { PageHeader, DataTable, FormModal, RowActionsMenu } from '@/components/AdminConfig';
import { CustomSelect } from '@/components/Custom/CustomSelectAdmin';
import type { Column, RowAction } from '@/components/AdminConfig';
import { toast } from '@/components/Shared/Toast';
import { ApiError } from '@/lib/api/client';
import {
  cambiarUsuarioLocal,
  getUsuarios,
  registrarUsuario,
  cambiarPassword,
  toggleUsuarioActivo,
} from '@/lib/api/auth';
import type { UsuarioResumen } from '@/lib/api/auth';
import type { RolCodigo } from '@/lib/api/auth';
import { getLocalesDB, type LocalRow } from '@/lib/api/servicios';
import { isAdminSys } from '@/lib/auth/adminSession';
import styles from './page.module.css';

interface UsuarioRow extends Record<string, unknown> {
  username: string;
  activo: boolean;
  fecha_registro: string;
  rol_codigo: string;
  rol_nombre: string;
  local_id?: number | null;
  nombre_local?: string | null;
}

interface NewUserForm {
  username: string;
  password: string;
  rolCodigo: RolCodigo;
  localId: string;
}

interface NewUserErrors {
  username?: string;
  password?: string;
  rolCodigo?: string;
  localId?: string;
  submit?: string;
}

interface PwErrors {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
  submit?: string;
}

interface PwForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface ChangeLocalState {
  user: UsuarioRow;
  localId: string;
  error?: string;
}

interface ConfirmState {
  message: string;
  onConfirm: () => void;
}

const EMPTY_PW_FORM: PwForm = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

const DEFAULT_NEW_USER_FORM: NewUserForm = {
  username: '',
  password: '',
  rolCodigo: 'gerencia',
  localId: '',
};

const ROLE_OPTIONS = [
  { value: 'gerencia', label: 'Recepción' },
  { value: 'admin_sys', label: 'Administrador de sistema' },
];

const getUserLocalLabel = (row: UsuarioRow) => {
  if (row.rol_codigo === 'admin_sys') return 'Todos los locales';
  return row.nombre_local || 'Sin local asignado';
};

export default function UsuariosPage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const [usuarios, setUsuarios] = useState<UsuarioRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locales, setLocales] = useState<LocalRow[]>([]);
  const [localesLoading, setLocalesLoading] = useState(false);
  const [canManageUserLocales, setCanManageUserLocales] = useState(false);

  const [newUserModalOpen, setNewUserModalOpen] = useState(false);
  const [newUserForm, setNewUserForm] = useState<NewUserForm>(DEFAULT_NEW_USER_FORM);
  const [newUserErrors, setNewUserErrors] = useState<NewUserErrors>({});
  const [saving, setSaving] = useState(false);

  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState(false);
  const [pwForm, setPwForm] = useState<PwForm>(EMPTY_PW_FORM);
  const [pwErrors, setPwErrors] = useState<PwErrors>({});
  const [pwSaving, setPwSaving] = useState(false);

  const [changeLocalState, setChangeLocalState] = useState<ChangeLocalState | null>(null);
  const [localChangeSaving, setLocalChangeSaving] = useState(false);

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

  const fetchLocales = useCallback(async () => {
    setLocalesLoading(true);
    try {
      const res = await getLocalesDB();
      setLocales((res.data?.locales ?? []).filter((local) => local.activo !== false));
    } catch (err) {
      setLocales([]);
      toast.error(err instanceof Error ? err.message : 'No se pudieron cargar los locales');
    } finally {
      setLocalesLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) { router.push('/atrevida-gestion/login'); return; }
    setCanManageUserLocales(isAdminSys());
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
    return () => ctx.revert();
  }, []);

  // ─── Crear usuario ────────────────────────────────────────────────────────

  const resetNewUser = () => {
    setNewUserForm(DEFAULT_NEW_USER_FORM);
    setNewUserErrors({});
  };

  const validateNewUser = (): boolean => {
    const errors: NewUserErrors = {};
    const requiresLocal = newUserForm.rolCodigo !== 'admin_sys';
    if (!newUserForm.username.trim()) errors.username = 'El usuario es obligatorio';
    if (!newUserForm.password.trim()) errors.password = 'La contraseña es obligatoria';
    if (!newUserForm.rolCodigo) errors.rolCodigo = 'Selecciona un rol';
    if (requiresLocal && !newUserForm.localId) errors.localId = 'Selecciona el local de trabajo';
    setNewUserErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateUser = async () => {
    if (!validateNewUser()) return;
    setSaving(true);
    setNewUserErrors({});
    try {
      const localId = newUserForm.rolCodigo === 'admin_sys'
        ? undefined
        : Number(newUserForm.localId);

      await registrarUsuario(
        newUserForm.username.trim(),
        newUserForm.password,
        newUserForm.rolCodigo,
        localId,
      );
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

  // ─── Cambiar local ────────────────────────────────────────────────────────

  const openChangeLocalModal = (row: UsuarioRow) => {
    const currentLocalId = row.local_id == null ? '' : String(row.local_id);
    const suggestedLocal = locales.find((local) => String(local.id) !== currentLocalId) ?? locales[0];

    setChangeLocalState({
      user: row,
      localId: suggestedLocal ? String(suggestedLocal.id) : '',
    });
  };

  const closeChangeLocalModal = () => {
    if (localChangeSaving) return;
    setChangeLocalState(null);
  };

  const updateChangeLocalId = (localId: string) => {
    setChangeLocalState((current) => current
      ? { ...current, localId, error: undefined }
      : current);
  };

  const handleChangeUserLocal = async () => {
    if (!changeLocalState) return;

    const { user, localId } = changeLocalState;
    const selectedLocal = locales.find((local) => String(local.id) === localId);
    const selectedLocalId = Number(localId);
    const currentLocalId = user.local_id == null ? '' : String(user.local_id);

    if (user.rol_codigo === 'admin_sys') {
      setChangeLocalState((current) => current
        ? { ...current, error: 'No se puede cambiar el local de un administrador del sistema.' }
        : current);
      return;
    }

    if (!localId || !Number.isInteger(selectedLocalId) || selectedLocalId <= 0) {
      setChangeLocalState((current) => current
        ? { ...current, error: 'Selecciona un local válido.' }
        : current);
      return;
    }

    if (!selectedLocal) {
      setChangeLocalState((current) => current
        ? { ...current, error: 'El local seleccionado no está disponible.' }
        : current);
      return;
    }

    if (currentLocalId === localId) {
      setChangeLocalState((current) => current
        ? { ...current, error: 'Selecciona un local distinto al actual.' }
        : current);
      return;
    }

    setLocalChangeSaving(true);
    try {
      await cambiarUsuarioLocal({
        username: user.username,
        local_id: selectedLocalId,
      });
      toast.success(`Local de ${user.username} actualizado a ${selectedLocal.nombre}`);
      setChangeLocalState(null);
      await fetchData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo cambiar el local del usuario';
      setChangeLocalState((current) => current ? { ...current, error: msg } : current);
    } finally {
      setLocalChangeSaving(false);
    }
  };

  // ─── Cambiar contraseña ───────────────────────────────────────────────────

  const resetPasswordForm = () => {
    setPwForm(EMPTY_PW_FORM);
    setPwErrors({});
  };

  const updatePasswordField = (field: keyof PwForm, value: string) => {
    setPwForm((current) => ({ ...current, [field]: value }));
    if (pwErrors[field] || pwErrors.submit) {
      setPwErrors((current) => ({ ...current, [field]: undefined, submit: undefined }));
    }
  };

  const validatePasswordForm = () => {
    const errors: PwErrors = {};

    if (!pwForm.currentPassword.trim()) errors.currentPassword = 'La contraseña actual es obligatoria';
    if (!pwForm.newPassword.trim()) errors.newPassword = 'La nueva contraseña es obligatoria';
    if (!pwForm.confirmPassword.trim()) {
      errors.confirmPassword = 'Confirma la nueva contraseña';
    } else if (pwForm.newPassword !== pwForm.confirmPassword) {
      errors.confirmPassword = 'Las contraseñas no coinciden';
    }
    if (pwForm.currentPassword && pwForm.newPassword && pwForm.currentPassword === pwForm.newPassword) {
      errors.newPassword = 'La nueva contraseña debe ser distinta a la actual';
    }

    setPwErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChangePassword = async () => {
    if (!validatePasswordForm()) return;
    setPwSaving(true);
    setPwErrors({});
    try {
      await cambiarPassword({
        password_actual: pwForm.currentPassword,
        password_nueva: pwForm.newPassword,
      });
      toast.success('Contraseña actualizada correctamente');
      setChangePasswordModalOpen(false);
      resetPasswordForm();
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

  const newUserRequiresLocal = newUserForm.rolCodigo !== 'admin_sys';
  const localOptions = locales.length > 0
    ? locales.map((local) => ({ value: String(local.id), label: local.nombre }))
    : [{ value: '', label: localesLoading ? 'Cargando locales...' : 'Sin locales activos', disabled: true }];
  const selectedChangeLocal = changeLocalState
    ? locales.find((local) => String(local.id) === changeLocalState.localId)
    : null;

  const getUserActions = (row: UsuarioRow): RowAction[] => {
    const actions: RowAction[] = [];

    if (canManageUserLocales && row.rol_codigo !== 'admin_sys') {
      actions.push({
        label: 'Cambiar de local',
        icon: <MapPin size={12} strokeWidth={2} />,
        onClick: () => openChangeLocalModal(row),
      });
    }

    actions.push(row.activo
      ? { label: 'Desactivar', icon: <UserX size={12} strokeWidth={2} />, onClick: () => handleToggle(row), variant: 'danger' }
      : { label: 'Reactivar', icon: <UserCheck size={12} strokeWidth={2} />, onClick: () => handleToggle(row) });

    return actions;
  };

  const columns: Column<UsuarioRow>[] = [
    { key: 'username', label: 'Usuario' },
    {
      key: 'rol_nombre',
      label: 'Rol',
      render: (value, row) => (
        <span className={styles.roleCell}>
          {String(value || row.rol_codigo)}
        </span>
      ),
    },
    {
      key: 'nombre_local',
      label: 'Local',
      render: (value, row) => (
        <span className={styles.roleCell}>
          {String(value || (row.rol_codigo === 'admin_sys' ? 'Todos los locales' : 'Sin local'))}
        </span>
      ),
    },
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
        <RowActionsMenu actions={getUserActions(row)} />
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
          kicker="Administración"
          kickerIcon={<ShieldCheck size={14} strokeWidth={2} />}
          title="Usuarios del Sistema"
          accentWord="Usuarios"
          subtitle="Gestiona los usuarios del sistema administrativo"
          backHref="/atrevida-gestion/configuracion"
          actions={
            <div className={styles.headerActions}>
              <button
                className="admin-button admin-button-secondary"
                onClick={() => { resetPasswordForm(); setChangePasswordModalOpen(true); }}
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

          <div className={styles.field}>
            <label id="usr-role-label" htmlFor="usr-role">Rol</label>
            <CustomSelect
              id="usr-role"
              ariaLabelledBy="usr-role-label"
              value={newUserForm.rolCodigo}
              onChange={(value) => {
                const rolCodigo = value as RolCodigo;
                setNewUserForm((current) => ({
                  ...current,
                  rolCodigo,
                  localId: rolCodigo === 'admin_sys' ? '' : current.localId,
                }));
                if (newUserErrors.rolCodigo || newUserErrors.localId) {
                  setNewUserErrors((current) => ({
                    ...current,
                    rolCodigo: undefined,
                    localId: rolCodigo === 'admin_sys' ? undefined : current.localId,
                  }));
                }
              }}
              options={ROLE_OPTIONS}
              hasError={!!newUserErrors.rolCodigo}
            />
            <span className={styles.fieldHint}>
              Gerencia no puede administrar usuarios ni consultar reportes financieros.
            </span>
            {newUserErrors.rolCodigo && <span className={styles.fieldError}>{newUserErrors.rolCodigo}</span>}
          </div>

          {newUserRequiresLocal && (
            <div className={styles.field}>
              <label id="usr-local-label" htmlFor="usr-local">Local de trabajo</label>
              <CustomSelect
                id="usr-local"
                ariaLabelledBy="usr-local-label"
                value={newUserForm.localId}
                onChange={(value) => {
                  setNewUserForm((current) => ({ ...current, localId: value }));
                  if (newUserErrors.localId) {
                    setNewUserErrors((current) => ({ ...current, localId: undefined }));
                  }
                }}
                options={localOptions}
                placeholder={localesLoading ? 'Cargando locales...' : 'Selecciona un local'}
                hasError={!!newUserErrors.localId}
              />
              <span className={styles.fieldHint}>
                El usuario solo trabajara con la informacion de este local.
              </span>
              {newUserErrors.localId && <span className={styles.fieldError}>{newUserErrors.localId}</span>}
            </div>
          )}

          {newUserErrors.submit && <div className={styles.submitError}>{newUserErrors.submit}</div>}
        </div>
      </FormModal>

      {/* Modal: Cambiar local de usuario */}
      <FormModal
        isOpen={changeLocalState !== null}
        onClose={closeChangeLocalModal}
        title="Cambiar de local"
        onSubmit={handleChangeUserLocal}
        loading={localChangeSaving}
        submitLabel="Confirmar cambio"
      >
        {changeLocalState && (
          <div className={styles.formStack}>
            <div className={styles.localMoveUser}>
              <span>Usuario</span>
              <strong>{changeLocalState.user.username}</strong>
            </div>

            <div className={styles.localMoveSummary}>
              <div className={styles.localMovePoint}>
                <span>Local actual</span>
                <strong>{getUserLocalLabel(changeLocalState.user)}</strong>
              </div>
              <div className={styles.localMoveArrow} aria-hidden="true">
                <ArrowRight size={16} strokeWidth={1.8} />
              </div>
              <div className={styles.localMovePoint}>
                <span>Nuevo local</span>
                <strong>{selectedChangeLocal?.nombre ?? 'Selecciona un local'}</strong>
              </div>
            </div>

            <div className={styles.field}>
              <label id="usr-change-local-label" htmlFor="usr-change-local">Nuevo local</label>
              <CustomSelect
                id="usr-change-local"
                ariaLabelledBy="usr-change-local-label"
                value={changeLocalState.localId}
                onChange={updateChangeLocalId}
                options={localOptions}
                placeholder={localesLoading ? 'Cargando locales...' : 'Selecciona un local'}
                hasError={!!changeLocalState.error}
              />
              <span className={styles.fieldHint}>
                El cambio actualizará el local_id y nombre_local del usuario.
              </span>
              {changeLocalState.error && <span className={styles.fieldError}>{changeLocalState.error}</span>}
            </div>
          </div>
        )}
      </FormModal>

      {/* Modal: Cambiar contraseña propia */}
      <FormModal
        isOpen={changePasswordModalOpen}
        onClose={() => { setChangePasswordModalOpen(false); resetPasswordForm(); }}
        title="Cambiar mi contraseña"
        onSubmit={handleChangePassword}
        loading={pwSaving}
        submitLabel="Actualizar contraseña"
      >
        <div className={styles.formStack}>
          <div className={styles.field}>
            <label htmlFor="pw-actual">Contraseña actual</label>
            <input
              id="pw-actual"
              type="password"
              value={pwForm.currentPassword}
              onChange={(e) => updatePasswordField('currentPassword', e.target.value)}
              placeholder="Contraseña actual"
              autoFocus
              autoComplete="current-password"
              aria-invalid={!!pwErrors.currentPassword}
              className={pwErrors.currentPassword ? styles.inputError : ''}
            />
            {pwErrors.currentPassword && <span className={styles.fieldError}>{pwErrors.currentPassword}</span>}
          </div>

          <div className={styles.field}>
            <label htmlFor="pw-nueva">Nueva contraseña</label>
            <input
              id="pw-nueva"
              type="password"
              value={pwForm.newPassword}
              onChange={(e) => updatePasswordField('newPassword', e.target.value)}
              placeholder="Nueva contraseña"
              autoComplete="new-password"
              aria-invalid={!!pwErrors.newPassword}
              className={pwErrors.newPassword ? styles.inputError : ''}
            />
            {pwErrors.newPassword && <span className={styles.fieldError}>{pwErrors.newPassword}</span>}
          </div>

          <div className={styles.field}>
            <label htmlFor="pw-confirmar">Confirmar nueva contraseña</label>
            <input
              id="pw-confirmar"
              type="password"
              value={pwForm.confirmPassword}
              onChange={(e) => updatePasswordField('confirmPassword', e.target.value)}
              placeholder="Repite la nueva contraseña"
              autoComplete="new-password"
              aria-invalid={!!pwErrors.confirmPassword}
              className={pwErrors.confirmPassword ? styles.inputError : ''}
            />
            {pwErrors.confirmPassword && <span className={styles.fieldError}>{pwErrors.confirmPassword}</span>}
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
