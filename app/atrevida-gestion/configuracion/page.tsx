'use client';

import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Package2,
  Scissors,
  ShieldCheck,
  Tags,
  UserRound,
} from 'lucide-react';
import Header from '@/components/AdminHeader/Header';
import { FormModal, PageHeader } from '@/components/AdminConfig';
import { toast } from '@/components/Shared/Toast';
import { cambiarPassword } from '@/lib/api/auth';
import { getStoredAdminRole, getStoredAdminTokenClaims, getStoredAdminUser } from '@/lib/auth/adminSession';
import styles from './page.module.css';

interface ProfileInfo {
  username: string;
  roleLabel: string;
}

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface PasswordErrors {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
  submit?: string;
}

interface PasswordVisibility {
  currentPassword: boolean;
  newPassword: boolean;
  confirmPassword: boolean;
}

const OPTIONS = [
  {
    title: 'Categorías',
    description: 'Administrar categorías de servicios',
    icon: <Tags size={24} strokeWidth={1.5} />,
    href: '/atrevida-gestion/configuracion/categorias',
    color: '#EC008C',
    colorRgb: '236, 0, 140',
  },
  {
    title: 'Locales',
    description: 'Gestionar sucursales y sus espacios',
    icon: <Building2 size={24} strokeWidth={1.5} />,
    href: '/atrevida-gestion/configuracion/locales',
    color: '#92278F',
    colorRgb: '146, 39, 143',
  },
  {
    title: 'Servicios',
    description: 'Configurar servicios ofrecidos por local',
    icon: <Scissors size={24} strokeWidth={1.5} />,
    href: '/atrevida-gestion/configuracion/servicios',
    color: '#14AEEF',
    colorRgb: '20, 174, 239',
  },
  {
    title: 'Paquetes',
    description: 'Crea y edita los paquetes del catálogo',
    icon: <Package2 size={24} strokeWidth={1.5} />,
    href: '/atrevida-gestion/configuracion/combos',
    color: '#10b981',
    colorRgb: '16, 185, 129',
  },
  {
    title: 'Usuarios',
    description: 'Gestionar usuarios del sistema',
    icon: <ShieldCheck size={24} strokeWidth={1.5} />,
    href: '/atrevida-gestion/configuracion/usuarios',
    color: '#f59e0b',
    colorRgb: '245, 158, 11',
  },
];

const EMPTY_PASSWORD_FORM: PasswordForm = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

const EMPTY_PASSWORD_VISIBILITY: PasswordVisibility = {
  currentPassword: false,
  newPassword: false,
  confirmPassword: false,
};

const ROLE_LABELS: Record<string, string> = {
  admin_sys: 'Administrador del sistema',
  admin: 'Administrador',
  gerencia: 'Gerencia',
};

function getRoleLabel(roleCode: string) {
  return (ROLE_LABELS[roleCode] ?? roleCode) || 'Sin rol asignado';
}

function readProfileInfo(): ProfileInfo {
  const storedUser = getStoredAdminUser();
  const tokenClaims = getStoredAdminTokenClaims();
  const roleCode = storedUser?.rol_codigo ?? getStoredAdminRole() ?? tokenClaims?.rol_codigo ?? '';

  return {
    username: storedUser?.username ?? tokenClaims?.username ?? 'Usuario',
    roleLabel: getRoleLabel(roleCode),
  };
}

