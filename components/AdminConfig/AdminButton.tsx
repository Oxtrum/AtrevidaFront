'use client';

import styles from './AdminButton.module.css';

interface AdminButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  /** primary = rosa de marca (como "Nuevo usuario"); secondary = contorno; inline = acción pequeña de texto rosa (como "Nuevo" cliente en el formulario de reserva). */
  variant?: 'primary' | 'secondary' | 'inline';
  /** sm = pequeño, para acciones dentro de formularios y cabeceras de sección. */
  size?: 'md' | 'sm';
  icon?: React.ReactNode;
}

/**
 * Botón único del panel admin. Envuelve las clases globales `admin-button*`
 * (las mismas de "Nuevo usuario") y añade el tamaño `sm`, para cambiar el estilo
 * de todos los botones desde un solo lugar.
 */
export function AdminButton({ variant = 'primary', size = 'md', icon, children, type = 'button', ...rest }: AdminButtonProps) {
  return (
    <button
      type={type}
      className={variant === 'inline' ? styles.inline : `admin-button admin-button-${variant} ${size === 'sm' ? styles.sm : ''}`}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}
