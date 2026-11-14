'use client';

import styles from './AdminButton.module.css';

interface AdminButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'onClick'> {
  /**
   * primary = rosa de marca (como "Nuevo usuario"); secondary = contorno; danger = contorno rojo
   * para acciones destructivas; inline = acción pequeña de texto rosa (como "Nuevo" cliente en el
   * formulario de reserva).
   */
  variant?: 'primary' | 'secondary' | 'danger' | 'inline';
  /** sm = pequeño, para acciones dentro de formularios y cabeceras de sección; xs = compacto, para acciones de fila. */
  size?: 'md' | 'sm' | 'xs';
  icon?: React.ReactNode;
  /** Ocupa todo el ancho del contenedor (columnas de acciones en tarjetas). */
  fullWidth?: boolean;
  /** Si se indica, se dibuja como enlace con el mismo aspecto (p. ej. abrir WhatsApp). */
  href?: string;
  target?: string;
  rel?: string;
  onClick?: React.MouseEventHandler<HTMLElement>;
}

/**
 * Botón único del panel admin. Envuelve las clases globales `admin-button*`
 * (las mismas de "Nuevo usuario") y añade el tamaño `sm`, para cambiar el estilo
 * de todos los botones desde un solo lugar.
 */
export function AdminButton({
  variant = 'primary',
  size = 'md',
  icon,
  fullWidth = false,
  href,
  target,
  rel,
  children,
  type = 'button',
  onClick,
  ...rest
}: AdminButtonProps) {
  const className = variant === 'inline'
    ? styles.inline
    : [
      'admin-button',
      `admin-button-${variant === 'danger' ? 'secondary' : variant}`,
      variant === 'danger' ? styles.danger : '',
      size === 'sm' ? styles.sm : '',
      size === 'xs' ? styles.xs : '',
      fullWidth ? styles.fullWidth : '',
    ].filter(Boolean).join(' ');

  if (href && !rest.disabled) {
    return (
      <a href={href} target={target} rel={rel} className={className} onClick={onClick}>
        {icon}
        {children}
      </a>
    );
  }

  return (
    <button type={type} className={className} onClick={onClick} {...rest}>
      {icon}
      {children}
    </button>
  );
}
