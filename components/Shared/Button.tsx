'use client';

import styles from './Shared.module.css';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'gradientYP';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  href?: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  href,
  children,
  className = '',
  disabled,
  onClick,
  ...props
}: ButtonProps) {
  const classes = [
    styles.button,
    styles[variant],
    styles[size],
    loading && styles.loading,
    className,
  ].filter(Boolean).join(' ');

  const content = (
    <>
      {loading && <span className={styles.spinner} />}
      {children}
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        className={classes}
        {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      className={classes}
      disabled={disabled || loading}
      onClick={onClick}
      {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {content}
    </button>
  );
}