export default function ConfiguracionPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileInfo | null>(null);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState<PasswordForm>(EMPTY_PASSWORD_FORM);
  const [passwordErrors, setPasswordErrors] = useState<PasswordErrors>({});
  const [passwordVisibility, setPasswordVisibility] = useState<PasswordVisibility>(EMPTY_PASSWORD_VISIBILITY);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    const token = window.localStorage.getItem('adminToken');
    if (!token) {
      router.push('/atrevida-gestion/login');
      return;
    }

    setProfile(readProfileInfo());
  }, [router]);

  const resetPasswordState = () => {
    setPasswordForm(EMPTY_PASSWORD_FORM);
    setPasswordErrors({});
    setPasswordVisibility(EMPTY_PASSWORD_VISIBILITY);
  };

  const openPasswordModal = () => {
    resetPasswordState();
    setPasswordModalOpen(true);
  };

  const closePasswordModal = () => {
    if (changingPassword) return;
    setPasswordModalOpen(false);
    resetPasswordState();
  };

  const updatePasswordField = (field: keyof PasswordForm, value: string) => {
    setPasswordForm((current) => ({ ...current, [field]: value }));
    if (passwordErrors[field] || passwordErrors.submit) {
      setPasswordErrors((current) => ({ ...current, [field]: undefined, submit: undefined }));
    }
  };

  const togglePasswordVisibility = (field: keyof PasswordVisibility) => {
    setPasswordVisibility((current) => ({ ...current, [field]: !current[field] }));
  };

  const validatePasswordForm = () => {
    const errors: PasswordErrors = {};

    if (!passwordForm.currentPassword.trim()) {
      errors.currentPassword = 'La contraseña actual es obligatoria';
    }

    if (!passwordForm.newPassword.trim()) {
      errors.newPassword = 'La nueva contraseña es obligatoria';
    }

    if (!passwordForm.confirmPassword.trim()) {
      errors.confirmPassword = 'Confirma la nueva contraseña';
    } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errors.confirmPassword = 'Las contraseñas no coinciden';
    }

    if (
      passwordForm.currentPassword
      && passwordForm.newPassword
      && passwordForm.currentPassword === passwordForm.newPassword
    ) {
      errors.newPassword = 'La nueva contraseña debe ser distinta a la actual';
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChangePassword = async () => {
    if (!validatePasswordForm()) return;

    setChangingPassword(true);
    setPasswordErrors({});

    try {
      await cambiarPassword({
        password_actual: passwordForm.currentPassword,
        password_nueva: passwordForm.newPassword,
      });
      toast.success('Contraseña actualizada correctamente');
      setPasswordModalOpen(false);
      resetPasswordState();
    } catch (err) {
      setPasswordErrors({
        submit: err instanceof Error ? err.message : 'No se pudo cambiar la contraseña',
      });
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className={styles.pageContainer}>
      <div className="admin-mesh" />
      <Header />
      <main className={styles.main}>
        <div className={styles.container}>
          <PageHeader
            kicker="Panel de control"
            title="Ajustes del Sistema"
            accentWord="Sistema"
            subtitle="Administra categorías, locales, servicios y usuarios del centro"
          />

          <section className={styles.profilePanel} aria-labelledby="profile-title">
            <div className={styles.profileIdentity}>
              <div className={styles.profileAvatar}>
                <UserRound size={26} strokeWidth={1.6} />
              </div>
              <div>
                <span className={styles.profileKicker}>Mi información</span>
                <h2 id="profile-title">{profile?.username ?? 'Usuario'}</h2>
                <p>{profile?.roleLabel ?? 'Cargando información de la sesión'}</p>
              </div>
            </div>

            <button type="button" className={styles.passwordButton} onClick={openPasswordModal}>
              <KeyRound size={17} strokeWidth={1.9} />
              Cambiar contraseña
            </button>
          </section>

          <div className={styles.grid}>
            {OPTIONS.map((opt) => (
              <div
                key={opt.href}
                className={styles.card}
                style={{ '--card-color': opt.color, '--card-color-rgb': opt.colorRgb } as CSSProperties}
                onClick={() => router.push(opt.href)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => event.key === 'Enter' && router.push(opt.href)}
              >
                <div className={styles.cardBar} />
                <div className={styles.cardIconWrapper}>
                  <span className={styles.cardIcon}>{opt.icon}</span>
                </div>
                <div className={styles.cardContent}>
                  <h3 className={styles.cardTitle}>{opt.title}</h3>
                  <p className={styles.cardDesc}>{opt.description}</p>
                </div>
                <div className={styles.cardFooter}>
                  <span className={styles.cardCta}>Administrar</span>
                </div>
                <div className={styles.cardGlow} />
              </div>
            ))}
          </div>
        </div>
      </main>

      <FormModal
        isOpen={passwordModalOpen}
        onClose={closePasswordModal}
        title="Cambiar contraseña"
        onSubmit={handleChangePassword}
        loading={changingPassword}
        submitLabel="Actualizar contraseña"
      >
        <div className={styles.formStack}>
          <div className={styles.field}>
            <label htmlFor="profile-password-current">Contraseña actual</label>
            <div className={styles.passwordInputWrap}>
              <input
                id="profile-password-current"
                type={passwordVisibility.currentPassword ? 'text' : 'password'}
                value={passwordForm.currentPassword}
                onChange={(event) => updatePasswordField('currentPassword', event.target.value)}
                autoComplete="current-password"
                autoFocus
                aria-invalid={!!passwordErrors.currentPassword}
                className={passwordErrors.currentPassword ? styles.inputError : ''}
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => togglePasswordVisibility('currentPassword')}
                aria-label={passwordVisibility.currentPassword ? 'Ocultar contraseña actual' : 'Mostrar contraseña actual'}
              >
                {passwordVisibility.currentPassword ? <EyeOff size={17} strokeWidth={1.8} /> : <Eye size={17} strokeWidth={1.8} />}
              </button>
            </div>
            {passwordErrors.currentPassword && <span className={styles.fieldError}>{passwordErrors.currentPassword}</span>}
          </div>

          <div className={styles.field}>
            <label htmlFor="profile-password-new">Nueva contraseña</label>
            <div className={styles.passwordInputWrap}>
              <input
                id="profile-password-new"
                type={passwordVisibility.newPassword ? 'text' : 'password'}
                value={passwordForm.newPassword}
                onChange={(event) => updatePasswordField('newPassword', event.target.value)}
                autoComplete="new-password"
                aria-invalid={!!passwordErrors.newPassword}
                className={passwordErrors.newPassword ? styles.inputError : ''}
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => togglePasswordVisibility('newPassword')}
                aria-label={passwordVisibility.newPassword ? 'Ocultar nueva contraseña' : 'Mostrar nueva contraseña'}
              >
                {passwordVisibility.newPassword ? <EyeOff size={17} strokeWidth={1.8} /> : <Eye size={17} strokeWidth={1.8} />}
              </button>
            </div>
            {passwordErrors.newPassword && <span className={styles.fieldError}>{passwordErrors.newPassword}</span>}
          </div>

          <div className={styles.field}>
            <label htmlFor="profile-password-confirm">Confirmar nueva contraseña</label>
            <div className={styles.passwordInputWrap}>
              <input
                id="profile-password-confirm"
                type={passwordVisibility.confirmPassword ? 'text' : 'password'}
                value={passwordForm.confirmPassword}
                onChange={(event) => updatePasswordField('confirmPassword', event.target.value)}
                autoComplete="new-password"
                aria-invalid={!!passwordErrors.confirmPassword}
                className={passwordErrors.confirmPassword ? styles.inputError : ''}
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => togglePasswordVisibility('confirmPassword')}
                aria-label={passwordVisibility.confirmPassword ? 'Ocultar confirmación' : 'Mostrar confirmación'}
              >
                {passwordVisibility.confirmPassword ? <EyeOff size={17} strokeWidth={1.8} /> : <Eye size={17} strokeWidth={1.8} />}
              </button>
            </div>
            {passwordErrors.confirmPassword && <span className={styles.fieldError}>{passwordErrors.confirmPassword}</span>}
          </div>

          <div className={styles.passwordNotice}>
            <LockKeyhole size={16} strokeWidth={1.8} />
            Solo se enviará contra el usuario autenticado por el token actual.
          </div>

          {passwordErrors.submit && <div className={styles.submitError}>{passwordErrors.submit}</div>}
        </div>
      </FormModal>
    </div>
  );
}
